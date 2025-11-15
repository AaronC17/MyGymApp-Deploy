const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName].trim() === '');

if (missingVars.length > 0) {
  console.error('❌ ERROR: Faltan variables de entorno requeridas:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📝 Por favor, agrega estas variables en el archivo backend/.env');
  console.error('   Puedes usar backend/.env.example como referencia\n');
  process.exit(1);
}

// Validate JWT_SECRET length
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  ADVERTENCIA: JWT_SECRET es muy corto (mínimo 32 caracteres recomendado)');
}

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const membershipRoutes = require('./routes/memberships');
const paymentRoutes = require('./routes/payments');
const productRoutes = require('./routes/products');
const adminRoutes = require('./routes/admin');
const subscribeRoutes = require('./routes/subscribe');
const aiRoutes = require('./routes/ai');
const userProfileRoutes = require('./routes/userProfile');

// Import database connection
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3002;

// Connect to database (don't await, let it connect in background)
// But log if connection fails
connectDB().catch(err => {
  console.error('Failed to connect to database:', err);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Build dynamic cors configuration that plays nice with Azure frontends
const buildAllowedOrigins = () => {
  const csvOrigins = [
    process.env.CORS_ORIGINS,
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
  ]
    .filter(Boolean)
    .join(',');

  const userConfiguredOrigins = csvOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  const origins = new Set(userConfiguredOrigins);

  // Always allow local dev URLs so onboarding stays painless
  ['http://localhost:3000', 'http://localhost:3001'].forEach(localOrigin => {
    origins.add(localOrigin);
  });

  return {
    origins,
    hasUserConfiguredOrigins: userConfiguredOrigins.length > 0,
  };
};

const { origins: allowedOrigins, hasUserConfiguredOrigins } = buildAllowedOrigins();
const allowAllOrigins = !hasUserConfiguredOrigins;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowAllOrigins || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    console.warn(`🚫 CORS bloqueó la petición desde: ${origin}`);
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (for local development)
// __dirname is backend/src, files are saved to backend/uploads/products
// So we need to serve from backend/uploads (one level up)
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsPath);
}

// Ensure products subdirectory exists
const productsPath = path.join(uploadsPath, 'products');
if (!fs.existsSync(productsPath)) {
  fs.mkdirSync(productsPath, { recursive: true });
  console.log('📁 Created products directory:', productsPath);
}

// Ensure users subdirectory exists
const usersPath = path.join(uploadsPath, 'users');
if (!fs.existsSync(usersPath)) {
  fs.mkdirSync(usersPath, { recursive: true });
  console.log('📁 Created users directory:', usersPath);
}

// Ensure chat subdirectory exists
const chatPath = path.join(uploadsPath, 'chat');
if (!fs.existsSync(chatPath)) {
  fs.mkdirSync(chatPath, { recursive: true });
  console.log('📁 Created chat directory:', chatPath);
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Set proper CORS headers for images
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  }
}));
console.log('📁 Serving static files from:', uploadsPath);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscribe', subscribeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/user', userProfileRoutes);

// 404 handler (must be last, after all routes)
app.use((req, res) => {
  // Don't return 404 for static file requests that don't exist
  if (req.path.startsWith('/uploads/')) {
    return res.status(404).send('File not found');
  }
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  // Handle Mongoose errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'ID inválido',
      message: 'El ID proporcionado no es válido'
    });
  }
  
  if (err.name === 'MongoServerError' || err.name === 'MongoNetworkError') {
    return res.status(503).json({
      error: 'Error de conexión a la base de datos',
      message: 'Por favor, intenta más tarde'
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

