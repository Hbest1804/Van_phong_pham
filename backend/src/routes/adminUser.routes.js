import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as adminUserController from '../controllers/adminUser.controller.js';

const router = Router();

// ── Áp dụng authenticate + authorize('admin') cho toàn bộ router ─────────────
router.use(authenticate, authorize('admin'));

// ── Validation rules ──────────────────────────────────────────────────────────

const getUsersQueryRules = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page phải là số nguyên dương.'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit phải từ 1 đến 100.'),

  query('status')
    .optional()
    .isIn(['active', 'locked']).withMessage("status chỉ chấp nhận 'active' hoặc 'locked'."),

  query('sortBy')
    .optional()
    .isIn(['created_at', 'name', 'email', 'status']).withMessage("sortBy không hợp lệ."),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage("sortOrder phải là 'asc' hoặc 'desc'."),
];

const userIdRules = [
  param('id')
    .isUUID().withMessage('ID người dùng không hợp lệ.'),
];

const updateStatusRules = [
  param('id')
    .isUUID().withMessage('ID người dùng không hợp lệ.'),

  body('status')
    .notEmpty().withMessage('Trạng thái không được để trống.')
    .isIn(['active', 'locked']).withMessage("status chỉ chấp nhận 'active' hoặc 'locked'."),
];

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/users
 * Lấy danh sách tài khoản khách hàng
 * Query: page, limit, search, status, sortBy, sortOrder
 */
router.get('/', getUsersQueryRules, validate, adminUserController.getUsers);

/**
 * GET /api/v1/admin/users/:id
 * Xem chi tiết một tài khoản khách hàng
 */
router.get('/:id', userIdRules, validate, adminUserController.getUserById);

/**
 * PATCH /api/v1/admin/users/:id/status
 * Khóa / mở khóa tài khoản
 * Body: { status: 'active' | 'locked' }
 */
router.patch('/:id/status', updateStatusRules, validate, adminUserController.updateUserStatus);

export default router;
