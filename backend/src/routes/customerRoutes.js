const express = require('express');
const router = express.Router();
const { getAllCustomersAdmin, getCustomerDetailAdmin, createCustomerAdmin } = require('../controllers/customerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/admin/all', authenticateToken, requireRole(['admin', 'sales_rep']), getAllCustomersAdmin);
router.post('/admin', authenticateToken, requireRole(['admin', 'sales_rep']), createCustomerAdmin);
router.get('/admin/:id', authenticateToken, requireRole(['admin', 'sales_rep']), getCustomerDetailAdmin);

module.exports = router;
