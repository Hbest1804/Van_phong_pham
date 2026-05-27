import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import * as productController from '../controllers/product.controller.js';

const router = Router();

// ── Validation rules ──────────────────────────────────────────────────────────

const createProductRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Tên sản phẩm không được để trống.')
    .isLength({ min: 2, max: 255 }).withMessage('Tên sản phẩm phải từ 2 đến 255 ký tự.'),

  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự.'),

  body('price')
    .notEmpty().withMessage('Giá sản phẩm không được để trống.')
    .isFloat({ min: 0 }).withMessage('Giá sản phẩm phải là số không âm.'),

  body('stock')
    .notEmpty().withMessage('Số lượng tồn kho không được để trống.')
    .isInt({ min: 0 }).withMessage('Số lượng tồn kho phải là số nguyên không âm.'),

  body('categoryId')
    .trim()
    .notEmpty().withMessage('Danh mục không được để trống.')
    .isUUID().withMessage('Mã danh mục không hợp lệ.'),

  body('imageUrl')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL().withMessage('URL hình ảnh không hợp lệ.'),
];

// Tất cả field đều optional cho partial update (PUT)
const updateProductRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Tên sản phẩm không được để trống.')
    .isLength({ min: 2, max: 255 }).withMessage('Tên sản phẩm phải từ 2 đến 255 ký tự.'),

  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự.'),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Giá sản phẩm phải là số không âm.'),

  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Số lượng tồn kho phải là số nguyên không âm.'),

  body('categoryId')
    .optional()
    .trim()
    .isUUID().withMessage('Mã danh mục không hợp lệ.'),

  body('imageUrl')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL().withMessage('URL hình ảnh không hợp lệ.'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive phải là true hoặc false.'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/products
 * Lấy danh sách sản phẩm với các bộ lọc tìm kiếm, danh mục, giá cả và phân trang
 */
router.get('/', productController.getProducts);

/**
 * POST /api/v1/products/upload
 * Tải ảnh sản phẩm lên Supabase Storage – Yêu cầu quyền Admin
 */
router.post(
  '/upload',
  authenticate,
  authorize('admin'),
  uploadMiddleware.single('image'),
  productController.uploadImage
);

/**
 * GET /api/v1/products/:id
 * Lấy chi tiết một sản phẩm
 */
router.get('/:id', productController.getProductById);

/**
 * POST /api/v1/products
 * Tạo sản phẩm mới – Yêu cầu quyền Admin
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  createProductRules,
  validate,
  productController.createProduct,
);

/**
 * PUT /api/v1/products/:id
 * Cập nhật sản phẩm – Yêu cầu quyền Admin
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  updateProductRules,
  validate,
  productController.updateProduct,
);

/**
 * DELETE /api/v1/products/:id
 * Xóa sản phẩm – Yêu cầu quyền Admin
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  productController.deleteProduct,
);

export default router;
