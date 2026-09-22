const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('./User');
const asyncHandler = require('../../core/utils/asyncHandler');
const { logActivity } = require('../audit/auditService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Helper function to send token in cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  res.status(statusCode).cookie('jwt', token, options).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
};

// @desc    Auth user & get token (or prompt for 2FA)
// @route   POST /api/auth/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    if (user.isTwoFactorEnabled) {
      return res.json({ requires2FA: true, userId: user._id });
    }
    logActivity({
      shop: user.shop,
      user,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      details: { method: 'password' },
      ipAddress: req.ip,
    });
    sendTokenResponse(user, 200, res);
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Verify 2FA token during login
// @route   POST /api/auth/2fa/verify
// @access  Public
const verify2FALogin = asyncHandler(async (req, res) => {
  const { userId, token } = req.body;
  const user = await User.findById(userId);

  if (!user || !user.isTwoFactorEnabled) {
    res.status(400);
    throw new Error('User or 2FA setup not found');
  }

  const isVerified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (isVerified) {
    sendTokenResponse(user, 200, res);
  } else {
    res.status(401);
    throw new Error('Invalid 2FA code');
  }
});

// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
  res.cookie('jwt', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: 'User logged out successfully' });
};

// @desc    Generate 2FA Secret and QR Code for setup
// @route   POST /api/auth/2fa/generate
// @access  Private
const generate2FA = asyncHandler(async (req, res) => {
  const secret = speakeasy.generateSecret({ name: `InventoryApp (${req.user.email})` });
  const user = await User.findById(req.user._id);
  user.twoFactorSecret = secret.base32;
  await user.save();

  QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
    if (err) {
      res.status(500);
      throw new Error('Error generating QR code');
    }
    res.json({ secret: secret.base32, qrCode: data_url });
  });
});

// @desc    Enable 2FA (Verify first token)
// @route   POST /api/auth/2fa/enable
// @access  Private
const enable2FA = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id);

  const isVerified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (isVerified) {
    user.isTwoFactorEnabled = true;
    await user.save();
    res.json({ message: 'Two-Factor Authentication enabled successfully' });
  } else {
    res.status(400);
    throw new Error('Invalid code, 2FA not enabled');
  }
});

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    res.status(404);
    throw new Error('There is no user with that email');
  }

  const resetToken = user.getResetPasswordToken();
  await user.save();

  try {
    const resetUrl = `${req.protocol}://${req.get('host')}/resetpassword/${resetToken}`;
    console.log(`\n\n[EMAIL MOCK] Password reset link for ${user.email}:\n${resetUrl}\n\n`);

    res.status(200).json({ success: true, message: 'Email sent (mocked in console)' });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.status(500);
    throw new Error('Email could not be sent');
  }
});

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid token');
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Upload profile image
// @route   POST /api/auth/profile/image
// @access  Private
const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image file provided');
  }

  const imagekit = require('../../config/imagekit');

  try {
    const result = await imagekit.upload({
      file: req.file.buffer.toString('base64'),
      fileName: `profile_${req.user._id}_${Date.now()}`,
      folder: '/inventory_profiles',
    });

    const user = await User.findById(req.user._id);
    user.profileImage = result.url;
    await user.save();

    res.json({ message: 'Profile image updated successfully', profileImage: result.url });
  } catch (error) {
    res.status(500);
    throw new Error('Failed to upload image to ImageKit');
  }
});

module.exports = { 
  authUser, 
  getUserProfile, 
  uploadProfileImage,
  generate2FA, 
  enable2FA, 
  verify2FALogin,
  forgotPassword,
  resetPassword,
  logoutUser
};
