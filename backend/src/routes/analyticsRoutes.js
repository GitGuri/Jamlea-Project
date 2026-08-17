const express = require('express');
const router = express.Router();
const { getAnalyticsSummary } = require('../controllers/analyticsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/admin/summary', authenticateToken, requireRole(['admin', 'sales_rep']), getAnalyticsSummary);

module.exports = router;
