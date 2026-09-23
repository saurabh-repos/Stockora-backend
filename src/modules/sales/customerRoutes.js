const express = require('express');
const router = express.Router();
const { getCustomers, createCustomer, receiveCustomerPayment } = require('./customerController');
const { protect } = require('../../core/middlewares/authMiddleware');

router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

router.route('/:id/payments')
  .post(protect, receiveCustomerPayment);

module.exports = router;
