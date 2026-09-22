const mongoose = require('mongoose');
const auditPlugin = require('../audit/auditPlugin');

const customerSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Search optimization index
customerSchema.index({ shop: 1, name: 1 });

customerSchema.plugin(auditPlugin);

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;
