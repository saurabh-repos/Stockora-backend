const express = require('express');
const router = express.Router();
const {
  authUser,
  getUserProfile,
  generate2FA,
  enable2FA,
  verify2FALogin,
  forgotPassword,
  resetPassword,
  logoutUser,
  uploadProfileImage
} = require('./authController');
const { protect } = require('../../core/middlewares/authMiddleware');
const validateRequest = require('../../core/middlewares/validateRequest');
const { loginSchema } = require('./authValidator');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/login', validateRequest(loginSchema), authUser);
router.post('/logout', logoutUser);
router.get('/profile', protect, getUserProfile);
router.post('/profile/image', protect, upload.single('image'), uploadProfileImage);

// 2FA Routes
router.post('/2fa/generate', protect, generate2FA);
router.post('/2fa/enable', protect, enable2FA);
router.post('/2fa/verify', verify2FALogin);

// Password Routes
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;
