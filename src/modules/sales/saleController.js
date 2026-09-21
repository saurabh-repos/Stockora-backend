const mongoose = require('mongoose');
const Sale = require('./Sale');
const Product = require('../catalog/Product');
const InventoryTransaction = require('../inventory/InventoryTransaction');
const asyncHandler = require('../../core/utils/asyncHandler');

// Helper to generate Invoice Number (e.g., INV-1001)
const generateInvoiceNumber = async (shopId) => {
  const lastSale = await Sale.findOne({ shop: shopId }).sort({ createdAt: -1 });
  if (!lastSale) {
    return 'INV-1001';
  }
  const lastNum = parseInt(lastSale.invoiceNumber.split('-')[1]);
  return `INV-${lastNum + 1}`;
};

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
const getSales = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const total = await Sale.countDocuments({ shop: req.user.shop });

  const sales = await Sale.find({ shop: req.user.shop })
    .populate('customer', 'name phone')
    .populate('warehouse', 'name')
    .populate('soldBy', 'name')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);
    
  res.json({
    data: sales,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// @desc    Create a new sale (Point of Sale checkout)
// @route   POST /api/sales
// @access  Private
const createSale = asyncHandler(async (req, res) => {
  const { customer, walkInCustomerName, warehouse, items, paymentMethod, status } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('No items in the cart');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoiceNumber = await generateInvoiceNumber(req.user.shop);
    
    let subtotal = 0;
    let gstTotal = 0;

    // 1. Validate stock and calculate totals
    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, shop: req.user.shop }).session(session);
      if (!product) {
        throw new Error(`Product ID ${item.product} not found`);
      }

      // Check warehouse stock
      const stockEntry = product.stockLocations.find(loc => loc.warehouse.toString() === warehouse);
      if (!stockEntry || stockEntry.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name} in selected warehouse. Available: ${stockEntry ? stockEntry.quantity : 0}`);
      }

      // Calculate totals
      item.unitPrice = product.sellingPrice;
      item.lineTotal = product.sellingPrice * item.quantity;
      subtotal += item.lineTotal;
      
      if (product.gstPercent) {
        gstTotal += (item.lineTotal * product.gstPercent) / 100;
      }
    }

    const grandTotal = subtotal + gstTotal;

    // 2. Create the Sale record
    const sale = new Sale({
      shop: req.user.shop,
      invoiceNumber,
      customer: customer || undefined,
      walkInCustomerName: customer ? undefined : walkInCustomerName,
      warehouse,
      items,
      subtotal,
      gstTotal,
      grandTotal,
      status: status || 'PAID',
      paymentMethod: paymentMethod || 'CASH',
      soldBy: req.user._id
    });

    await sale.save({ session });

    // 3. Process Inventory Deductions
    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, shop: req.user.shop }).session(session);
      const stockEntry = product.stockLocations.find(loc => loc.warehouse.toString() === warehouse);
      
      // Deduct stock
      stockEntry.quantity -= item.quantity;
      product.totalStock = product.stockLocations.reduce((sum, loc) => sum + loc.quantity, 0);
      await product.save({ session });

      // Create Ledger Entry
      const transaction = new InventoryTransaction({
        shop: req.user.shop,
        product: product._id,
        type: 'OUT',
        quantity: item.quantity,
        reference: invoiceNumber,
        notes: `Sold via POS`,
        warehouse,
        user: req.user._id,
      });
      await transaction.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(sale);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

module.exports = {
  getSales,
  createSale,
};
