const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { register, login, getMe, createStaffUser } = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const emailPasswordRules = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

// Only guards the credential-guessing surface (register/login). Scoped here
// rather than at the app.js router mount so it doesn't also throttle /me,
// which every page load hits to verify the stored session, or /staff, which
// is already gated behind an authenticated admin.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Default express-rate-limit response is plain text, which the frontend's
  // `err.response?.data?.error` handling can't read -- send JSON so the real
  // reason ("too many attempts") actually reaches the user instead of a
  // generic "something went wrong".
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post('/register', authLimiter, emailPasswordRules, validate, register);
router.post('/login', authLimiter, emailPasswordRules, validate, login);
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
