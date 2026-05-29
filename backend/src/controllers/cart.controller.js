import * as cartService from '../services/cart.service.js';
import { successResponse } from '../utils/response.js';

/**
 * GET /api/v1/cart
 * Lấy toàn bộ sản phẩm trong giỏ hàng của người dùng hiện tại.
 * Yêu cầu: đã xác thực (authenticate middleware).
 */
export async function getCart(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await cartService.getCart(userId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Lấy giỏ hàng thành công!',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/cart
 * Thêm sản phẩm vào giỏ hàng.
 * Nếu sản phẩm đã có → cộng dồn số lượng.
 * Yêu cầu: đã xác thực (authenticate middleware).
 * Body: { productId, quantity? }
 */
export async function addToCart(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    const result = await cartService.addToCart(userId, productId, quantity ?? 1);

    return successResponse(res, {
      statusCode: 201,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/cart/:cartItemId
 * Cập nhật số lượng sản phẩm trong giỏ hàng.
 * Body: { quantity: number }
 */
export async function updateCartItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    const result = await cartService.updateCartItem(userId, cartItemId, quantity);

    return successResponse(res, {
      statusCode: 200,
      message: 'Cập nhật số lượng thành công!',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/cart/:cartItemId
 * Xoá một sản phẩm khỏi giỏ hàng.
 */
export async function removeCartItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    await cartService.removeCartItem(userId, cartItemId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Đã xoá sản phẩm khỏi giỏ hàng.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/cart
 * Xoá toàn bộ giỏ hàng của người dùng.
 */
export async function clearCart(req, res, next) {
  try {
    const userId = req.user.id;

    await cartService.clearCart(userId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Đã xoá toàn bộ giỏ hàng.',
    });
  } catch (err) {
    next(err);
  }
}
