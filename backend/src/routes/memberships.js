const express = require('express');
const { body, validationResult } = require('express-validator');
const Membership = require('../models/Membership');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/memberships - List memberships
router.get('/', authenticate, async (req, res) => {
  try {
    const { userId, status } = req.query;
    const query = {};

    // Non-admin users can only see their own memberships
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    } else if (userId) {
      query.userId = userId;
    }

    if (status) {
      query.status = status;
    }

    // Check database connection
    if (require('mongoose').connection.readyState !== 1) {
      console.error('Database not connected');
      return res.status(503).json({ error: 'Database not available. Please check your connection.' });
    }

    const memberships = await Membership.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Filter out memberships with null userId (deleted users) or add default values
    const validMemberships = memberships.map(membership => {
      if (!membership.userId) {
        return {
          ...membership.toObject(),
          userId: {
            _id: null,
            name: 'Usuario eliminado',
            email: 'N/A'
          }
        };
      }
      return membership;
    });

    res.json({ memberships: validMemberships });
  } catch (error) {
    console.error('Get memberships error:', error);
    if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
      return res.status(503).json({ error: 'Database connection error. Please try again later.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/memberships/:id - Get specific membership
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const membership = await Membership.findById(id).populate('userId', 'name email');

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    // Users can only view their own memberships unless they're admin
    if (req.user.role !== 'admin' && membership.userId && membership.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(membership);
  } catch (error) {
    console.error('Get membership error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/memberships - Create membership (admin only)
router.post('/', authenticate, requireAdmin, [
  body('userId').notEmpty(),
  body('planType').isIn(['monthly', 'quarterly', 'annual', 'premium']),
  body('price').isNumeric().isFloat({ min: 0 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, planType, startDate, endDate, price, autoRenew } = req.body;

    const membership = new Membership({
      userId,
      planType,
      startDate: startDate || new Date(),
      endDate: endDate || new Date(),
      price,
      autoRenew: autoRenew || false,
    });

    await membership.save();
    await membership.populate('userId', 'name email');

    res.status(201).json(membership);
  } catch (error) {
    console.error('Create membership error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/memberships/:id - Update membership (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, endDate, startDate, price, planType } = req.body;

    const membership = await Membership.findById(id);
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    if (status) membership.status = status;
    if (endDate) membership.endDate = new Date(endDate);
    if (startDate) membership.startDate = new Date(startDate);
    if (price !== undefined) membership.price = price;
    if (planType) membership.planType = planType;

    await membership.save();
    await membership.populate('userId', 'name email');

    res.json(membership);
  } catch (error) {
    console.error('Update membership error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/memberships/:id/renew - Renew membership
router.put('/:id/renew', authenticate, [
  body('months').isInt({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { months } = req.body;

    const membership = await Membership.findById(id);
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    // Users can only renew their own memberships unless they're admin
    if (req.user.role !== 'admin' && membership.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const newEndDate = new Date(membership.endDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);

    membership.endDate = newEndDate;
    membership.status = 'active';
    await membership.save();

    res.json(membership);
  } catch (error) {
    console.error('Renew membership error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/memberships/:id - Delete/suspend membership (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { suspend } = req.query; // If suspend=true, just change status instead of deleting

    const membership = await Membership.findById(id);
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    if (suspend === 'true') {
      membership.status = 'suspended';
      await membership.save();
      res.json({ message: 'Membership suspended', membership });
    } else {
      await Membership.findByIdAndDelete(id);
      res.json({ message: 'Membership deleted successfully' });
    }
  } catch (error) {
    console.error('Delete membership error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/memberships/expiring - Get expiring memberships (admin only)
router.get('/expiring/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);

    const memberships = await Membership.find({
      status: 'active',
      endDate: { $lte: expirationDate, $gte: new Date() },
    })
      .populate('userId', 'name email phone')
      .sort({ endDate: 1 });

    // Filter out memberships with null userId (deleted users) or add default values
    const validMemberships = memberships.map(membership => {
      if (!membership.userId) {
        return {
          ...membership.toObject(),
          userId: {
            _id: null,
            name: 'Usuario eliminado',
            email: 'N/A',
            phone: 'N/A'
          }
        };
      }
      return membership;
    });

    res.json({ memberships: validMemberships, days });
  } catch (error) {
    console.error('Get expiring memberships error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

