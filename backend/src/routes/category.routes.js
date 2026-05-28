import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

const createCategoryRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Tên danh mục không được để trống.')
    .isLength({ min: 2, max: 100 }).withMessage('Tên danh mục phải từ 2 đến 100 ký tự.'),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Mô tả tối đa 1000 ký tự.'),
];

/**
 * GET /api/v1/categories
 * Lấy danh sách toàn bộ danh mục sản phẩm
 */
router.get('/', categoryController.getCategories);

/**
 * POST /api/v1/categories
 * Tạo danh mục mới – Yêu cầu quyền Admin
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  createCategoryRules,
  validate,
  categoryController.createCategory
);

const updateCategoryRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Tên danh mục không được để trống.')
    .isLength({ min: 2, max: 100 }).withMessage('Tên danh mục phải từ 2 đến 100 ký tự.'),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Mô tả tối đa 1000 ký tự.'),
];

/**
 * PUT /api/v1/categories/:id
 * Cập nhật tên danh mục – Yêu cầu quyền Admin
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  updateCategoryRules,
  validate,
  categoryController.updateCategory
);

/**
 * DELETE /api/v1/categories/:id
 * Xóa danh mục – Yêu cầu quyền Admin
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  categoryController.deleteCategory
);

export default router;


