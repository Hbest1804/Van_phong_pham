import * as adminUserService from '../services/adminUser.service.js';
import { successResponse } from '../utils/response.js';

/**
 * GET /api/v1/admin/users
 * Lấy danh sách tài khoản khách hàng
 *
 * Query params: page, limit, search, status, sortBy, sortOrder
 */
export async function getUsers(req, res, next) {
  try {
    const result = await adminUserService.getUsers(req.query);

    return successResponse(res, {
      statusCode: 200,
      message: 'Lấy danh sách người dùng thành công.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/users/:id
 * Xem chi tiết một tài khoản khách hàng
 */
export async function getUserById(req, res, next) {
  try {
    const user = await adminUserService.getUserById(req.params.id);

    return successResponse(res, {
      statusCode: 200,
      message: 'Lấy thông tin người dùng thành công.',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/users/:id/status
 * Khóa / mở khóa tài khoản khách hàng
 * Body: { status: 'active' | 'locked' }
 */
export async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await adminUserService.updateUserStatus(id, status);

    const actionLabel = status === 'locked' ? 'Khoá' : 'Mở khoá';

    return successResponse(res, {
      statusCode: 200,
      message: `${actionLabel} tài khoản thành công.`,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}
