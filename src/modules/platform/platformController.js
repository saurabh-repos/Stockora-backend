const Shop = require('./Shop');
const User = require('../auth/User');
const Product = require('../catalog/Product');
const Sale = require('../sales/Sale');
const Warehouse = require('../inventory/Warehouse');
const asyncHandler = require('../../core/utils/asyncHandler');

// @desc    Create a new tenant (Shop and Admin user)
// @route   POST /api/superadmin/shops
// @access  Private/SuperAdmin
const createTenant = asyncHandler(async (req, res) => {
  const { name, email, password, shopName, subscriptionPlan } = req.body;
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User email already exists');
  }

  // Create Shop first with temporary owner ID
  const mongoose = require('mongoose');
  const shop = await Shop.create({ 
    name: shopName || `${name}'s Shop`, 
    owner: new mongoose.Types.ObjectId(),
    subscriptionPlan: subscriptionPlan || 'FREE',
    isActive: true
  });

  // Create user
  const user = await User.create({ 
    name, 
    email, 
    password, 
    role: 'Admin', 
    shop: shop._id
  });

  if (user) {
    // Update shop owner
    shop.owner = user._id;
    await shop.save();
    res.status(201).json({ shop, admin: { _id: user._id, name: user.name, email: user.email } });
  } else {
    // Rollback shop if user fails
    await Shop.findByIdAndDelete(shop._id);
    res.status(400);
    throw new Error('Invalid user data');
  }
});
// @desc    Get all shops in the platform
// @route   GET /api/superadmin/shops
// @access  Private/SuperAdmin
const getAllShops = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || '';

  let query = {};
  
  if (search) {
    const users = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    const userIds = users.map(u => u._id);

    query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { owner: { $in: userIds } }
      ]
    };
  }

  const startIndex = (page - 1) * limit;
  const total = await Shop.countDocuments(query);
  
  const shops = await Shop.find(query)
    .populate('owner', 'name email')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  res.json({
    data: shops,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// @desc    Update a shop (e.g. toggle active status or subscription)
// @route   PUT /api/superadmin/shops/:id
// @access  Private/SuperAdmin
const updateShop = asyncHandler(async (req, res) => {
  const { isActive, subscriptionPlan, name, password } = req.body;
  const shop = await Shop.findById(req.params.id);

  if (shop) {
    if (isActive !== undefined) shop.isActive = isActive;
    if (subscriptionPlan !== undefined) shop.subscriptionPlan = subscriptionPlan;
    if (name !== undefined) shop.name = name;
    
    await shop.save();

    // If password is provided, update the shop owner's password
    if (password && password.trim().length >= 6) {
      const owner = await User.findById(shop.owner);
      if (owner) {
        owner.password = password;
        await owner.save();
      }
    }

    res.json(shop);
  } else {
    res.status(404);
    throw new Error('Shop not found');
  }
});

// @desc    Delete a shop
// @route   DELETE /api/superadmin/shops/:id
// @access  Private/SuperAdmin
const deleteShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id);
  if (shop) {
    await shop.deleteOne();
    res.json({ message: 'Shop removed' });
  } else {
    res.status(404);
    throw new Error('Shop not found');
  }
});

// @desc    Get platform stats
// @route   GET /api/superadmin/stats
// @access  Private/SuperAdmin
const getPlatformStats = asyncHandler(async (req, res) => {
  const totalShops = await Shop.countDocuments();
  const totalUsers = await User.countDocuments();
  const activeShops = await Shop.countDocuments({ isActive: true });
  
  // Advanced metrics
  const totalProducts = await Product.countDocuments();
  const totalWarehouses = await Warehouse.countDocuments();
  
  // Aggregate total platform revenue
  const salesAgg = await Sale.aggregate([
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalSales: { $sum: 1 } } }
  ]);
  
  const totalPlatformRevenue = salesAgg.length > 0 ? salesAgg[0].totalRevenue : 0;
  const totalSalesCount = salesAgg.length > 0 ? salesAgg[0].totalSales : 0;
  
  // Get recent shops
  const recentShops = await Shop.find({}).populate('owner', 'name email').sort({ createdAt: -1 }).limit(5);

  res.json({
    totalShops,
    totalUsers,
    activeShops,
    totalProducts,
    totalWarehouses,
    totalPlatformRevenue,
    totalSalesCount,
    recentShops
  });
});

module.exports = {
  createTenant,
  getAllShops,
  updateShop,
  deleteShop,
  getPlatformStats
};
