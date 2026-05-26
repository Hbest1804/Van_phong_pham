/**
 * Helper gửi JSON response theo chuẩn nhất quán:
 *
 * Thành công:
 *   { success: true, message, data }
 *
 * Lỗi (dùng errorResponse hoặc errorHandler middleware):
 *   { success: false, message, errors? }
 */

/**
 * @param {import('express').Response} res
 * @param {object}  options
 * @param {number}  options.statusCode  - HTTP status (mặc định 200)
 * @param {string}  options.message     - Thông điệp trả về
 * @param {*}       [options.data]      - Dữ liệu trả về (tuỳ chọn)
 */
export function successResponse(res, { statusCode = 200, message, data } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== undefined && { data }),
  });
}

/**
 * @param {import('express').Response} res
 * @param {object}  options
 * @param {number}  options.statusCode  - HTTP status (mặc định 400)
 * @param {string}  options.message     - Thông điệp lỗi
 * @param {Array}   [options.errors]    - Danh sách lỗi validation (tuỳ chọn)
 */
export function errorResponse(res, { statusCode = 400, message, errors } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
}
