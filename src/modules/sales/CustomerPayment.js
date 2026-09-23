const mongoose = require('mongoose');

const customerPaymentSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'],
    required: true,
  },
  referenceNumber: {
    type: String,
  },
  notes: {
    type: String,
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

const CustomerPayment = mongoose.model('CustomerPayment', customerPaymentSchema);
module.exports = CustomerPayment;
