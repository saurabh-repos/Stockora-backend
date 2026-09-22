const mongoose = require('mongoose');
const auditPlugin = require('../audit/auditPlugin');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  lineTotal: {
    type: Number,
    required: true,
  }
});

const saleSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true, // Typically auto-generated
    },
    // customer is optional for Walk-in cash sales
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    // If it's a walk-in, we just save the name here
    walkInCustomerName: {
      type: String,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true, // From which warehouse the stock is deducted
    },
    items: [saleItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    gstTotal: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['PAID', 'UNPAID', 'PARTIAL', 'CANCELLED'],
      default: 'PAID',
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CREDIT'],
      default: 'CASH',
    },
    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

// Index to quickly fetch a shop's sales
saleSchema.index({ shop: 1, createdAt: -1 });

saleSchema.plugin(auditPlugin);

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;
