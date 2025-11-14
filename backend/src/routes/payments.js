// ============================================================================
// 🧾 Payments Routes - EnergyM Gym System
// Author: Aarón Contreras
// Description: Handles all payment-related endpoints (CRUD, receipts, stats)
// ============================================================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');

const Payment = require('../models/Payment');
const Membership = require('../models/Membership');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// 🔹 Helper Functions
// ============================================================================
const sendError = (res, status, message) => res.status(status).json({ error: message });

const handleServerError = (res, error, message = 'Server error') => {
  console.error(`${message}:`, error);
  res.status(500).json({ error: message });
};

const isDBConnected = () => mongoose.connection.readyState === 1;

// ============================================================================
// 🔹 GET /api/payments - List all payments (filtered by user/date)
// ============================================================================
router.get('/', authenticate, async (req, res) => {
  try {
    if (!isDBConnected()) return sendError(res, 503, 'Database not available');

    const { userId, startDate, endDate } = req.query;
    const query = {};

    // Non-admin users can only view their own payments
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    } else if (userId) {
      query.userId = userId;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.paidAt = {};
      if (startDate) query.paidAt.$gte = new Date(startDate);
      if (endDate) query.paidAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('userId', 'name email')
      .populate('membershipId')
      .sort({ paidAt: -1 })
      .lean();

    // Filter out payments with null userId (deleted users) or add default values
    const validPayments = payments.map(payment => {
      if (!payment.userId) {
        return {
          ...payment,
          userId: {
            _id: null,
            name: 'Usuario eliminado',
            email: 'N/A'
          }
        };
      }
      return payment;
    });

    return res.json({ payments: validPayments });
  } catch (error) {
    return handleServerError(res, error, 'Error fetching payments');
  }
});

// ============================================================================
// 🔹 GET /api/payments/:id - Retrieve a specific payment
// ============================================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('membershipId');

    if (!payment) return sendError(res, 404, 'Payment not found');

    if (req.user.role !== 'admin' && payment.userId && payment.userId._id.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    return res.json(payment);
  } catch (error) {
    return handleServerError(res, error, 'Error retrieving payment');
  }
});

// ============================================================================
// 🔹 POST /api/payments - Create a new payment
// ============================================================================
router.post(
  '/',
  authenticate,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('membershipId').notEmpty().withMessage('Membership ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('paymentMethod')
      .isIn(['cash', 'card', 'transfer'])
      .withMessage('Invalid payment method'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { userId, membershipId, amount, paymentMethod } = req.body;

      if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
        return sendError(res, 403, 'Access denied');
      }

      const payment = await Payment.create({
        userId,
        membershipId,
        amount,
        paymentMethod,
        status: 'completed',
        paidAt: new Date(),
      });

      await Membership.findByIdAndUpdate(membershipId, { status: 'active' });

      const populated = await Payment.findById(payment._id)
        .populate('userId', 'name email')
        .populate('membershipId');

      return res.status(201).json(populated);
    } catch (error) {
      return handleServerError(res, error, 'Error creating payment');
    }
  }
);

// ============================================================================
// 🔹 GET /api/payments/receipt/:id - Generate and download PDF receipt
// ============================================================================
router.get('/receipt/:id', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('membershipId');

    if (!payment) return sendError(res, 404, 'Payment not found');
    if (req.user.role !== 'admin' && payment.userId && payment.userId._id.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied');
    }
    
    // Check if userId exists
    if (!payment.userId) {
      return sendError(res, 400, 'Payment has no associated user');
    }

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const accent = '#3b82f6';
    const accentDark = '#1e40af';
    const bgLight = '#f3f4f6';
    const bgBlue = '#eff6ff';
    const textGray = '#6b7280';
    const textDark = '#111827';
    const borderGray = '#e5e7eb';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo-${payment._id}.pdf`);
    doc.pipe(res);

    // Helper functions
    const formatDate = (date) =>
      new Date(date).toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    const formatAmount = (amount) => amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const paymentMethodMap = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
    };

    const planTypeMap = {
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      annual: 'Anual',
      premium: 'Premium',
    };

    // TOP DECORATIVE LINE
    doc
      .moveTo(50, 50)
      .lineTo(562, 50)
      .lineWidth(3)
      .strokeColor(accent)
      .stroke();

    // HEADER SECTION
    doc.moveDown(1.5);
    doc
      .fontSize(28)
      .fillColor(accentDark)
      .text('ENERGYM', { align: 'center', bold: true })
      .moveDown(0.3)
      .fontSize(16)
      .fillColor(textGray)
      .text('Gimnasio y Centro de Fitness', { align: 'center' })
      .moveDown(1);

    // Divider line
    doc
      .moveTo(50, doc.y)
      .lineTo(562, doc.y)
      .lineWidth(1)
      .strokeColor(borderGray)
      .stroke();

    doc.moveDown(1.5);

    // TITLE
    doc
      .fontSize(22)
      .fillColor(textDark)
      .text('RECIBO DE PAGO', { align: 'center', bold: true })
      .moveDown(2);

    // RECEIPT INFO SECTION
    const receiptInfoY = doc.y;
    doc
      .fontSize(11)
      .fillColor(textGray)
      .text('Número de Recibo:', { continued: true });
    doc
      .fillColor(textDark)
      .text(` ${payment._id.toString().substring(0, 24)}...`, { bold: true })
      .moveDown(0.5)
      .fontSize(11)
      .fillColor(textGray)
      .text('Fecha de Pago:', { continued: true });
    doc
      .fillColor(textDark)
      .text(` ${formatDate(payment.paidAt)}`, { bold: true })
      .moveDown(2);

    // CLIENT INFO BOX
    const clientInfoY = doc.y;
    doc
      .rect(50, clientInfoY, 512, 60)
      .fillColor(bgLight)
      .fill()
      .strokeColor(borderGray)
      .stroke();

    doc.y = clientInfoY + 10;
    doc.x = 60;
    doc
      .fontSize(14)
      .fillColor(accentDark)
      .text('INFORMACIÓN DEL CLIENTE', { bold: true })
      .moveDown(0.8)
      .fontSize(12)
      .fillColor(textDark);
    const userName = payment.userId?.name || 'Usuario no disponible';
    const userEmail = payment.userId?.email || 'N/A';
    doc.text(`Nombre: ${userName}`, { indent: 10 });
    doc.moveDown(0.5);
    doc.text(`Email: ${userEmail}`, { indent: 10 });
    doc.y = clientInfoY + 60 + 15;

    // PAYMENT DETAILS BOX
    const paymentInfoY = doc.y;
    const boxHeight = payment.membershipId ? 100 : 80;
    doc
      .rect(50, paymentInfoY, 512, boxHeight)
      .fillColor(bgLight)
      .fill()
      .strokeColor(borderGray)
      .stroke();

    doc.y = paymentInfoY + 10;
    doc.x = 60;
    doc
      .fontSize(14)
      .fillColor(accentDark)
      .text('DETALLES DEL PAGO', { bold: true })
      .moveDown(0.8)
      .fontSize(12)
      .fillColor(textDark);

    if (payment.membershipId) {
      const planType = planTypeMap[payment.membershipId.planType] || payment.membershipId.planType;
      doc.text(`Plan: ${planType}`, { indent: 10 });
      doc.moveDown(0.5);
    }

    doc.text(`Método de Pago: ${paymentMethodMap[payment.paymentMethod] || payment.paymentMethod}`, { indent: 10 });
    doc.moveDown(0.5);
    doc.text(`Estado: ${payment.status === 'completed' ? 'Completado' : payment.status}`, { indent: 10 });
    doc.y = paymentInfoY + boxHeight + 20;

    // AMOUNT HIGHLIGHTED BOX
    const amountY = doc.y;
    doc
      .rect(50, amountY, 512, 70)
      .fillColor(bgBlue)
      .fill()
      .strokeColor(accent)
      .lineWidth(2)
      .stroke();

    doc.y = amountY + 15;
    doc.x = 60;
    doc
      .fontSize(14)
      .fillColor(accentDark)
      .text('MONTO TOTAL', { bold: true })
      .moveDown(1)
      .fontSize(32)
      .fillColor(accentDark)
      .text(`₡${formatAmount(payment.amount)}`, { align: 'center', bold: true });
    doc.y = amountY + 70 + 25;

    // Divider before footer
    doc
      .moveTo(50, doc.y)
      .lineTo(562, doc.y)
      .lineWidth(1)
      .strokeColor(borderGray)
      .stroke();

    doc.moveDown(1.5);

    // FOOTER
    doc
      .fontSize(11)
      .fillColor(textGray)
      .text('Gracias por su pago', { align: 'center' })
      .moveDown(0.5)
      .fontSize(10)
      .fillColor(textGray)
      .text('Energym - Transforma tu cuerpo, transforma tu vida', { align: 'center' })
      .moveDown(0.3)
      .text('Alajuela, Costa Rica', { align: 'center' });

    // BOTTOM DECORATIVE LINE
    doc
      .moveTo(50, 750)
      .lineTo(562, 750)
      .lineWidth(3)
      .strokeColor(accent)
      .stroke();

    doc.end();
  } catch (error) {
    return handleServerError(res, error, 'Error generating receipt');
  }
});

// ============================================================================
// 🔹 GET /api/payments/stats/summary - Admin summary of payment statistics
// ============================================================================
router.get('/stats/summary', authenticate, requireAdmin, async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const now = new Date();

    const startDates = {
      monthly: new Date(now.getFullYear(), now.getMonth(), 1),
      quarterly: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      annual: new Date(now.getFullYear(), 0, 1),
    };

    const startDate = startDates[period] || startDates.monthly;

    const payments = await Payment.find({
      status: 'completed',
      paidAt: { $gte: startDate },
    }).lean();

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const monthlyRevenue = payments
      .filter((p) => new Date(p.paidAt).getMonth() === now.getMonth() && new Date(p.paidAt).getFullYear() === now.getFullYear())
      .reduce((sum, p) => sum + p.amount, 0);

    const paymentMethods = payments.reduce((acc, p) => {
      acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      totalRevenue,
      monthlyRevenue,
      totalPayments: payments.length,
      paymentMethods,
    });
  } catch (error) {
    return handleServerError(res, error, 'Error fetching payment statistics');
  }
});

// ============================================================================
// ✅ Export router
// ============================================================================
module.exports = router;

