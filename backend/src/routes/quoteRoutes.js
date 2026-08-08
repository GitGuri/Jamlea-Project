const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  createQuote,
  getCustomerQuotes,
  getQuoteById,
  convertQuoteToOrder,
} = require('../controllers/quoteController');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

const createQuoteRules = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').isUUID().withMessage('Each item needs a valid product_id'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item needs a quantity of at least 1'),
];

router.post('/', authenticateToken, createQuoteRules, validate, createQuote);
router.get('/my-quotes', authenticateToken, getCustomerQuotes);
router.get('/:quoteId', authenticateToken, getQuoteById);
router.post('/:quoteId/convert', authenticateToken, convertQuoteToOrder);

module.exports = router;
