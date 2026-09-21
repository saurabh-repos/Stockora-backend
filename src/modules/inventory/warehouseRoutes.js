const express = require('express');
const router = express.Router();
const {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
} = require('./warehouseController');
const { protect, authorize } = require('../../core/middlewares/authMiddleware');

router.route('/')
  .get(protect, authorize('Admin', 'Manager'), getWarehouses)
  .post(protect, authorize('Admin'), createWarehouse);

router.route('/:id')
  .put(protect, authorize('Admin'), updateWarehouse)
  .delete(protect, authorize('Admin'), deleteWarehouse);

module.exports = router;
