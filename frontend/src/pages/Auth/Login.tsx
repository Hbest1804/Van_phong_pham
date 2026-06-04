import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

interface FieldError {
  email?: string;
  password?: string;
}

export function Login() {
  const { login, isLoading, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors]   = useState<FieldError>({});
  const [serverError, setServerError]   = useState('');

  // Đã đăng nhập → về trang chủ
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: FieldError = {};
    if (!email) {
      errors.email = 'Email không được để trống.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Email không đúng định dạng.';
    }
    if (!password) {
      errors.password = 'Mật khẩu không được để trống.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (setter: React.Dispatch<React.SetStateAction<string>>, field: keyof FieldError) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: undefined }));
      setServerError('');
    };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await login({ email, password });
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setServerError(result.message);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto mt-12 mb-12 px-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 mb-4 text-sm font-semibold text-slate-500 hover:text-violet-600 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Quay lại
      </button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Đăng nhập</CardTitle>
          <p className="text-center text-sm text-gray-500 mt-1">
            Chào mừng bạn quay lại!
          </p>
        </CardHeader>

        <CardContent>
          {/* Lỗi từ server */}
          {serverError && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="login-email" className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="login-email"
                type="email"
                placeholder="example@email.com"
                required
                value={email}
                onChange={handleChange(setEmail, 'email')}
                className={fieldErrors.email ? 'border-red-400 focus:ring-red-400' : ''}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            {/* Mật khẩu */}
            <div className="space-y-1">
              <label htmlFor="login-password" className="text-sm font-medium">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  required
                  value={password}
                  onChange={handleChange(setPassword, 'password')}
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

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-blue-600 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center text-sm gap-1">
          <span>Chưa có tài khoản?</span>
          <Link to="/register" className="text-blue-600 hover:underline font-medium">
            Đăng ký
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
