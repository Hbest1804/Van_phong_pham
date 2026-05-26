import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { authApi, RegisterPayload, LoginPayload } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<{ success: boolean; message: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Đồng bộ user vào localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('accessToken');
    }
  }, [user]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Đăng ký tài khoản — gọi POST /api/v1/auth/register
   */
  const register = async (
    payload: RegisterPayload
  ): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      const res = await authApi.register(payload);

      if (res.success && res.data) {
        // Lưu accessToken vào localStorage
        localStorage.setItem('accessToken', res.data.accessToken);

        // Map sang User type của frontend
        const loggedUser: User = {
          id:      res.data.user.id,
          email:   res.data.user.email,
          name:    res.data.user.name,
          role:    res.data.user.role,
          status:  res.data.user.status,
          phone:   res.data.user.phone   ?? undefined,
          address: res.data.user.address ?? undefined,
        };
        setUser(loggedUser);
        return { success: true, message: res.message };
      }

      return { success: false, message: res.message || 'Đăng ký thất bại.' };
    } catch {
      return { success: false, message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.' };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Đăng nhập — gọi POST /api/v1/auth/login
   */
  const login = async (
    payload: LoginPayload
  ): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      const res = await authApi.login(payload);

      if (res.success && res.data) {
        localStorage.setItem('accessToken', res.data.accessToken);

        const loggedUser: User = {
          id:      res.data.user.id,
          email:   res.data.user.email,
          name:    res.data.user.name,
          role:    res.data.user.role,
          status:  res.data.user.status,
          phone:   res.data.user.phone   ?? undefined,
          address: res.data.user.address ?? undefined,
        };
        setUser(loggedUser);
        return { success: true, message: res.message };
      }

      return { success: false, message: res.message || 'Đăng nhập thất bại.' };
    } catch {
      return { success: false, message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (data: Partial<User>) => {
    if (!user) return;
    setUser({ ...user, ...data });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
