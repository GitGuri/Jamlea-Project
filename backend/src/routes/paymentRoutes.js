const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const router = express.Router();
const {
  createPayment,
  getAllPaymentsAdmin,
  updatePaymentStatus,
  uploadPaymentProof,
} = require('../controllers/paymentController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const createPaymentRules = [
  body('order_id').isUUID().withMessage('A valid order_id is required'),
  body('method').isString().notEmpty().withMessage('Payment method is required'),
  body('reference').isString().notEmpty().withMessage('Reference number is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
];

// Proof of payment is a screenshot/scan of a bank confirmation -- image or
// PDF, same size cap as the product-import upload.
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf') {
      return cb(new Error('Only images or PDF files are allowed'));
    }
    cb(null, true);
  },
});
function handleProofUpload(req, res, next) {
  proofUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

router.post('/', authenticateToken, createPaymentRules, validate, createPayment);
router.post('/upload-proof', authenticateToken, handleProofUpload, uploadPaymentProof);
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
