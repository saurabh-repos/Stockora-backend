const jwt = require('jsonwebtoken');
const User = require('../../modules/auth/User');
const asyncHandler = require('../utils/asyncHandler');
const { getAuditContext } = require('../../modules/audit/auditContext');

const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies.jwt;

  if (token && token !== 'none') {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      // Inject user into the request-scoped audit context
      const store = getAuditContext();
      if (store) store.user = req.user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an Admin' });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized to access this route');
    }
    
    // SuperAdmins bypass standard tenant role checks
    if (req.user.role === 'SuperAdmin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`User role '${req.user.role}' is not authorized to access this route`);
    }
    next();
  };
};

// Strict SuperAdmin check
const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'SuperAdmin') {
    next();
  } else {
    res.status(403);
    throw new Error('This action requires Super Admin privileges');
  }
};

module.exports = { protect, admin, authorize, requireSuperAdmin };
