const express = require('express');
const router = express.Router();
const { getSuppliers, createSupplier, updateSupplier, deleteSupplier } = require('./supplierController');
const { getPOs, createPO, receivePO } = require('./poController');
const { protect, authorize } = require('../../core/middlewares/authMiddleware');

// Suppliers
router.route('/suppliers')
  .get(protect, getSuppliers)
  .post(protect, authorize('Manager', 'Admin'), createSupplier);

router.route('/suppliers/:id')
  .put(protect, authorize('Manager', 'Admin'), updateSupplier)
  .delete(protect, authorize('Admin'), deleteSupplier);

// Purchase Orders
router.route('/purchase-orders')
  .get(protect, getPOs)
  .post(protect, authorize('Manager', 'Admin'), createPO);

router.route('/purchase-orders/:id/receive')
  .patch(protect, authorize('Manager', 'Admin'), receivePO);

module.exports = router;
