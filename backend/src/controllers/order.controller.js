import * as orderService from '../services/order.service.js';
import { successResponse } from '../utils/response.js';

/**
 * POST /api/v1/orders
 * Tạo đơn hàng mới từ giỏ hàng hiện tại của người dùng.
 * Body: { address, paymentMethod?, note? }
 */
export async function createOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { address, paymentMethod, note } = req.body;

    const order = await orderService.createOrder(userId, { address, paymentMethod, note });

    return successResponse(res, {
      statusCode: 201,
      message: 'Đặt hàng thành công!',
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/orders/my
 * Lấy danh sách đơn hàng của người dùng đang đăng nhập.
 * Query: ?page=1&limit=10
 */
export async function getMyOrders(req, res, next) {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;

    const result = await orderService.getMyOrders(userId, { page, limit });

    return successResponse(res, {
      statusCode: 200,
      message: 'Lấy danh sách đơn hàng thành công!',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/orders/:id
 * Lấy chi tiết một đơn hàng.
 * - User chỉ xem được đơn của mình.
 * - Admin xem được tất cả.
 */
export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    const requester = req.user;

    const order = await orderService.getOrderById(id, requester);

    return successResponse(res, {
      statusCode: 200,
      message: 'Lấy chi tiết đơn hàng thành công!',
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/orders
 * Lấy tất cả đơn hàng — chỉ dành cho Admin.
 * Query: ?page=1&limit=10&status=pending
 */
export async function getAllOrders(req, res, next) {
  try {
    const { page, limit, status } = req.query;

    const result = await orderService.getAllOrders({ page, limit, status });

    return successResponse(res, {
      statusCode: 200,
      message: 'Lấy tất cả đơn hàng thành công!',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/orders/:id/status
 * Cập nhật trạng thái đơn hàng — chỉ dành cho Admin.
 * Body: { status: 'shipping' | 'completed' | 'cancelled' }
 */
export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await orderService.updateOrderStatus(id, status);

    return successResponse(res, {
      statusCode: 200,
      message: 'Cập nhật trạng thái đơn hàng thành công!',
      data: order,
    });
  } catch (err) {
    next(err);
  }
}
