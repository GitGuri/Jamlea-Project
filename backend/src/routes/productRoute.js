const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
} = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const createProductRules = [
  body('sku').isString().notEmpty(),
  body('name').isString().notEmpty(),
  body('category').isString().notEmpty(),
  body('unit_price').isFloat({ min: 0 }),
  body('stock_quantity').isInt({ min: 0 }),
  body('availability').isIn(['local', 'national', 'global']),
  body('lead_time_days').isInt({ min: 0 }),
  body('min_order_qty').isInt({ min: 1 }),
];

router.get('/', authenticateToken, getAllProducts);
router.get('/:id', authenticateToken, getProductById);
router.post('/', authenticateToken, requireRole(['admin', 'sales_rep']), createProductRules, validate, createProduct);
router.patch('/:id', authenticateToken, requireRole(['admin', 'sales_rep']), updateProduct);

module.exports = router;
