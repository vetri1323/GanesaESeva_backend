const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const path = require('path');
const { uploadAvatar } = require('../utils/fileUpload');

// Get the current directory path
const __dirname = path.resolve();

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/profile/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Update user profile
// @route   PUT /api/profile
// @access  Private
router.put(
  '/',
  protect,
  uploadAvatar,
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
  ],
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Build profile fields
      const profileFields = {
        name,
        email,
      };

      // Handle file upload
      if (req.file) {
        // Construct the URL to the uploaded file
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const filePath = path.join('avatars', path.basename(req.file.path));
        profileFields.avatar = `${baseUrl}/uploads/${filePath}`.replace(/\\/g, '/');
      }

      // If password is provided, hash it
      if (password) {
        const salt = await bcrypt.genSalt(10);
        profileFields.password = await bcrypt.hash(password, salt);
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: profileFields },
        { new: true, runValidators: true }
      ).select('-password');

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Profile update error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          success: false,
          message: 'Email already exists' 
        });
      }
      res.status(500).json({ 
        success: false,
        message: 'Server Error' 
      });
    }
  }
);

// @desc    Upload user avatar
// @route   POST /api/profile/avatar
// @access  Private
router.post(
  '/avatar',
  protect,
  uploadAvatar,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a file'
        });
      }

      // Construct the URL to the uploaded file
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const filePath = path.join('avatars', path.basename(req.file.path));
      const fileUrl = `${baseUrl}/uploads/${filePath}`.replace(/\\/g, '/');

      // Update user with new avatar
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { avatar: fileUrl },
        { new: true, runValidators: true }
      ).select('-password');

      res.json({
        success: true,
        data: fileUrl
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading avatar'
      });
    }
  }
);

module.exports = router;
