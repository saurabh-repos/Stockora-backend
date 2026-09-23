const Product = require('../catalog/Product');
const InventoryTransaction = require('../inventory/InventoryTransaction');
const Sale = require('../sales/Sale');
const Customer = require('../sales/Customer');
const asyncHandler = require('../../core/utils/asyncHandler');

// @desc    Get inventory summary statistics
// @route   GET /api/dashboard/inventory
// @access  Private
const getInventorySummary = asyncHandler(async (req, res) => {
  const totalProducts = await Product.countDocuments({ shop: req.user.shop, isActive: true });

  const valueAggregation = await Product.aggregate([
    { $match: { shop: req.user.shop, isActive: true } },
    {
      $group: {
        _id: null,
        totalStockValue: { $sum: { $multiply: ['$totalStock', '$purchasePrice'] } },
        totalSellingValue: { $sum: { $multiply: ['$totalStock', '$sellingPrice'] } }
      }
    }
  ]);

  const totalStockValue = valueAggregation.length > 0 ? valueAggregation[0].totalStockValue : 0;
  const totalSellingValue = valueAggregation.length > 0 ? valueAggregation[0].totalSellingValue : 0;

  const lowStockAggregation = await Product.aggregate([
    { $match: { shop: req.user.shop, isActive: true } },
    { $match: { $expr: { $lte: ['$totalStock', '$minimumStock'] } } },
    { $count: 'count' }
  ]);
  const lowStockCount = lowStockAggregation.length > 0 ? lowStockAggregation[0].count : 0;

  const recentTransactions = await InventoryTransaction.find({ shop: req.user.shop })
    .populate('product', 'name sku')
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    totalProducts,
    totalStockValue,
    totalSellingValue,
    lowStockCount,
    recentTransactions
  });
});

// @desc    Get sales summary statistics
// @route   GET /api/dashboard/sales
// @access  Private
const getSalesSummary = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const todaySalesAgg = await Sale.aggregate([
    { $match: { shop: req.user.shop, createdAt: { $gte: today } } },
    { $group: { _id: null, amount: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
  ]);
  const todaySalesAmount = todaySalesAgg.length > 0 ? todaySalesAgg[0].amount : 0;
  const todaySalesCount = todaySalesAgg.length > 0 ? todaySalesAgg[0].count : 0;

  const monthlySalesAgg = await Sale.aggregate([
    { $match: { shop: req.user.shop, createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, amount: { $sum: '$grandTotal' } } }
  ]);
  const monthlySalesAmount = monthlySalesAgg.length > 0 ? monthlySalesAgg[0].amount : 0;

  const udhaarAgg = await Customer.aggregate([
    { $match: { shop: req.user.shop } },
    { $group: { _id: null, amount: { $sum: '$outstandingBalance' } } }
  ]);
  const totalUdhaar = udhaarAgg.length > 0 ? udhaarAgg[0].amount : 0;

  const recentSales = await Sale.find({ shop: req.user.shop })
    .populate('customer', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    todaySalesAmount,
    todaySalesCount,
    monthlySalesAmount,
    totalUdhaar,
    recentSales
  });
});

module.exports = {
  getInventorySummary,
  getSalesSummary
};
