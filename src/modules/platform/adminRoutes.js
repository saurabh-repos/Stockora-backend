const express = require('express');
const router = express.Router();
const { getShopUsers, addShopUser, deleteShopUser } = require('./adminController');
const { protect, authorize } = require('../../core/middlewares/authMiddleware');

router.route('/users')
  .get(protect, authorize('Admin'), getShopUsers)
  .post(protect, authorize('Admin'), addShopUser);

router.route('/users/:id')
  .delete(protect, authorize('Admin'), deleteShopUser);

module.exports = router;
