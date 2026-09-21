const User = require('../auth/User');
const Shop = require('./Shop');
const asyncHandler = require('../../core/utils/asyncHandler');

// @desc    Get all users in the shop
// @route   GET /api/admin/users
// @access  Private/Admin
const getShopUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ shop: req.user.shop }).select('-password').sort({ createdAt: -1 });
  res.json(users);
});

// @desc    Add a new employee to the shop
// @route   POST /api/admin/users
// @access  Private/Admin
const addShopUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (role === 'SuperAdmin') {
    res.status(403);
    throw new Error('Cannot assign SuperAdmin role');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists in the system');
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'Staff',
    shop: req.user.shop
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

// @desc    Delete (or deactivate) an employee
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteShopUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot delete yourself');
  }

  const user = await User.findOne({ _id: req.params.id, shop: req.user.shop });
  if (user) {
    // Check if owner
    const shop = await Shop.findById(req.user.shop);
    if (shop.owner.toString() === user._id.toString()) {
      res.status(400);
      throw new Error('Cannot delete the shop owner');
    }

    await user.deleteOne();
    res.json({ message: 'User removed successfully' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update employee details
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateShopUser = asyncHandler(async (req, res) => {
  const { name, role } = req.body;
  
  if (role === 'SuperAdmin') {
    res.status(403);
    throw new Error('Cannot assign SuperAdmin role');
  }

  const user = await User.findOne({ _id: req.params.id, shop: req.user.shop });
  
  if (user) {
    const shop = await Shop.findById(req.user.shop);
    if (shop.owner.toString() === user._id.toString() && role !== 'Admin') {
      res.status(400);
      throw new Error('Cannot change the role of the shop owner');
    }

    user.name = name || user.name;
    user.role = role || user.role;
    
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Toggle employee status (active/suspended)
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
const toggleUserStatus = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot suspend yourself');
  }

  const user = await User.findOne({ _id: req.params.id, shop: req.user.shop });
  
  if (user) {
    const shop = await Shop.findById(req.user.shop);
    if (shop.owner.toString() === user._id.toString()) {
      res.status(400);
      throw new Error('Cannot suspend the shop owner');
    }

    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? 'activated' : 'suspended'} successfully`, isActive: user.isActive });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update employee password
// @route   PATCH /api/admin/users/:id/password
// @access  Private/Admin
const updateUserPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const user = await User.findOne({ _id: req.params.id, shop: req.user.shop });
  
  if (user) {
    user.password = password;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
  getShopUsers,
  addShopUser,
  deleteShopUser,
  updateShopUser,
  toggleUserStatus,
  updateUserPassword
};
