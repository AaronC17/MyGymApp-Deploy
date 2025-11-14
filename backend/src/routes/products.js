const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getContainerClient } = require('../config/azure');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Configure multer for file storage (local development)
const uploadsDir = path.join(__dirname, '../../uploads/products');
const ensureUploadsDir = async () => {
  try {
    await fs.access(uploadsDir);
    console.log('📁 Uploads directory exists:', uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory:', uploadsDir);
  }
};
ensureUploadsDir();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  },
});

// GET /api/products - List products (public)
router.get('/', async (req, res) => {
  try {
    const { category, search, isActive } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    // Si isActive no se especifica o es 'all', no filtrar por isActive
    if (isActive !== undefined && isActive !== 'all') {
      if (isActive === 'true' || isActive === true) {
        query.isActive = true;
      } else if (isActive === 'false' || isActive === false) {
        query.isActive = false;
      }
    }

    if (search) {
      query.$text = { $search: search };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/:id - Get specific product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products - Create product (admin only)
router.post('/', authenticate, requireAdmin, [
  body('name').notEmpty().withMessage('El nombre es requerido').trim(),
  body('price').isFloat({ min: 0 }).withMessage('El precio debe ser un número mayor o igual a 0'),
  body('category').isIn(['protein', 'accessories', 'clothing']).withMessage('La categoría no es válida'),
  body('stock').isInt({ min: 0 }).withMessage('El stock debe ser un número entero mayor o igual a 0'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Error de validación',
        details: errors.array().map(err => err.msg || err.param + ' es inválido')
      });
    }

    const { name, description, price, category, stock, isActive } = req.body;

    // Convertir price a número si viene como string
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    const stockNum = typeof stock === 'string' ? parseInt(stock, 10) : stock;

    const product = new Product({
      name: name.trim(),
      description: description ? description.trim() : '',
      price: priceNum,
      category,
      stock: stockNum,
      isActive: isActive !== undefined ? isActive : true,
    });

    await product.save();

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Error de validación',
        details: errors
      });
    }
    
    res.status(500).json({ 
      error: 'Error al crear el producto',
      message: error.message 
    });
  }
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, stock, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (category) updateData.category = category;
    if (stock !== undefined) updateData.stock = stock;
    if (isActive !== undefined) updateData.isActive = isActive;

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products/:id/upload - Upload product image (admin only)
router.post('/:id/upload', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Upload request received:', { id, file: req.file ? req.file.originalname : 'none' });

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No image file provided' });
    }

    const product = await Product.findById(id);
    if (!product) {
      console.error('Product not found:', id);
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log('Product found:', product.name);

    let imageUrl;

    // Try Azure Storage first if configured
    if (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_STORAGE_CONNECTION_STRING.trim() !== '') {
      try {
        const containerName = process.env.AZURE_STORAGE_CONTAINER_PRODUCTS || 'products';
        const containerClient = getContainerClient(containerName);

        // Ensure container exists
        await containerClient.createIfNotExists({ access: 'blob' });

        const fileName = `${uuidv4()}-${req.file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        // Read file buffer if using disk storage
        const fileBuffer = req.file.buffer || await fs.readFile(req.file.path);

        await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
          blobHTTPHeaders: { blobContentType: req.file.mimetype },
        });

        imageUrl = blockBlobClient.url;

        // Delete local file if it exists (disk storage)
        if (req.file.path) {
          try {
            await fs.unlink(req.file.path);
          } catch (err) {
            console.warn('Could not delete local file:', err);
          }
        }
      } catch (azureError) {
        if (azureError.message.includes('no está configurado')) {
          // Fall through to local storage
          console.log('Azure Storage no configurado, usando almacenamiento local');
        } else {
          throw azureError;
        }
      }
    }

    // Use local storage if Azure is not configured or failed
    if (!imageUrl) {
      const fileName = req.file.filename;
      // Use the request host to build the URL dynamically
      const protocol = req.protocol;
      const host = req.get('host');
      imageUrl = `${protocol}://${host}/uploads/products/${fileName}`;
      console.log(`Imagen guardada localmente: ${imageUrl}`);
      console.log(`File saved at: ${req.file.path}`);
    }

    product.imageUrl = imageUrl;
    await product.save();

    console.log('Image uploaded successfully:', imageUrl);
    res.json({ imageUrl });
  } catch (error) {
    console.error('Upload image error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      file: req.file ? req.file.originalname : 'none',
    });
    res.status(500).json({ 
      error: 'Error al subir la imagen',
      message: error.message 
    });
  }
});

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

