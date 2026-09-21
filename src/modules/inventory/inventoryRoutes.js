const express = require('express');
const router = express.Router();
const {
  recordTransaction,
  getTransactions,
  getLowStockProducts,
} = require('./inventoryController');
const { protect } = require('../../core/middlewares/authMiddleware');
const validateRequest = require('../../core/middlewares/validateRequest');
const { transactionSchema } = require('./inventoryValidator');

// Get all transaction history
router.get('/transactions', protect, getTransactions);

// Record a new transaction (In/Out/Adjustment)
router.post('/transaction', protect, validateRequest(transactionSchema), recordTransaction);

// Get low stock alerts
router.get('/low-stock', protect, getLowStockProducts);

module.exports = router;
