const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Load environment variables explicitly
dotenv.config({ path: path.join(__dirname, '../../.env') });

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('JWT_SECRET no está configurado. Por favor, agrega JWT_SECRET en el archivo backend/.env');
  }
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
};

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('El correo electrónico no es válido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Error de validación',
        errors: errors.array().map(err => ({
          param: err.param,
          msg: err.msg || `${err.param} es inválido`
        }))
      });
    }

    const { email, password } = req.body;

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('⚠️  Database not connected');
      return res.status(503).json({ 
        error: 'Servicio temporalmente no disponible',
        message: 'La base de datos no está conectada. Por favor, intenta más tarde.'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    
    // Handle JWT_SECRET error specifically
    if (error.message?.includes('JWT_SECRET')) {
      return res.status(500).json({
        error: 'Error de configuración del servidor',
        message: error.message,
        details: 'Por favor, contacta al administrador del sistema',
      });
    }
    
    res.status(500).json({
      error: 'Error al iniciar sesión',
      message: error.message || 'Server error',
    });
  }
});

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().withMessage('El correo electrónico no es válido').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('name').notEmpty().withMessage('El nombre es requerido').trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Error de validación',
        errors: errors.array().map(err => ({
          param: err.param,
          msg: err.msg || `${err.param} es inválido`
        }))
      });
    }

    const { email, password, name, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Este correo electrónico ya está registrado' });
    }

    // Create user
    const user = new User({
      email,
      password,
      name,
      phone,
      role: 'client',
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    console.error('Error stack:', error.stack);
    
    // Handle JWT_SECRET error specifically
    if (error.message?.includes('JWT_SECRET')) {
      return res.status(500).json({
        error: 'Error de configuración del servidor',
        message: error.message,
        details: 'Por favor, contacta al administrador del sistema',
      });
    }
    
    // Handle duplicate email error
    if (error.code === 11000 || error.message?.includes('duplicate')) {
      return res.status(400).json({ error: 'Este correo electrónico ya está registrado' });
    }
    
    // Handle validation errors from mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => ({
        param: err.path,
        msg: err.message
      }));
      return res.status(400).json({ 
        error: 'Error de validación',
        errors 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Error al crear la cuenta. Por favor, intenta nuevamente.' 
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

