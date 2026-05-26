import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

interface FieldError {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
}

export function Register() {
  const { register, isLoading, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Nếu đã đăng nhập → redirect về trang chủ
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Xoá lỗi của field khi user bắt đầu sửa
    if (fieldErrors[name as keyof FieldError]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
    setServerError('');
  };

  // ── Client-side validation cơ bản ────────────────────────────────────────

  const validate = (): boolean => {
    const errors: FieldError = {};

    if (!form.name.trim()) {
      errors.name = 'Họ tên không được để trống.';
    } else if (form.name.trim().length < 2) {
      errors.name = 'Họ tên phải có ít nhất 2 ký tự.';
    }

    if (!form.email) {
      errors.email = 'Email không được để trống.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Email không đúng định dạng.';
    }

    if (!form.password) {
      errors.password = 'Mật khẩu không được để trống.';
    } else if (form.password.length < 6) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    } else if (!/[A-Z]/.test(form.password)) {
      errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ hoa.';
    } else if (!/[0-9]/.test(form.password)) {
      errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ số.';
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
    }

    if (form.phone && !/^(0[3|5|7|8|9])+([0-9]{8})$/.test(form.phone)) {
      errors.phone = 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu 03/05/07/08/09).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await register({
      name:     form.name.trim(),
      email:    form.email,
      password: form.password,
      phone:    form.phone || undefined,
    });

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setServerError(result.message);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-md mx-auto mt-12 mb-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Đăng ký tài khoản</CardTitle>
          <p className="text-center text-sm text-gray-500 mt-1">
            Tạo tài khoản để mua sắm văn phòng phẩm tiện lợi hơn
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
            {/* Họ tên */}
            <div className="space-y-1">
              <label htmlFor="reg-name" className="text-sm font-medium">
                Họ tên <span className="text-red-500">*</span>
              </label>
              <Input
                id="reg-name"
                name="name"
                placeholder="Nguyễn Văn A"
                required
                value={form.name}
                onChange={handleChange}
                className={fieldErrors.name ? 'border-red-400 focus:ring-red-400' : ''}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-500">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="reg-email" className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="reg-email"
                name="email"
                type="email"
                placeholder="example@email.com"
                required
                value={form.email}
                onChange={handleChange}
                className={fieldErrors.email ? 'border-red-400 focus:ring-red-400' : ''}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            {/* Mật khẩu */}
            <div className="space-y-1">
              <label htmlFor="reg-password" className="text-sm font-medium">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tối thiểu 6 ký tự, 1 chữ hoa, 1 số"
                  required
                  value={form.password}
                  onChange={handleChange}
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
              <label htmlFor="reg-confirm" className="text-sm font-medium">
                Nhập lại mật khẩu <span className="text-red-500">*</span>
              </label>
              <Input
                id="reg-confirm"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu ở trên"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                className={fieldErrors.confirmPassword ? 'border-red-400 focus:ring-red-400' : ''}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-500">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Số điện thoại (tuỳ chọn) */}
            <div className="space-y-1">
              <label htmlFor="reg-phone" className="text-sm font-medium">
                Số điện thoại <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
              </label>
              <Input
                id="reg-phone"
                name="phone"
                type="tel"
                placeholder="0912 345 678"
                value={form.phone}
                onChange={handleChange}
                className={fieldErrors.phone ? 'border-red-400 focus:ring-red-400' : ''}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-red-500">{fieldErrors.phone}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center text-sm gap-1">
          <span>Đã có tài khoản?</span>
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Đăng nhập
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
