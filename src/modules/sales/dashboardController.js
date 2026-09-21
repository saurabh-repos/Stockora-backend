const Product = require('../catalog/Product');
const InventoryTransaction = require('../inventory/InventoryTransaction');
const asyncHandler = require('../../core/utils/asyncHandler');

// @desc    Get dashboard summary statistics
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = asyncHandler(async (req, res) => {
  // 1. Total Active Products
  const totalProducts = await Product.countDocuments({ shop: req.user.shop, isActive: true });

  // 2 & 3. Total Stock Value and Total Selling Value
  // We use MongoDB Aggregation for efficient calculation across all active products
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

  // 4. Low Stock Count
  const lowStockAggregation = await Product.aggregate([
    { $match: { shop: req.user.shop, isActive: true } },
    { $match: { $expr: { $lte: ['$totalStock', '$minimumStock'] } } },
    { $count: 'count' }
  ]);
  const lowStockCount = lowStockAggregation.length > 0 ? lowStockAggregation[0].count : 0;

  // 5. Recent Transactions (last 5)
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

module.exports = {
  getDashboardSummary
};
