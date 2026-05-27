import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export function ForgotPassword() {
  const [email, setEmail]         = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading]  = useState(false);
  const [submitted, setSubmitted]  = useState(false); // trạng thái đã gửi thành công

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (!email.trim()) {
      setEmailError('Email không được để trống.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Email không đúng định dạng.');
      return false;
    }
    setEmailError('');
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      // Luôn hiển thị thành công (backend không tiết lộ email có tồn tại hay không)
      setSubmitted(true);
    } catch {
      // Lỗi mạng — vẫn hiện success để không tiết lộ thông tin
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Màn hình xác nhận ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-12 mb-12 px-4">
        <Card>
          <CardContent className="pt-8 pb-8">
            {/* Icon mail */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-bold text-center text-gray-800 mb-3">
              Kiểm tra hộp thư của bạn
            </h2>
            <p className="text-center text-gray-500 text-sm leading-relaxed mb-2">
              Nếu <strong className="text-gray-700">{email}</strong> tồn tại trong hệ thống,
              chúng tôi đã gửi một link đặt lại mật khẩu.
            </p>
            <p className="text-center text-gray-400 text-xs mb-6">
              Link có hiệu lực trong <strong>15 phút</strong>.
              Kiểm tra cả thư mục <strong>Spam</strong> nếu không thấy.
            </p>

            {/* Gửi lại */}
            <button
              type="button"
              onClick={() => { setSubmitted(false); setEmail(''); }}
              className="w-full text-sm text-blue-600 hover:underline text-center"
            >
              Nhập email khác
            </button>
          </CardContent>

          <CardFooter className="flex justify-center text-sm gap-1">
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              ← Quay lại đăng nhập
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Form nhập email ────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto mt-12 mb-12 px-4">
      <Card>
        <CardHeader>
          {/* Icon khoá */}
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Quên mật khẩu?</CardTitle>
          <p className="text-center text-sm text-gray-500 mt-1">
            Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label htmlFor="forgot-email" className="text-sm font-medium">
                Địa chỉ Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="example@email.com"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                className={emailError ? 'border-red-400 focus:ring-red-400' : ''}
              />
              {emailError && (
                <p className="text-xs text-red-500">{emailError}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Đang gửi...
                </span>
              ) : (
                'Gửi link đặt lại mật khẩu'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center text-sm gap-1">
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            ← Quay lại đăng nhập
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
