const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { getReviews, resolve } = require('../controllers/adminReviewController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/', authenticateToken, requireRole(['admin', 'sales_rep']), getReviews);
router.post(
  '/:id/resolve',
  authenticateToken,
  requireRole(['admin', 'sales_rep']),
  body('action').isString().notEmpty(),
  validate,
  resolve
);

module.exports = router;
