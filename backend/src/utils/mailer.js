import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Tạo Nodemailer transporter từ biến môi trường SMTP_*.
 * Hỗ trợ Gmail (dùng App Password) hoặc bất kỳ SMTP server nào.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host:   env.SMTP_HOST,
    port:   env.SMTP_PORT,
    secure: env.SMTP_SECURE, // true = port 465, false = port 587 + STARTTLS
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

/**
 * Gửi email đặt lại mật khẩu cho người dùng.
 *
 * @param {{ to: string, name: string, resetUrl: string }} opts
 */
export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Đặt lại mật khẩu</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);
                       padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;
                         letter-spacing:-0.5px;">🛒 Văn Phòng Phẩm Online</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Hệ thống quản lý tài khoản
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;">
                Xin chào <strong>${name}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản
                <strong>${to}</strong>. Nhấn nút bên dưới để tiếp tục:
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="border-radius:8px;overflow:hidden;">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 36px;
                              background:linear-gradient(135deg,#6366f1,#8b5cf6);
                              color:#fff;text-decoration:none;font-size:15px;
                              font-weight:600;border-radius:8px;">
                      Đặt lại mật khẩu
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning box -->
              <div style="background:#fef9c3;border:1px solid #fde047;
                          border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;color:#854d0e;font-size:13px;line-height:1.5;">
                  ⚠️ <strong>Lưu ý:</strong> Liên kết này chỉ có hiệu lực trong
                  <strong>15 phút</strong> và chỉ dùng được <strong>một lần</strong>.
                  Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                </p>
              </div>

              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
                Nếu nút không hoạt động, sao chép và dán đường dẫn sau vào trình duyệt:
              </p>
              <p style="margin:8px 0 0;word-break:break-all;">
                <a href="${resetUrl}"
                   style="color:#6366f1;font-size:12px;text-decoration:none;">
                  ${resetUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;
                       padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} Văn Phòng Phẩm Online. Mọi quyền được bảo lưu.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from:    `"Văn Phòng Phẩm Online" <${env.SMTP_USER}>`,
    to,
    subject: '🔑 Đặt lại mật khẩu tài khoản của bạn',
    html,
  });
}
