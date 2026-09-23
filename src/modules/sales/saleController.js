const mongoose = require('mongoose');
const Sale = require('./Sale');
const Product = require('../catalog/Product');
const Customer = require('./Customer');
const InventoryTransaction = require('../inventory/InventoryTransaction');
const asyncHandler = require('../../core/utils/asyncHandler');
const Counter = require('./Counter');

// Helper to generate Invoice Number atomically (e.g., INV-1001)
const generateInvoiceNumber = async (shopId, session) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'invoice', shop: shopId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return `INV-${counter.seq}`;
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
  const { customer, walkInCustomerName, walkInCustomerPhone, walkInCustomerEmail, warehouse, items, paymentMethod, status, creditDueDate } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('No items in the cart');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoiceNumber = await generateInvoiceNumber(req.user.shop, session);
    
    let finalCustomerId = customer;
    
    // Quick-Add CRM for Walk-in Credit
    if (paymentMethod === 'CREDIT') {
      if (!finalCustomerId && !walkInCustomerPhone) {
         throw new Error('Phone number is required to extend credit to a walk-in customer');
      }
      
      if (!finalCustomerId && walkInCustomerPhone) {
        let existingCustomer = await Customer.findOne({ shop: req.user.shop, phone: walkInCustomerPhone }).session(session);
        if (!existingCustomer) {
          existingCustomer = new Customer({
            shop: req.user.shop,
            name: walkInCustomerName || 'Walk-in (Credit)',
            phone: walkInCustomerPhone,
            email: walkInCustomerEmail || '',
            outstandingBalance: 0
          });
          await existingCustomer.save({ session });
        }
        finalCustomerId = existingCustomer._id;
      }
    }

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

    let saleStatus = status || 'PAID';
    if (paymentMethod === 'CREDIT') {
      saleStatus = 'UNPAID';
    }

    // 2. Create the Sale record
    const sale = new Sale({
      shop: req.user.shop,
      invoiceNumber,
      customer: finalCustomerId || undefined,
      walkInCustomerName: finalCustomerId ? undefined : walkInCustomerName,
      warehouse,
      items,
      subtotal,
      gstTotal,
      grandTotal,
      status: saleStatus,
      paymentMethod: paymentMethod || 'CASH',
      creditDueDate: paymentMethod === 'CREDIT' ? (creditDueDate || undefined) : undefined,
      soldBy: req.user._id
    });

    await sale.save({ session });

    // 3. Process Inventory Deductions
    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, shop: req.user.shop }).session(session);
      const stockEntry = product.stockLocations.find(loc => loc.warehouse.toString() === warehouse);
      
      // Deduct stock atomically to prevent race conditions
      const updateResult = await Product.updateOne(
        { 
          _id: product._id, 
          shop: req.user.shop,
          'stockLocations.warehouse': warehouse,
          'stockLocations.quantity': { $gte: item.quantity }
        },
        { 
          $inc: { 
            'stockLocations.$.quantity': -item.quantity,
            totalStock: -item.quantity
          } 
        },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error(`Insufficient stock for ${product.name} (Race condition prevented)`);
      }

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

    // 4. Update Customer Balance if Credit
    if (paymentMethod === 'CREDIT' && finalCustomerId) {
      await Customer.findByIdAndUpdate(
        finalCustomerId, 
        { $inc: { outstandingBalance: grandTotal } },
        { session }
      );
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
