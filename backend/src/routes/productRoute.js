const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

// multer's own errors (bad file type from fileFilter, LIMIT_FILE_SIZE, etc.)
// have no `.status`, so the app-wide errorHandler would genericize them to a
// 500 "Internal server error" -- these are client input problems, not server
// bugs, so surface the real message as a 400 instead.
function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

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

const updateProductRules = [
  body('sku').optional().isString().notEmpty(),
  body('name').optional().isString().notEmpty(),
  body('category').optional().isString().notEmpty(),
  body('unit_price').optional().isFloat({ min: 0 }),
  body('stock_quantity').optional().isInt({ min: 0 }),
  body('availability').optional().isIn(['local', 'national', 'global']),
  body('lead_time_days').optional().isInt({ min: 0 }),
  body('min_order_qty').optional().isInt({ min: 1 }),
];

router.post(
  '/upload-image',
  authenticateToken,
  requireRole(['admin', 'sales_rep']),
  handleUpload,
  uploadProductImage
);
router.get('/', authenticateToken, getAllProducts);
router.get('/:id', authenticateToken, getProductById);
router.post('/', authenticateToken, requireRole(['admin', 'sales_rep']), createProductRules, validate, createProduct);
router.patch('/:id', authenticateToken, requireRole(['admin', 'sales_rep']), updateProductRules, validate, updateProduct);
router.delete('/:id', authenticateToken, requireRole(['admin', 'sales_rep']), deleteProduct);

module.exports = router;
