import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

interface FieldError {
  password?: string;
  confirmPassword?: string;
}

type PageState = 'form' | 'success' | 'invalid';

export function ResetPassword() {
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const token            = searchParams.get('token') ?? '';

  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]      = useState(false);
  const [fieldErrors, setFieldErrors]        = useState<FieldError>({});
  const [serverError, setServerError]        = useState('');
  const [isLoading, setIsLoading]            = useState(false);
  const [pageState, setPageState]            = useState<PageState>('form');

  // Nếu không có token trong URL → invalid ngay
  useEffect(() => {
    if (!token) setPageState('invalid');
  }, [token]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: FieldError = {};

    if (!password) {
      errors.password = 'Mật khẩu không được để trống.';
    } else if (password.length < 6) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ hoa.';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ số.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError('');
    try {
      const res = await authApi.resetPassword({ token, password });
      if (res.success) {
        setPageState('success');
      } else {
        // Token hết hạn / không hợp lệ
        setServerError(res.message || 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      }
    } catch {
      setServerError('Đã xảy ra lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Token không hợp lệ ────────────────────────────────────────────────────
  if (pageState === 'invalid') {
    return (
      <div className="max-w-md mx-auto mt-12 mb-12 px-4">
        <Card>
          <CardContent className="pt-10 pb-8">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-center text-gray-800 mb-3">
              Link không hợp lệ
            </h2>
            <p className="text-center text-gray-500 text-sm mb-6">
              Link đặt lại mật khẩu không đúng hoặc đã hết hạn (15 phút).
              Vui lòng yêu cầu gửi lại.
            </p>
            <Link
              to="/forgot-password"
              className="block w-full text-center py-2 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Gửi lại email đặt lại mật khẩu
            </Link>
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

  // ── Đặt lại thành công ─────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="max-w-md mx-auto mt-12 mb-12 px-4">
        <Card>
          <CardContent className="pt-10 pb-8">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-center text-gray-800 mb-3">
              Đặt lại mật khẩu thành công!
            </h2>
            <p className="text-center text-gray-500 text-sm mb-6">
              Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
            </p>
            <Button
              type="button"
              className="w-full"
              onClick={() => navigate('/login', { replace: true })}
            >
              Đăng nhập ngay
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Form đặt lại mật khẩu ─────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto mt-12 mb-12 px-4">
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Đặt lại mật khẩu</CardTitle>
          <p className="text-center text-sm text-gray-500 mt-1">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </CardHeader>

        <CardContent>
          {/* Lỗi từ server (token hết hạn / không hợp lệ) */}
          {serverError && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
              {serverError.includes('hết hạn') || serverError.includes('không hợp lệ') ? (
                <span className="block mt-1">
                  <Link to="/forgot-password" className="underline font-medium">
                    Gửi lại email đặt lại mật khẩu
                  </Link>
                </span>
              ) : null}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Mật khẩu mới */}
            <div className="space-y-1">
              <label htmlFor="reset-password" className="text-sm font-medium">
                Mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tối thiểu 6 ký tự, 1 chữ hoa, 1 số"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    setServerError('');
                  }}
                  className={fieldErrors.password ? 'border-red-400 focus:ring-red-400 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs select-none"
                  tabIndex={-1}
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-500">{fieldErrors.password}</p>
              )}
            </div>

            {/* Xác nhận mật khẩu */}
            <div className="space-y-1">
              <label htmlFor="reset-confirm" className="text-sm font-medium">
                Nhập lại mật khẩu <span className="text-red-500">*</span>
              </label>
              <Input
                id="reset-confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu mới"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }}
                className={fieldErrors.confirmPassword ? 'border-red-400 focus:ring-red-400' : ''}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-500">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Yêu cầu mật khẩu */}
            <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 space-y-1">
              <p className="text-xs font-medium text-gray-600">Yêu cầu mật khẩu:</p>
              {[
                { ok: password.length >= 6,    text: 'Ít nhất 6 ký tự' },
                { ok: /[A-Z]/.test(password),  text: 'Ít nhất 1 chữ hoa' },
                { ok: /[0-9]/.test(password),  text: 'Ít nhất 1 chữ số' },
              ].map(({ ok, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <span className={`text-xs ${ok && password ? 'text-green-600' : 'text-gray-400'}`}>
                    {ok && password ? '✓' : '○'}
                  </span>
                  <span className={`text-xs ${ok && password ? 'text-green-700' : 'text-gray-500'}`}>
                    {text}
                  </span>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Đang cập nhật...
                </span>
              ) : (
                'Cập nhật mật khẩu'
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
