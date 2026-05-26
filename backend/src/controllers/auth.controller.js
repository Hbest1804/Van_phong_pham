import * as authService from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';
import { env } from '../config/env.js';

// Cookie options dùng chung — maxAge đồng bộ với JWT_REFRESH_EXPIRES_IN trong .env
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure:   env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   authService.refreshCookieMaxAge(),
  };
}

/**
 * POST /api/v1/auth/register
 * Body: { email, password, name, phone?, address? }
 */
export async function register(req, res, next) {
  try {
    const { email, password, name, phone, address } = req.body;

    const result = await authService.register({ email, password, name, phone, address });

    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions());

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

    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions());

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

/**
 * POST /api/v1/auth/refresh-token
 * Cookie: refreshToken (HttpOnly)
 * Trả về access token mới + xoay refresh token (token rotation)
 */
export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy refresh token. Vui lòng đăng nhập lại.',
      });
    }

    const result = await authService.refresh(token);

    // Ghi đè cookie với token mới (rotation)
    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions());

    return successResponse(res, {
      statusCode: 200,
      message: 'Làm mới token thành công!',
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
 * POST /api/v1/auth/logout
 */
export async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await authService.logout(token);
    }

    res.clearCookie('refreshToken', refreshCookieOptions());

    return successResponse(res, {
      statusCode: 200,
      message: 'Đăng xuất thành công!',
    });
  } catch (err) {
    next(err);
  }
}
