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

let refreshPromise: Promise<string | null> | null = null;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  let res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include', // gửi cookie (refreshToken)
    ...options,
    headers,
  });

  if (res.status === 401 && path !== '/auth/refresh-token' && path !== '/auth/login') {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            credentials: 'include',
          });

          if (refreshRes.ok) {
            const refreshJson = await refreshRes.json();
            if (refreshJson.success && refreshJson.data?.accessToken) {
              const newAccessToken = refreshJson.data.accessToken;
              localStorage.setItem('accessToken', newAccessToken);
              return newAccessToken;
            }
          } else if (refreshRes.status === 401 || refreshRes.status === 403) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('auth_user');
            window.dispatchEvent(new Event('auth-logout'));
          }
        } catch (err) {
          console.error('Failed to refresh token:', err);
        } finally {
          refreshPromise = null;
        }
        return null;
      })();
    }

    const newAccessToken = await refreshPromise;
    if (newAccessToken) {
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
      });
    }
  }

  const json: ApiResponse<T> = await res.json();
  return json;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
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

  /**
   * POST /api/v1/auth/logout
   */
  logout: () =>
    request<void>('/auth/logout', {
      method: 'POST',
    }),

  /**
   * POST /api/v1/auth/forgot-password
   * Gửi email chứa link đặt lại mật khẩu
   */
  forgotPassword: (payload: ForgotPasswordPayload) =>
    request<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

// ── Reset Password ─────────────────────────────────────────────────────────────
  resetPassword: (payload: ResetPasswordPayload) =>
    request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

import { Product, Category } from '../types';

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  maxPrice?: number;
}

export interface PaginatedProducts {
  products: Product[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId: string;
  imageUrl?: string;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  categoryId?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export const productsApi = {
  getProducts: (params: GetProductsParams) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.maxPrice) query.append('maxPrice', String(params.maxPrice));

    const queryString = query.toString();
    return request<PaginatedProducts>(`/products${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  getProductById: (id: string) =>
    request<Product>(`/products/${id}`, {
      method: 'GET',
    }),

  createProduct: (payload: CreateProductPayload) =>
    request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProduct: (id: string, payload: UpdateProductPayload) =>
    request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteProduct: (id: string) =>
    request<void>(`/products/${id}`, {
      method: 'DELETE',
    }),

  uploadProductImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return request<{ imageUrl: string }>('/products/upload', {
      method: 'POST',
      body: formData,
    });
  },
};

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
}

export const categoriesApi = {
  getCategories: () =>
    request<Category[]>('/categories', {
      method: 'GET',
    }),

  createCategory: (payload: CreateCategoryPayload) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCategory: (id: string, payload: UpdateCategoryPayload) =>
    request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteCategory: (id: string) =>
    request<void>(`/categories/${id}`, {
      method: 'DELETE',
    }),
};


