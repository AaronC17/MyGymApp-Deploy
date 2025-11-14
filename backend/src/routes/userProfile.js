// ============================================================================
// 👤 User Profile Routes - Manage user profile and body photos
// ============================================================================

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Configure multer for body photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/users');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, WEBP)'));
    }
  },
});

// ============================================================================
// 🔹 GET /api/user/profile - Get user profile
// ============================================================================
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Error al obtener el perfil' });
  }
});

// ============================================================================
// 🔹 PUT /api/user/profile - Update user profile
// ============================================================================
router.put(
  '/profile',
  authenticate,
  [
    body('weight').optional().isFloat({ min: 0 }),
    body('height').optional().isFloat({ min: 0 }),
    body('age').optional().isInt({ min: 1, max: 120 }),
    body('goal').optional().isString(),
    body('bodyFat').optional().isFloat({ min: 0, max: 100 }),
    body('muscleMass').optional().isFloat({ min: 0 }),
    body('fitnessLevel').optional().isIn(['beginner', 'intermediate', 'advanced']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        weight,
        height,
        age,
        goal,
        bodyFat,
        muscleMass,
        fitnessLevel,
        trainingExperience,
        injuries,
        preferences,
      } = req.body;

      const updateData = {};
      if (weight !== undefined) updateData.weight = weight;
      if (height !== undefined) updateData.height = height;
      if (age !== undefined) updateData.age = age;
      if (goal !== undefined) updateData.goal = goal;
      if (bodyFat !== undefined) updateData.bodyFat = bodyFat;
      if (muscleMass !== undefined) updateData.muscleMass = muscleMass;
      if (fitnessLevel !== undefined) updateData.fitnessLevel = fitnessLevel;
      if (trainingExperience !== undefined) {
        // Ensure trainingExperience is an object with years and months
        if (typeof trainingExperience === 'object' && trainingExperience !== null) {
          updateData.trainingExperience = {
            years: trainingExperience.years || 0,
            months: trainingExperience.months || 0,
          };
        } else {
          updateData.trainingExperience = { years: 0, months: 0 };
        }
      }
      if (injuries !== undefined) {
        // Ensure injuries is an array of objects with type field
        if (Array.isArray(injuries)) {
          updateData.injuries = injuries.map(injury => {
            if (typeof injury === 'string') {
              return { type: injury };
            }
            return { type: injury.type || '', description: injury.description || '' };
          });
        } else {
          updateData.injuries = [];
        }
      }
      if (preferences !== undefined) updateData.preferences = preferences;

      console.log('📝 Updating profile:', {
        userId: req.user._id,
        updates: Object.keys(updateData),
        injuriesCount: updateData.injuries?.length || 0,
      });

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      console.log('✅ Profile updated successfully');
      res.json({ user });
    } catch (error) {
      console.error('❌ Update profile error:', error);
      console.error('Error stack:', error.stack);
      
      // Provide more detailed error information
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          error: 'Error de validación',
          details: errors 
        });
      }
      
      res.status(500).json({ 
        error: 'Error al actualizar el perfil',
        message: error.message || 'Error desconocido'
      });
    }
  }
);

// ============================================================================
// 🔹 POST /api/user/body-photo - Upload body photo
// ============================================================================
router.post(
  '/body-photo',
  authenticate,
  upload.single('photo'),
  [
    body('type').isIn(['front', 'side', 'back']).withMessage('Tipo de foto inválido'),
    body('notes').optional().isString(),
  ],
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Delete uploaded file if validation fails
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, notes } = req.body;
      const photoUrl = `/uploads/users/${req.file.filename}`;

      console.log('📸 Uploading body photo:', {
        userId: req.user._id,
        type,
        filename: req.file.filename,
        photoUrl,
      });

      // First, get the user to ensure they exist
      const user = await User.findById(req.user._id);
      if (!user) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Add the photo to the array
      user.bodyPhotos.push({
        url: photoUrl,
        type,
        notes: notes || '',
        date: new Date(),
      });

      // Save the user document
      await user.save();

      // Get the newly added photo (last one in array)
      const uploadedPhoto = user.bodyPhotos[user.bodyPhotos.length - 1];

      console.log('✅ Photo uploaded and saved to MongoDB:', {
        photoId: uploadedPhoto._id,
        url: uploadedPhoto.url,
        type: uploadedPhoto.type,
        totalPhotos: user.bodyPhotos.length,
      });

      res.json({
        message: 'Foto subida exitosamente',
        photo: uploadedPhoto,
        photoUrl: uploadedPhoto.url,
        user: await User.findById(req.user._id).select('-password'),
      });
    } catch (error) {
      console.error('Upload photo error:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Error al subir la foto' });
    }
  }
);

// ============================================================================
// 🔹 DELETE /api/user/body-photo/:photoId - Delete body photo
// ============================================================================
router.delete('/body-photo/:photoId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const photo = user.bodyPhotos.id(req.params.photoId);
    if (!photo) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../uploads/users', path.basename(photo.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from database
    user.bodyPhotos.pull(req.params.photoId);
    await user.save();

    res.json({ message: 'Foto eliminada exitosamente' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Error al eliminar la foto' });
  }
});

// ============================================================================
// 🔹 GET /api/user/body-photos - Get all body photos
// ============================================================================
router.get('/body-photos', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('bodyPhotos');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ photos: user.bodyPhotos || [] });
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Error al obtener las fotos' });
  }
});

module.exports = router;

