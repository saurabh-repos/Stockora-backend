const mongoose = require('mongoose');
const InventoryTransaction = require('./InventoryTransaction');
const Product = require('../catalog/Product');
const asyncHandler = require('../../core/utils/asyncHandler');

// @desc    Record a new inventory transaction and update product stock
// @route   POST /api/inventory/transaction
// @access  Private
const recordTransaction = asyncHandler(async (req, res) => {
  const { product: productId, type, quantity, reference, notes, warehouse, toWarehouse } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(productId).session(session);

    if (!product) {
      throw new Error('Product not found');
    }

    // Helper to find or create a warehouse stock entry
    const getStockEntry = (wId) => {
      let entry = product.stockLocations.find(loc => loc.warehouse.toString() === wId);
      if (!entry) {
        entry = { warehouse: wId, quantity: 0 };
        product.stockLocations.push(entry);
      }
      return entry;
    };

    const fromEntry = getStockEntry(warehouse);

    // Validate sufficient stock for OUT and TRANSFER
    if ((type === 'OUT' || type === 'TRANSFER') && fromEntry.quantity < quantity) {
      res.status(400);
      throw new Error(`Insufficient stock in selected warehouse. Current stock is ${fromEntry.quantity}`);
    }

    // 1. Create the transaction ledger entry
    const transaction = new InventoryTransaction({
      product: productId,
      type,
      quantity,
      reference,
      notes,
      warehouse,
      toWarehouse: type === 'TRANSFER' ? toWarehouse : undefined,
      user: req.user._id, // Set by protect middleware
      shop: req.user.shop
    });

    await transaction.save({ session });

    // 2. Update the product's warehouse stock
    if (type === 'IN') {
      fromEntry.quantity += quantity;
    } else if (type === 'OUT') {
      fromEntry.quantity -= quantity;
    } else if (type === 'ADJUSTMENT') {
      fromEntry.quantity = quantity; 
    } else if (type === 'TRANSFER') {
      const toEntry = getStockEntry(toWarehouse);
      fromEntry.quantity -= quantity;
      toEntry.quantity += quantity;
    }

    // 3. Recalculate totalStock cache
    product.totalStock = product.stockLocations.reduce((sum, loc) => sum + loc.quantity, 0);

    await product.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Transaction recorded successfully',
      transaction,
      newTotalStock: product.totalStock
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

// @desc    Get inventory transaction history
// @route   GET /api/inventory/transactions
// @access  Private
const getTransactions = asyncHandler(async (req, res) => {
  // Optional filtering by productId
  const filter = { shop: req.user.shop };
  if (req.query.productId) {
    filter.product = req.query.productId;
  }

  const transactions = await InventoryTransaction.find(filter)
    .populate('product', 'name sku totalStock minimumStock')
    .populate('warehouse', 'name')
    .populate('toWarehouse', 'name')
    .populate('user', 'name')
    .sort({ createdAt: -1 });

  res.json(transactions);
});

// @desc    Get products that are low on stock
// @route   GET /api/inventory/low-stock
// @access  Private
const getLowStockProducts = asyncHandler(async (req, res) => {
  // MongoDB aggregation or simple query where totalStock <= minimumStock
  const products = await Product.find({
    shop: req.user.shop,
    isActive: true,
    $expr: { $lte: ['$totalStock', '$minimumStock'] }
  }).sort({ totalStock: 1 }).populate('stockLocations.warehouse', 'name');

  res.json(products);
});

module.exports = {
  recordTransaction,
  getTransactions,
  getLowStockProducts
};
