const express = require('express');
const router = express.Router();
const { getShopUsers, addShopUser, deleteShopUser, updateShopUser, toggleUserStatus, updateUserPassword } = require('./adminController');
const { protect, authorize } = require('../../core/middlewares/authMiddleware');

router.route('/users')
  .get(protect, authorize('Admin'), getShopUsers)
  .post(protect, authorize('Admin'), addShopUser);

router.route('/users/:id')
  .put(protect, authorize('Admin'), updateShopUser)
  .delete(protect, authorize('Admin'), deleteShopUser);

router.route('/users/:id/status')
  .patch(protect, authorize('Admin'), toggleUserStatus);

router.route('/users/:id/password')
  .patch(protect, authorize('Admin'), updateUserPassword);

module.exports = router;
