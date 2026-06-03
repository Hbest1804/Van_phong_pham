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
 * Middleware xác thực người dùng đã đăng nhập (JWT) HOẶC phiên khách (Guest session).
 * Dùng cho các endpoint AI tư vấn.
 */
export function authenticateUserOrGuest(req, _res, next) {
  const authHeader = req.headers.authorization;

  // 1. Kiểm tra nếu có token JWT (Thành viên)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyAccessToken(token);
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      req.isGuest = false;
      return next();
    } catch (err) {
      // Nếu gửi token lỗi/hết hạn thì báo lỗi luôn chứ không bỏ qua để sang guest
      return next(err);
    }
  }

  // 2. Kiểm tra nếu có Guest Session ID
  const guestSessionId = req.headers['x-guest-session-id'];
  if (!guestSessionId) {
    return next(
      new AppError('Phiên truy cập không hợp lệ. Vui lòng cung cấp mã phiên khách hoặc đăng nhập.', 401)
    );
  }

  // Validate định dạng UUID v4/v1 của guestSessionId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(guestSessionId)) {
    return next(new AppError('Mã phiên khách không đúng định dạng.', 400));
  }

  // Gắn thông tin guest (user.id = null, guestSessionId)
  req.user = { id: null, guestSessionId };
  req.isGuest = true;
  next();
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
