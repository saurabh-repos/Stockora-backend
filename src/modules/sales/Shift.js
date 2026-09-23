const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    closingBalance: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['OPEN', 'CLOSED'],
      default: 'OPEN',
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
    notes: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

shiftSchema.index({ shop: 1, user: 1, status: 1 });

const Shift = mongoose.model('Shift', shiftSchema);

module.exports = Shift;
