import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as cartController from '../controllers/cart.controller.js';

const router = Router();

// 🔒 Tất cả cart routes đều yêu cầu xác thực
router.use(authenticate);

// ── Validation rules ──────────────────────────────────────────────────────────

const addToCartRules = [
  body('productId')
    .trim()
    .notEmpty().withMessage('Mã sản phẩm không được để trống.')
    .isUUID().withMessage('Mã sản phẩm không hợp lệ.'),

  body('quantity')
    .optional()
    .isInt({ min: 1 }).withMessage('Số lượng phải là số nguyên lớn hơn 0.'),
];

const productIdRules = [
  param('productId')
    .isUUID().withMessage('Mã sản phẩm không hợp lệ.'),
];

const updateCartRules = [
  ...productIdRules,
  body('quantity')
    .notEmpty().withMessage('Số lượng không được để trống.')
    .isInt({ min: 1 }).withMessage('Số lượng phải là số nguyên lớn hơn 0.'),
];

const bulkSyncRules = [
  body('items')
    .isArray().withMessage('Danh sách sản phẩm phải là một mảng.'),
  body('items.*.productId')
    .trim()
    .notEmpty().withMessage('Mã sản phẩm không được để trống.')
    .isUUID().withMessage('Mã sản phẩm không hợp lệ.'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Số lượng phải là số nguyên lớn hơn 0.'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/cart
 * Lấy toàn bộ sản phẩm trong giỏ hàng của người dùng.
 */
router.get('/', cartController.getCart);

/**
 * POST /api/v1/cart
 * Thêm sản phẩm vào giỏ hàng hoặc tăng số lượng nếu đã có.
 * Body: { productId: string (UUID), quantity?: number }
 */
router.post('/', addToCartRules, validate, cartController.addToCart);

/**
 * POST /api/v1/cart/bulk-sync
 * Đồng bộ giỏ hàng bulk từ local/guest khi login.
 * Body: { items: [{ productId, quantity }] }
 */
router.post('/bulk-sync', bulkSyncRules, validate, cartController.bulkSync);

/**
 * PUT /api/v1/cart/:productId
 * Cập nhật số lượng sản phẩm trong giỏ hàng.
 * Body: { quantity: number }
 */
router.put('/:productId', updateCartRules, validate, cartController.updateCartItem);

/**
 * DELETE /api/v1/cart/:productId
 * Xoá một sản phẩm khỏi giỏ hàng.
 */
router.delete('/:productId', productIdRules, validate, cartController.removeCartItem);

/**
 * DELETE /api/v1/cart
 * Xoá toàn bộ giỏ hàng của người dùng.
 */
router.delete('/', cartController.clearCart);

export default router;
