const express = require('express');
const router = express.Router();
const { getSales, createSale, returnSale } = require('./saleController');
const { protect } = require('../../core/middlewares/authMiddleware');

router.route('/')
  .get(protect, getSales)
  .post(protect, createSale);

router.post('/:id/return', protect, returnSale);

module.exports = router;
