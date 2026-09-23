const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  seq: { type: Number, default: 1000 }
});

// Compound index for shop-specific counters
counterSchema.index({ _id: 1, shop: 1 }, { unique: true });

const Counter = mongoose.model('Counter', counterSchema);
module.exports = Counter;
