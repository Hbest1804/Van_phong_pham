/**
 * Custom Error class để phân biệt lỗi nghiệp vụ (4xx) với lỗi hệ thống (5xx).
 * statusCode mặc định là 500.
 */
export class AppError extends Error {
  /**
   * @param {string} message  - Thông điệp lỗi hiển thị cho client
   * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 409, 422, 500…)
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // lỗi đã được xử lý, không crash server

    Error.captureStackTrace(this, this.constructor);
  }
}
