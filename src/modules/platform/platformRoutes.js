const express = require('express');
const router = express.Router();
const { createTenant, getAllShops, updateShop, deleteShop, getPlatformStats } = require('./platformController');
const { protect, requireSuperAdmin } = require('../../core/middlewares/authMiddleware');

router.use(protect);
router.use(requireSuperAdmin);

router.route('/stats').get(getPlatformStats);
router.route('/shops')
  .get(getAllShops)
  .post(createTenant);
router.route('/shops/:id')
  .put(updateShop)
  .delete(deleteShop);

module.exports = router;
