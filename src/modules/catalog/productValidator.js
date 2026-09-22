const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Product name is required'
  }),
  category: Joi.string().trim().required().messages({
    'string.empty': 'Category is required'
  }),
  brand: Joi.string().trim().allow(''),
  sku: Joi.string().trim().allow(''),
  barcode: Joi.string().trim().allow(''),
  unit: Joi.string().valid('piece', 'box', 'sq.ft', 'sq.m', 'metre', 'kg', 'litre').required(),
  purchasePrice: Joi.number().min(0).required().messages({
    'number.min': 'Purchase price cannot be negative',
    'any.required': 'Purchase price is required'
  }),
  sellingPrice: Joi.number().min(0).required().messages({
    'number.min': 'Selling price cannot be negative',
    'any.required': 'Selling price is required'
  }),
  mrp: Joi.number().min(0).allow(null, ''),
  gstPercent: Joi.number().min(0).max(100).allow(null, ''),
  minimumStock: Joi.number().min(0).allow(null, ''),
  boxCoverage: Joi.number().min(0).allow(null, ''),
  images: Joi.array().items(Joi.string()).optional()
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim(),
  category: Joi.string().trim(),
  brand: Joi.string().trim().allow(''),
  sku: Joi.string().trim().allow(''),
  barcode: Joi.string().trim().allow(''),
  unit: Joi.string().valid('piece', 'box', 'sq.ft', 'sq.m', 'metre', 'kg', 'litre'),
  purchasePrice: Joi.number().min(0),
  sellingPrice: Joi.number().min(0),
  mrp: Joi.number().min(0).allow(null, ''),
  gstPercent: Joi.number().min(0).max(100).allow(null, ''),
  minimumStock: Joi.number().min(0).allow(null, ''),
  boxCoverage: Joi.number().min(0).allow(null, ''),
  images: Joi.array().items(Joi.string()).optional()
});

module.exports = {
  createProductSchema,
  updateProductSchema
};
