const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { createPayment, getAllPaymentsAdmin, updatePaymentStatus } = require('../controllers/paymentController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const createPaymentRules = [
  body('order_id').isUUID().withMessage('A valid order_id is required'),
  body('method').isString().notEmpty().withMessage('Payment method is required'),
  body('reference').isString().notEmpty().withMessage('Reference number is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
];

router.post('/', authenticateToken, createPaymentRules, validate, createPayment);
router.get('/admin/all', authenticateToken, requireRole(['admin', 'sales_rep']), getAllPaymentsAdmin);
router.patch(
  '/:id/status',
  authenticateToken,
  requireRole(['admin', 'sales_rep']),
  body('status').isIn(['approved', 'rejected']),
  validate,
  updatePaymentStatus
);

module.exports = router;
