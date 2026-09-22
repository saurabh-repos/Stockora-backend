const mongoose = require('mongoose');
const auditPlugin = require('../audit/auditPlugin');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a product name'],
      trim: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    images: [{
      type: String,
    }],
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allows multiple null/empty SKUs if not uniquely required for all
    },
    barcode: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      enum: ['piece', 'box', 'sq.ft', 'sq.m', 'metre', 'kg', 'litre'],
      default: 'piece',
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: 0,
    },
    mrp: {
      type: Number,
      min: 0,
    },
    gstPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    minimumStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    boxCoverage: {
      type: Number,
      // Useful for tiles: e.g., 1 box covers 15.5 sq.ft
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Multi-warehouse tracking
    stockLocations: [
      {
        warehouse: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Warehouse',
          required: true,
        },
        quantity: {
          type: Number,
          default: 0,
        },
      },
    ],
    // Cached total stock across all warehouses for easy querying/sorting
    totalStock: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for search optimization
productSchema.index({ name: 'text', sku: 'text', barcode: 'text', category: 'text' });

// Apply audit plugin - auto-logs all create/update/delete
productSchema.plugin(auditPlugin);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
