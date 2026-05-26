import * as authService from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';

/**
 * POST /api/v1/auth/register
 * Body: { email, password, name, phone?, address? }
 */
export async function register(req, res, next) {
  try {
    const { email, password, name, phone, address } = req.body;

    const result = await authService.register({ email, password, name, phone, address });

    // Gửi refresh token qua HttpOnly cookie (bảo mật hơn lưu localStorage)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 ngày (ms)
    });

    return successResponse(res, {
      statusCode: 201,
      message: 'Đăng ký tài khoản thành công!',
      data: {
        user:        result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    // Gửi refresh token qua HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    return successResponse(res, {
      statusCode: 200,
      message: 'Đăng nhập thành công!',
      data: {
        user:        result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}
