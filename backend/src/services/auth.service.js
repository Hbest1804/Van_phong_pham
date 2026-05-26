import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

const SALT_ROUNDS = 12;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Hash refresh token trước khi lưu vào DB (bảo mật: không lưu raw token)
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Tính thời điểm hết hạn của refresh token từ JWT_REFRESH_EXPIRES_IN ('7d', '30d', …)
 */
function calcRefreshExpiry() {
  const raw = env.JWT_REFRESH_EXPIRES_IN; // e.g. '7d'
  const unit = raw.slice(-1);             // 'd' | 'h' | 'm'
  const value = parseInt(raw);

  const ms =
    unit === 'd' ? value * 86400000 :
    unit === 'h' ? value * 3600000  :
                   value * 60000;

  return new Date(Date.now() + ms).toISOString();
}

// ── Service Functions ────────────────────────────────────────────────────────

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
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existing) {
    throw new AppError('Email này đã được sử dụng. Vui lòng chọn email khác.', 409);
  }

  // 2. Hash mật khẩu
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // 3. Tạo user mới trong bảng users
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
    throw new AppError('Không thể tạo tài khoản. Vui lòng thử lại.', 500);
  }

  // 4. Tạo JWT tokens
  const accessToken  = signAccessToken({ id: newUser.id, email: newUser.email, role: newUser.role });
  const refreshToken = signRefreshToken({ id: newUser.id });

  // 5. Lưu refresh token (dạng hash) vào bảng refresh_tokens
  const { error: tokenError } = await supabaseAdmin
    .from('refresh_tokens')
    .insert({
      user_id:    newUser.id,
      token_hash: hashToken(refreshToken),
      expires_at: calcRefreshExpiry(),
    });

  if (tokenError) {
    // Không block đăng ký — chỉ log, user vẫn nhận token
    console.error('[auth.service] Lỗi lưu refresh token:', tokenError.message);
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

  // 1. Tìm user theo email (lấy cả password_hash để so sánh)
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, password_hash, name, role, status, phone, address, created_at')
    .eq('email', email.toLowerCase())
    .maybeSingle();

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

  // 5. Lưu refresh token mới (hash) vào bảng refresh_tokens
  const { error: tokenError } = await supabaseAdmin
    .from('refresh_tokens')
    .insert({
      user_id:    user.id,
      token_hash: hashToken(refreshToken),
      expires_at: calcRefreshExpiry(),
    });

  if (tokenError) {
    console.error('[auth.service] Lỗi lưu refresh token khi login:', tokenError.message);
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

