const PurchaseOrder = require('./PurchaseOrder');
const InventoryTransaction = require('../inventory/InventoryTransaction');
const Product = require('../catalog/Product');
const asyncHandler = require('../../core/utils/asyncHandler');
// @desc    Get all purchase orders
// @route   GET /api/procurement/purchase-orders
// @access  Private
const getPOs = asyncHandler(async (req, res) => {
  const pos = await PurchaseOrder.find({ shop: req.user.shop })
    .populate('supplier', 'name email phone')
    .populate('warehouse', 'name')
    .sort({ createdAt: -1 });
  res.json(pos);
});

// @desc    Create a new purchase order
// @route   POST /api/procurement/purchase-orders
// @access  Private
const createPO = asyncHandler(async (req, res) => {
  const { supplier, warehouse, items, expectedDeliveryDate, notes } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('No order items provided');
  }

  // Calculate total amount
  const totalAmount = items.reduce((acc, item) => acc + item.totalCost, 0);
  
  // Generate a random PO number for now (can be customized)
  const poNumber = 'PO-' + Math.floor(100000 + Math.random() * 900000);

  const po = new PurchaseOrder({
    poNumber,
    supplier,
    warehouse,
    shop: req.user.shop,
    expectedDeliveryDate,
    items,
    totalAmount,
    notes,
    status: 'Pending'
  });

  const createdPO = await po.save();
  res.status(201).json(createdPO);
});

// @desc    Mark PO as Received and automatically restock
// @route   PATCH /api/procurement/purchase-orders/:id/receive
// @access  Private
const receivePO = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, shop: req.user.shop });

  if (!po) {
    res.status(404);
    throw new Error('Purchase Order not found');
  }

  if (po.status !== 'Pending') {
    res.status(400);
    throw new Error(`Cannot receive a PO that is currently marked as ${po.status}`);
  }

  // Generate inventory transactions and update stock
  for (const item of po.items) {
    // 1. Create Transaction
    await InventoryTransaction.create({
      shop: req.user.shop,
      product: item.product,
      type: 'IN',
      warehouse: po.warehouse,
      quantity: item.quantity,
      reference: po.poNumber,
      notes: `Received from Purchase Order ${po.poNumber}`,
      user: req.user._id
    });

    // 2. Update Product Stock (Atomic increment)
    // Need to also handle warehouse-specific stock in the product model if it tracks per-warehouse, 
    // but the current system seems to use total stock on product. 
    // Let's assume there is a `stock` field on the product for total inventory.
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stockQuantity: item.quantity } } // Incrementing stockQuantity
    );
  }

  po.status = 'Received';
  const updatedPO = await po.save();

  res.json({ message: 'Purchase Order received and inventory updated', po: updatedPO });
});

module.exports = {
  getPOs,
  createPO,
  receivePO
};
