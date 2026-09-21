const Joi = require('joi');

const transactionSchema = Joi.object({
  product: Joi.string().required().messages({
    'string.empty': 'Product ID is required',
    'any.required': 'Product ID is required'
  }),
  type: Joi.string().valid('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER').required().messages({
    'any.only': 'Transaction type must be IN, OUT, ADJUSTMENT, or TRANSFER',
    'any.required': 'Transaction type is required'
  }),
  warehouse: Joi.string().required().messages({
    'string.empty': 'Warehouse is required',
    'any.required': 'Warehouse is required'
  }),
  toWarehouse: Joi.string().allow(null, '').when('type', {
    is: 'TRANSFER',
    then: Joi.required().messages({
      'any.required': 'Destination warehouse is required for transfers'
    })
  }),
  quantity: Joi.number().integer().positive().required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be a whole number',
    'number.positive': 'Quantity must be greater than zero',
    'any.required': 'Quantity is required'
  }),
  reference: Joi.string().trim().allow(''),
  notes: Joi.string().trim().allow(''),
});

module.exports = {
  transactionSchema,
};
