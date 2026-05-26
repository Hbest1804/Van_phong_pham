import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

const SALT_ROUNDS = 12;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Hash refresh token trước khi lưu vào DB (bảo mật: không lưu raw token)
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parse JWT_REFRESH_EXPIRES_IN ('7d', '30d', '12h', '60m', '3600'…)
 * thành milliseconds. Fallback về 7 ngày nếu không nhận dạng được.
 */
function parseExpiresInMs(raw) {
  const str = String(raw).trim();

  // Dạng "7d", "12h", "60m", "30s"
  const match = str.match(/^(\d+)\s*([a-zA-Z]+)$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit  = match[2].toLowerCase();
    if (unit.startsWith('d')) return value * 86_400_000;
    if (unit.startsWith('h')) return value * 3_600_000;
    if (unit.startsWith('m')) return value * 60_000;
    if (unit.startsWith('s')) return value * 1_000;
  }

  // Dạng thuần số giây (e.g. "604800")
  const seconds = parseInt(str, 10);
  if (!isNaN(seconds)) return seconds * 1_000;

  // Fallback 7 ngày
  console.warn(`[auth.service] Không parse được JWT_REFRESH_EXPIRES_IN="${raw}", dùng mặc định 7 ngày.`);
  return 7 * 86_400_000;
}

/**
 * Tính thời điểm hết hạn của refresh token dưới dạng ISO string
 */
function calcRefreshExpiry() {
  return new Date(Date.now() + parseExpiresInMs(env.JWT_REFRESH_EXPIRES_IN)).toISOString();
}

/**
 * Cookie maxAge (ms) đồng bộ với JWT_REFRESH_EXPIRES_IN trong .env
 */
export function refreshCookieMaxAge() {
  return parseExpiresInMs(env.JWT_REFRESH_EXPIRES_IN);
}

/**
 * Xoá các refresh token đã hết hạn của một user (tránh bloat DB)
 */
async function purgeExpiredTokens(userId) {
  const { error } = await supabaseAdmin
    .from('refresh_tokens')
    .delete()
    .eq('user_id', userId)
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('[auth.service] Lỗi xoá expired tokens:', error.message);
  }
}

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * 2.1 Đăng ký tài khoản mới
 * POST /api/v1/auth/register
 *
 * @param {{ email, password, name, phone?, address? }} dto
 * @returns {{ user, accessToken, refreshToken }}
 */
export async function register(dto) {
  const { email, password, name, phone, address } = dto;

  // 1. Kiểm tra email đã tồn tại chưa
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (lookupError) {
    throw new AppError('Lỗi kiểm tra email. Vui lòng thử lại.', 500);
  }
  if (existing) {
    throw new AppError('Email này đã được sử dụng. Vui lòng chọn email khác.', 409);
  }

  // 2. Hash mật khẩu
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // 3. Tạo user mới
  const { data: newUser, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      email: email.toLowerCase(),
      password_hash,
      name: name.trim(),
      role: 'user',
      status: 'active',
      ...(phone   && { phone   }),
      ...(address && { address }),
    })
    .select('id, email, name, role, status, phone, address, created_at')
    .single();

  if (insertError) {
    console.error('[auth.service] Lỗi tạo user:', insertError.message);
    throw new AppError('Không thể tạo tài khoản. Vui lòng thử lại.', 500);
  }

  // 4. Tạo JWT tokens
  const accessToken  = signAccessToken({ id: newUser.id, email: newUser.email, role: newUser.role });
  const refreshToken = signRefreshToken({ id: newUser.id });

  // 5. Lưu refresh token (hash) vào DB
  const { error: tokenError } = await supabaseAdmin
    .from('refresh_tokens')
    .insert({
      user_id:    newUser.id,
      token_hash: hashToken(refreshToken),
      expires_at: calcRefreshExpiry(),
    });

  if (tokenError) {
    // Không block đăng ký — chỉ log
    console.error('[auth.service] Lỗi lưu refresh token (register):', tokenError.message);
  }

  return {
    user: {
      id:        newUser.id,
      email:     newUser.email,
      name:      newUser.name,
      role:      newUser.role,
      status:    newUser.status,
      phone:     newUser.phone   || null,
      address:   newUser.address || null,
      createdAt: newUser.created_at,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * 2.2 Đăng nhập
 * POST /api/v1/auth/login
 *
 * @param {{ email, password }} dto
 * @returns {{ user, accessToken, refreshToken }}
 */
export async function login(dto) {
  const { email, password } = dto;

  // 1. Tìm user theo email
  const { data: user, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('id, email, password_hash, name, role, status, phone, address, created_at')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (lookupError) {
    throw new AppError('Lỗi xác thực. Vui lòng thử lại.', 500);
  }

  // Dùng thông báo chung để không tiết lộ email có tồn tại hay không
  if (!user) {
    throw new AppError('Email hoặc mật khẩu không đúng.', 401);
  }

  // 2. So sánh mật khẩu
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Email hoặc mật khẩu không đúng.', 401);
  }

  // 3. Kiểm tra trạng thái tài khoản
  if (user.status === 'locked') {
    throw new AppError('Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên.', 403);
  }

  // 4. Tạo JWT tokens
  const accessToken  = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ id: user.id });

  // 5. Lưu refresh token mới + dọn dẹp token cũ hết hạn
  await purgeExpiredTokens(user.id);

  const { error: tokenError } = await supabaseAdmin
    .from('refresh_tokens')
    .insert({
      user_id:    user.id,
      token_hash: hashToken(refreshToken),
      expires_at: calcRefreshExpiry(),
    });

  if (tokenError) {
    console.error('[auth.service] Lỗi lưu refresh token (login):', tokenError.message);
  }

  return {
    user: {
      id:        user.id,
      email:     user.email,
      name:      user.name,
      role:      user.role,
      status:    user.status,
      phone:     user.phone   || null,
      address:   user.address || null,
      createdAt: user.created_at,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * 2.3 Làm mới Access Token bằng Refresh Token (token rotation)
 * POST /api/v1/auth/refresh
 *
 * @param {string} rawRefreshToken  — token lấy từ HttpOnly cookie
 * @returns {{ user, accessToken, refreshToken }}
 */
export async function refresh(rawRefreshToken) {
  // 1. Xác thực chữ ký JWT
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn.', 401);
  }

  const tokenHash = hashToken(rawRefreshToken);

  // 2. Tìm token trong DB
  const { data: storedToken, error: lookupError } = await supabaseAdmin
    .from('refresh_tokens')
    .select('id, user_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (lookupError) {
    throw new AppError('Lỗi xác thực token. Vui lòng thử lại.', 500);
  }
  if (!storedToken) {
    throw new AppError('Refresh token không tồn tại hoặc đã bị thu hồi.', 401);
  }

  // 3. Kiểm tra hết hạn trong DB
  if (new Date(storedToken.expires_at) < new Date()) {
    // Xoá luôn token hết hạn
    await supabaseAdmin.from('refresh_tokens').delete().eq('id', storedToken.id);
    throw new AppError('Refresh token đã hết hạn. Vui lòng đăng nhập lại.', 401);
  }

  // 4. Lấy thông tin user
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, status, phone, address, created_at')
    .eq('id', storedToken.user_id)
    .single();

  if (userError || !user) {
    throw new AppError('Tài khoản không tồn tại.', 401);
  }
  if (user.status === 'locked') {
    throw new AppError('Tài khoản của bạn đã bị khoá.', 403);
  }

  // 5. Token Rotation — xoá token cũ, cấp token mới
  const { error: deleteError } = await supabaseAdmin
    .from('refresh_tokens')
    .delete()
    .eq('id', storedToken.id);

  if (deleteError) {
    console.error('[auth.service] Lỗi xoá refresh token cũ:', deleteError.message);
    throw new AppError('Lỗi xác thực token. Vui lòng thử lại.', 500);
  }

  const newAccessToken  = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const newRefreshToken = signRefreshToken({ id: user.id });

  const { error: insertError } = await supabaseAdmin
    .from('refresh_tokens')
    .insert({
      user_id:    user.id,
      token_hash: hashToken(newRefreshToken),
      expires_at: calcRefreshExpiry(),
    });

  if (insertError) {
    console.error('[auth.service] Lỗi lưu refresh token mới (refresh):', insertError.message);
  }

  return {
    user: {
      id:        user.id,
      email:     user.email,
      name:      user.name,
      role:      user.role,
      status:    user.status,
      phone:     user.phone   || null,
      address:   user.address || null,
      createdAt: user.created_at,
    },
    accessToken:  newAccessToken,
    refreshToken: newRefreshToken,
  };
}
