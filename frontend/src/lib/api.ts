/**
 * Centralized API client - giao tiếp với backend Express
 * Base URL lấy từ biến môi trường VITE_API_URL
 */

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/v1';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthData {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    status: 'active' | 'locked';
    phone: string | null;
    address: string | null;
    createdAt: string;
  };
  accessToken: string;
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  let res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include', // gửi cookie (refreshToken)
    ...options,
    headers,
  });

  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        if (refreshJson.success && refreshJson.data?.accessToken) {
          localStorage.setItem('accessToken', refreshJson.data.accessToken);
          headers['Authorization'] = `Bearer ${refreshJson.data.accessToken}`;
          res = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers,
          });
        }
      }
    } catch (err) {
      console.error('Failed to refresh token:', err);
    }
  }

  const json: ApiResponse<T> = await res.json();
  return json;
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * POST /api/v1/auth/register
   */
  register: (payload: RegisterPayload) =>
    request<AuthData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * POST /api/v1/auth/login
   */
  login: (payload: LoginPayload) =>
    request<AuthData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
