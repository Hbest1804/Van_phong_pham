import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/response.js';

/**
 * Middleware chạy sau các express-validator chains.
 * Nếu có lỗi → trả 422 và danh sách lỗi, không cho đi tiếp.
 *
 * Cách dùng:
 *   router.post('/register', [...validators], validate, controller)
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, {
      statusCode: 422,
      message: 'Dữ liệu không hợp lệ.',
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}
