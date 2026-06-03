import 'dotenv/config';

/**
 * Đọc và validate tất cả biến môi trường cần thiết.
 * Ném lỗi sớm (fail-fast) khi thiếu biến bắt buộc.
 */

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'GEMINI_API_KEY',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`[env] Thiếu biến môi trường bắt buộc: ${key}`);
  }
}

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,


  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // ── SMTP (Nodemailer) ──────────────────────────────────────
  SMTP_HOST:   process.env.SMTP_HOST,
  SMTP_PORT:   parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true', // true chỉ khi dùng port 465
  SMTP_USER:   process.env.SMTP_USER,
  SMTP_PASS:   process.env.SMTP_PASS,

  // ── Reset Token ────────────────────────────────────────────
  // Thời gian hiệu lực link đặt lại mật khẩu (phút)
  RESET_TOKEN_EXPIRES_MIN: parseInt(process.env.RESET_TOKEN_EXPIRES_MIN || '15', 10),
};
