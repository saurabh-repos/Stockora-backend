const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('./productController');
const { protect, authorize } = require('../../core/middlewares/authMiddleware');
const validateRequest = require('../../core/middlewares/validateRequest');
const { createProductSchema, updateProductSchema } = require('./productValidator');

router.route('/')
  .get(protect, getProducts) // All roles can read
  .post(protect, authorize('Admin', 'Manager'), validateRequest(createProductSchema), createProduct);

router.route('/:id')
  .get(protect, getProductById)
  .put(protect, authorize('Admin', 'Manager'), validateRequest(updateProductSchema), updateProduct)
  .delete(protect, authorize('Admin', 'Manager'), deleteProduct);

module.exports = router;
