import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Tạo Access Token (ngắn hạn, 15m)
 * @param {{ id: string, email: string, role: string }} payload
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

/**
 * Tạo Refresh Token (dài hạn, 7d)
 * @param {{ id: string }} payload
 */
export function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Xác thực Access Token
 * @param {string} token
 * @returns {{ id, email, role, iat, exp }}
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Xác thực Refresh Token
 * @param {string} token
 * @returns {{ id, iat, exp }}
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}
