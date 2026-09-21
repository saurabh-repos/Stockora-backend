const express = require('express');
const router = express.Router();
const { getSales, createSale } = require('./saleController');
const { protect } = require('../../core/middlewares/authMiddleware');

router.route('/')
  .get(protect, getSales)
  .post(protect, createSale);

module.exports = router;
