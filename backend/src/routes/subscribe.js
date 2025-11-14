const express = require('express');
const { body, validationResult } = require('express-validator');
const Membership = require('../models/Membership');
const Payment = require('../models/Payment');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Plan prices mapping
const PLAN_PRICES = {
  monthly: 17500,
  quarterly: 47250,
  annual: 168000,
  premium: 25000,
};

// Calculate end date based on plan type
const calculateEndDate = (planType, startDate = new Date()) => {
  const endDate = new Date(startDate);
  
  switch (planType) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'annual':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    case 'premium':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    default:
      endDate.setMonth(endDate.getMonth() + 1);
  }
  
  return endDate;
};

// POST /api/subscribe - Subscribe to a plan (simulated payment)
router.post('/', authenticate, [
  body('planType').isIn(['monthly', 'quarterly', 'annual', 'premium']).withMessage('Tipo de plan inválido'),
  body('paymentMethod').optional().isIn(['cash', 'card', 'transfer']).withMessage('Método de pago inválido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Error de validación',
        details: errors.array().map(err => err.msg)
      });
    }

    // Only clients can subscribe
    if (req.user.role !== 'client') {
      return res.status(403).json({ error: 'Solo los clientes pueden suscribirse' });
    }

    const { planType, paymentMethod = 'card' } = req.body;
    const userId = req.user._id;

    // Check if user already has an active membership
    const existingMembership = await Membership.findOne({
      userId,
      status: 'active',
    });

    if (existingMembership) {
      return res.status(400).json({ 
        error: 'Ya tienes una membresía activa',
        membership: existingMembership
      });
    }

    // Get plan price
    const price = PLAN_PRICES[planType];
    if (!price) {
      return res.status(400).json({ error: 'Plan no válido' });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = calculateEndDate(planType, startDate);

    // Create membership
    const membership = new Membership({
      userId,
      planType,
      startDate,
      endDate,
      price,
      status: 'active',
      autoRenew: false,
    });

    await membership.save();

    // Create simulated payment
    const payment = new Payment({
      userId,
      membershipId: membership._id,
      amount: price,
      paymentMethod,
      status: 'completed',
      paidAt: new Date(),
    });

    await payment.save();

    // Populate membership data
    await membership.populate('userId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Suscripción realizada exitosamente',
      membership,
      payment: {
        _id: payment._id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        paidAt: payment.paidAt,
      },
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error information
    let errorMessage = 'Error al procesar la suscripción';
    if (error.name === 'ValidationError') {
      errorMessage = 'Error de validación: ' + Object.values(error.errors).map(e => e.message).join(', ');
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

