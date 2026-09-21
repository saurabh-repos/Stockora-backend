const express = require('express');
const router = express.Router();
const { getCustomers, createCustomer } = require('./customerController');
const { protect } = require('../../core/middlewares/authMiddleware');

router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

module.exports = router;
