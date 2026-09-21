const express = require('express');
const router = express.Router();
const { uploadMultipleImages } = require('./uploadController');
const upload = require('../../core/middlewares/uploadMiddleware');
const { protect } = require('../../core/middlewares/authMiddleware');

router.use(protect);

router.post('/multiple', upload.array('images', 5), uploadMultipleImages); // Max 5 images per request

module.exports = router;
