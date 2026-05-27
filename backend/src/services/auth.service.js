import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';

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

  // Dạng "7d", "12h", "60m", "30s", "1w"
  const match = str.match(/^(\d+)\s*([a-zA-Z]+)$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit  = match[2].toLowerCase();
    if (unit.startsWith('w')) return value * 7 * 86_400_000;
    if (unit.startsWith('d')) return value * 86_400_000;
    if (unit.startsWith('h')) return value * 3_600_000;
    if (unit.startsWith('m')) return value * 60_000;
    if (unit.startsWith('s')) return value * 1_000;
  }

  // Dạng thuần số giây (e.g. "604800")
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10) * 1_000;
  }

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
    throw new AppError('Lỗi đăng nhập. Vui lòng thử lại.', 500);
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
 * POST /api/v1/auth/refresh-token
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
    // Token Reuse Detection: Nếu JWT hợp lệ nhưng không có trong DB
    // => Token đã bị dùng (xoá) hoặc thu hồi => Dấu hiệu bị đánh cắp.
    // Thu hồi toàn bộ refresh tokens của user này để bảo vệ.
    if (payload && payload.id) {
      await supabaseAdmin
        .from('refresh_tokens')
        .delete()
        .eq('user_id', payload.id);
    }
    throw new AppError('Refresh token không tồn tại hoặc đã bị thu hồi. Đã đăng xuất khỏi tất cả thiết bị.', 401);
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

  // 5. Token Rotation — cập nhật token cũ thành token mới trong một thao tác duy nhất (atomic)
  const newAccessToken  = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const newRefreshToken = signRefreshToken({ id: user.id });

  const { error: updateError } = await supabaseAdmin
    .from('refresh_tokens')
    .update({
      token_hash: hashToken(newRefreshToken),
      expires_at: calcRefreshExpiry(),
    })
    .eq('id', storedToken.id);

  if (updateError) {
    console.error('[auth.service] Lỗi cập nhật refresh token (refresh):', updateError.message);
    throw new AppError('Lỗi xác thực token. Vui lòng thử lại.', 500);
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

/**
 * Thu hồi refresh token khi đăng xuất
 * @param {string} rawRefreshToken
 */
export async function logout(rawRefreshToken) {
  const tokenHash = hashToken(rawRefreshToken);
  await supabaseAdmin
    .from('refresh_tokens')
    .delete()
    .eq('token_hash', tokenHash);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 2.4 Quên mật khẩu — gửi link đặt lại qua email
 * POST /api/v1/auth/forgot-password
 *
 * Luồng bảo mật:
 *  1. Tìm user theo email (luôn trả 200 để không lộ email tồn tại hay không)
 *  2. Tạo reset token ngẫu nhiên (32 bytes hex) — lưu HASH vào DB
 *  3. Xây dựng reset URL dẫn về frontend
 *  4. Gửi email chứa link reset
 *
 * @param {{ email: string }} dto
 */
export async function forgotPassword({ email }) {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Tìm user (không throw nếu không tìm thấy — tránh user enumeration)
  const { data: user, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('id, email, name, status')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (lookupError) {
    throw new AppError('Lỗi hệ thống. Vui lòng thử lại.', 500);
  }

  // Luôn trả thành công để không tiết lộ email có tồn tại không
  if (!user) return;

  // Tài khoản bị khoá thì cũng silently bỏ qua
  if (user.status === 'locked') return;

  // 2. Tạo raw token + hash
  const rawToken  = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(
    Date.now() + env.RESET_TOKEN_EXPIRES_MIN * 60 * 1000,
  ).toISOString();

  // 3. Xoá token reset cũ của user (nếu có) rồi lưu token mới
  await supabaseAdmin
    .from('password_reset_tokens')
    .delete()
    .eq('user_id', user.id);

  const { error: insertError } = await supabaseAdmin
    .from('password_reset_tokens')
    .insert({
      user_id:    user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

  if (insertError) {
    console.error('[auth.service] Lỗi lưu reset token:', insertError.message);
    throw new AppError('Không thể tạo yêu cầu đặt lại mật khẩu. Vui lòng thử lại.', 500);
  }

  // 4. Gửi email bất đồng bộ — tránh timing attack (user enumeration) và tăng tốc độ phản hồi
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  sendPasswordResetEmail({
    to:       user.email,
    name:     user.name,
    resetUrl,
  }).catch((err) => {
    console.error('[auth.service] Lỗi gửi email reset password:', err.message);
  });
}

// ────────────────────────────────────────────────────────────────────────────

/**
 * 2.5 Đặt lại mật khẩu bằng token từ email
 * POST /api/v1/auth/reset-password
 *
 * Luồng:
 *  1. Hash token nhận từ client, tra cứu trong DB
 *  2. Kiểm tra token hợp lệ và chưa hết hạn
 *  3. Hash mật khẩu mới và cập nhật vào bảng users
 *  4. Xóa token đã dùng (một lần duy nhất)
 *
 * @param {{ token: string, password: string }} dto
 */
export async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);

  // 1. Tra cứu token trong DB
  const { data: resetToken, error: lookupError } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('user_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (lookupError) {
    throw new AppError('Lỗi hệ thống. Vui lòng thử lại.', 500);
  }

  if (!resetToken) {
    throw new AppError('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.', 400);
  }

  // 2. Kiểm tra hết hạn
  if (new Date(resetToken.expires_at) < new Date()) {
    await supabaseAdmin
      .from('password_reset_tokens')
      .delete()
      .eq('token_hash', tokenHash);
    throw new AppError('Link đặt lại mật khẩu đã hết hạn.', 400);
  }

  // 3. Xóa token đã dùng trước (delete-first pattern để tránh replay attacks)
  const { error: deleteError } = await supabaseAdmin
    .from('password_reset_tokens')
    .delete()
    .eq('user_id', resetToken.user_id);

  if (deleteError) {
    console.error('[auth.service] Lỗi xóa reset token:', deleteError.message);
    throw new AppError('Không thể hoàn tất quá trình đặt lại mật khẩu. Vui lòng thử lại.', 500);
  }

  // 4. Hash mật khẩu mới và cập nhật vào bảng users
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ password_hash })
    .eq('id', resetToken.user_id);

  if (updateError) {
    console.error('[auth.service] Lỗi cập nhật mật khẩu:', updateError.message);
    throw new AppError('Không thể cập nhật mật khẩu. Vui lòng thử lại.', 500);
  }
}
