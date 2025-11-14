const Membership = require('../models/Membership');

/**
 * Middleware to verify user has an active Premium membership
 */
const requirePremium = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has an active Premium membership
    const activeMembership = await Membership.findOne({
      userId: req.user._id,
      planType: 'premium',
      status: 'active',
      endDate: { $gte: new Date() },
    });

    if (!activeMembership) {
      return res.status(403).json({ 
        error: 'Premium membership required',
        message: 'Esta funcionalidad está disponible solo para usuarios Premium' 
      });
    }

    // Attach membership info to request
    req.membership = activeMembership;
    next();
  } catch (error) {
    console.error('Premium check error:', error);
    res.status(500).json({ error: 'Error verifying Premium membership' });
  }
};

module.exports = requirePremium;

