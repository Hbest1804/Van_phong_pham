import { AppError } from '../utils/AppError.js';
import { errorResponse } from '../utils/response.js';
import { env } from '../config/env.js';

/**
 * Global error handler middleware — phải đặt SAU tất cả routes trong app.js
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Lỗi từ express-validator (validationResult) — đã được validate.middleware bắt
  // Lỗi AppError: lỗi nghiệp vụ có statusCode rõ ràng
  if (err instanceof AppError) {
    return errorResponse(res, {
      statusCode: err.statusCode,
      message: err.message,
    });
  }

  // Lỗi JWT
  if (err && err.name === 'JsonWebTokenError') {
    return errorResponse(res, { statusCode: 401, message: 'Token không hợp lệ.' });
  }
  if (err && err.name === 'TokenExpiredError') {
    return errorResponse(res, { statusCode: 401, message: 'Token đã hết hạn.' });
  }

  // Lỗi Supabase / PostgreSQL unique constraint
  if (err && err.code === '23505') {
    return errorResponse(res, { statusCode: 409, message: 'Dữ liệu đã tồn tại (duplicate).' });
  }

  // Lỗi không mong đợi — log đầy đủ, chỉ trả message chung về client
  console.error('[ErrorHandler]', err);

  return errorResponse(res, {
    statusCode: 500,
    message:
      env.NODE_ENV === 'development'
        ? err.message
        : 'Đã xảy ra lỗi phía máy chủ. Vui lòng thử lại sau.',
  });
}
