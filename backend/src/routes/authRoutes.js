const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  register,
  login,
  oauthComplete,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  getPendingStaffAdmin,
  reviewStaffSignupAdmin,
} = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const emailPasswordRules = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const registerRules = [
  ...emailPasswordRules,
  body('role').optional().isIn(['customer', 'sales_rep']).withMessage("Role must be 'customer' or 'sales_rep'"),
  body('full_name').optional().isString(),
  body('phone').optional().isString(),
];

// Only guards the credential-guessing surface (register/login). Scoped here
// rather than at the app.js router mount so it doesn't also throttle /me,
// which every page load hits to verify the stored session, or /staff/*,
// which is already gated behind an authenticated admin.
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

router.post('/register', authLimiter, registerRules, validate, register);
router.post('/login', authLimiter, emailPasswordRules, validate, login);
router.post(
  '/oauth-complete',
  authLimiter,
  body('access_token').isString().notEmpty(),
  validate,
  oauthComplete
);
router.post(
  '/forgot-password',
  authLimiter,
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  validate,
  forgotPassword
);
router.post(
  '/reset-password',
  authLimiter,
  body('access_token').isString().notEmpty(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
  resetPassword
);
router.get('/me', authenticateToken, getMe);
router.patch('/me', authenticateToken, body('phone').isString().notEmpty(), validate, updateMe);
router.get('/staff/pending', authenticateToken, requireRole(['admin']), getPendingStaffAdmin);
router.patch(
  '/staff/:id/status',
  authenticateToken,
  requireRole(['admin']),
  body('status').isIn(['approved', 'rejected']),
  validate,
  reviewStaffSignupAdmin
);

module.exports = router;
