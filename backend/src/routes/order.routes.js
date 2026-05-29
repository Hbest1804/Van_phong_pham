import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as orderController from '../controllers/order.controller.js';

const router = Router();

// 🔒 Tất cả order routes đều yêu cầu xác thực
router.use(authenticate);

// ── Validation rules ──────────────────────────────────────────────────────────

const createOrderRules = [
  body('address')
    .trim()
    .notEmpty().withMessage('Địa chỉ giao hàng không được để trống.'),

  body('paymentMethod')
    .optional()
    .isIn(['cod', 'transfer']).withMessage('Phương thức thanh toán không hợp lệ. Chỉ chấp nhận: cod, transfer.'),

  body('note')
    .optional()
    .isString().withMessage('Ghi chú phải là chuỗi ký tự.')
    .isLength({ max: 500 }).withMessage('Ghi chú không được vượt quá 500 ký tự.'),
];

const orderIdRules = [
  param('id')
    .isUUID().withMessage('Mã đơn hàng không hợp lệ.'),
];

const updateStatusRules = [
  ...orderIdRules,
  body('status')
    .notEmpty().withMessage('Trạng thái không được để trống.')
    .isIn(['pending', 'shipping', 'completed', 'cancelled'])
    .withMessage('Trạng thái không hợp lệ. Chỉ chấp nhận: pending, shipping, completed, cancelled.'),
];

const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Trang phải là số nguyên lớn hơn 0.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Giới hạn phải là số nguyên từ 1 đến 50.'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/orders
 * Tạo đơn hàng mới từ giỏ hàng hiện tại của người dùng.
 * Body: { address: string, paymentMethod?: 'cod'|'transfer', note?: string }
 */
router.post('/', createOrderRules, validate, orderController.createOrder);

/**
 * GET /api/v1/orders/my
 * Lấy danh sách đơn hàng của người dùng đang đăng nhập.
 * Query: ?page=1&limit=10
 */
router.get('/my', paginationRules, validate, orderController.getMyOrders);

/**
 * GET /api/v1/orders
 * Lấy tất cả đơn hàng — chỉ Admin.
 * Query: ?page=1&limit=10&status=pending
 */
router.get(
  '/',
  authorize('admin'),
  [
    ...paginationRules,
    query('status')
      .optional()
      .isIn(['pending', 'shipping', 'completed', 'cancelled'])
      .withMessage('Trạng thái lọc không hợp lệ.'),
  ],
  validate,
  orderController.getAllOrders
);

/**
 * GET /api/v1/orders/:id
 * Lấy chi tiết một đơn hàng.
 * - User chỉ xem được đơn của mình.
 * - Admin xem được tất cả.
 */
router.get('/:id', orderIdRules, validate, orderController.getOrderById);

/**
 * PATCH /api/v1/orders/:id/status
 * Cập nhật trạng thái đơn hàng — chỉ Admin.
 * Body: { status: 'shipping' | 'completed' | 'cancelled' }
 */
router.patch(
  '/:id/status',
  authorize('admin'),
  updateStatusRules,
  validate,
  orderController.updateOrderStatus
);

export default router;
