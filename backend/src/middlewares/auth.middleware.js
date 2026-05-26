import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

/**
 * Middleware xác thực JWT từ header Authorization: Bearer <token>
 * Gắn req.user = { id, email, role } nếu hợp lệ.
 */
export function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    next(err); // Ném lên errorHandler (JsonWebTokenError / TokenExpiredError)
  }
}

/**
 * Middleware kiểm tra role sau khi đã authenticate.
 * Dùng: router.delete('/:id', authenticate, authorize('admin'), controller)
 *
 * @param {...string} roles - Danh sách role được phép
 */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Chưa xác thực.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Bạn không có quyền thực hiện hành động này.', 403)
      );
    }
    next();
  };
}
