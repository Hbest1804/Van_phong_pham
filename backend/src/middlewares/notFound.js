import { errorResponse } from '../utils/response.js';

/**
 * Middleware bắt các route không tồn tại → trả 404
 */
export function notFound(req, res) {
  return errorResponse(res, {
    statusCode: 404,
    message: `Không tìm thấy route: ${req.method} ${req.originalUrl}`,
  });
}
