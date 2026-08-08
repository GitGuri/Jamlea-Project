const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, getMe, createStaffUser } = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const emailPasswordRules = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

router.post('/register', emailPasswordRules, validate, register);
router.post('/login', emailPasswordRules, validate, login);
router.get('/me', authenticateToken, getMe);
router.post(
  '/staff',
  authenticateToken,
  requireRole(['admin']),
  emailPasswordRules,
  validate,
  createStaffUser
);

module.exports = router;
