const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Membership = require('../models/Membership');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/clients - List all clients (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = { role: 'client' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Check database connection
    if (require('mongoose').connection.readyState !== 1) {
      console.error('Database not connected');
      return res.status(503).json({ error: 'Database not available. Please check your connection.' });
    }

    const clients = await User.find(query)
      .select('-password')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    // Get memberships for all clients (get the most recent one per client)
    const clientIds = clients.map(c => c._id);
    const allMemberships = await Membership.find({
      userId: { $in: clientIds },
    }).sort({ createdAt: -1 });

    // Get the most recent membership for each client
    const membershipsMap = new Map();
    allMemberships.forEach(m => {
      const userId = m.userId.toString();
      if (!membershipsMap.has(userId)) {
        membershipsMap.set(userId, m);
      }
    });
    const memberships = Array.from(membershipsMap.values());

    // Map memberships to clients
    const clientsWithMemberships = clients.map(client => {
      const clientData = client.toJSON();
      const membership = memberships.find(m => m.userId.toString() === client._id.toString());
      if (membership) {
        clientData.membership = {
          _id: membership._id,
          status: membership.status,
          startDate: membership.startDate,
          endDate: membership.endDate,
          planType: membership.planType,
          price: membership.price,
        };
      }
      return clientData;
    });

    const total = await User.countDocuments(query);

    res.json({
      clients: clientsWithMemberships,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/clients/:id - Get specific client
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get active membership if exists
    const membership = await Membership.findOne({
      userId: id,
      status: 'active',
    });

    const userData = user.toJSON();
    if (membership) {
      userData.membership = membership;
    }

    res.json(userData);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/clients - Create client (admin only)
router.post('/', authenticate, requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({
      email,
      password,
      name,
      phone,
      role: 'client',
    });

    await user.save();

    res.status(201).json({
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', authenticate, [
  body('name').optional().notEmpty().trim(),
  body('phone').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Users can only update their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, phone, weight, goal } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (weight !== undefined) updateData.weight = weight;
    if (goal !== undefined) updateData.goal = goal;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/clients/:id - Delete client (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

