const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getCustomerOrders,
  getAllOrdersAdmin,
  getOrderById,
  updateOrderStatus,
} = require('../controllers/orderController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/my-orders', authenticateToken, getCustomerOrders);
router.get('/admin/all', authenticateToken, requireRole(['admin', 'sales_rep']), getAllOrdersAdmin);
router.get('/:id', authenticateToken, getOrderById);
router.patch(
  '/:id/status',
  authenticateToken,
  requireRole(['admin', 'sales_rep']),
  body('status').isString().notEmpty(),
  validate,
  updateOrderStatus
);

module.exports = router;
