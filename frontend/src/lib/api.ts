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

// ── Cart API ──────────────────────────────────────────────────────────────────

export interface CartItemApi {
  cartItemId: string;
  quantity: number;
  product: Product;
}

export interface CartData {
  items: CartItemApi[];
  totalPrice: number;
  itemCount: number;
}

export const cartApi = {
  /**
   * GET /api/v1/cart
   * Lấy toàn bộ sản phẩm trong giỏ hàng của người dùng đã đăng nhập.
   */
  getCart: () =>
    request<CartData>('/cart', {
      method: 'GET',
    }),

  /**
   * POST /api/v1/cart
   * Thêm sản phẩm vào giỏ hàng (hoặc tăng số lượng nếu đã có).
   */
  addToCart: (productId: string, quantity = 1) =>
    request<{ cartItemId: string; productId: string; quantity: number; message: string }>('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),

  /**
   * PUT /api/v1/cart/:productId
   * Cập nhật số lượng sản phẩm trong giỏ hàng.
   */
  updateCartItem: (productId: string, quantity: number) =>
    request<{ cartItemId: string; productId: string; quantity: number }>(`/cart/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),

  /**
   * DELETE /api/v1/cart/:productId
   * Xoá một sản phẩm khỏi giỏ hàng.
   */
  removeFromCart: (productId: string) =>
    request<void>(`/cart/${productId}`, {
      method: 'DELETE',
    }),

  /**
   * DELETE /api/v1/cart
   * Xoá toàn bộ giỏ hàng.
   */
  clearCart: () =>
    request<void>('/cart', {
      method: 'DELETE',
    }),

  /**
   * POST /api/v1/cart/bulk-sync
   * Đồng bộ giỏ hàng bulk khi người dùng đăng nhập.
   */
  bulkSyncCart: (items: { productId: string; quantity: number }[]) =>
    request<void>('/cart/bulk-sync', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
};

// ── Orders API ────────────────────────────────────────────────────────────────

export interface OrderItemApi {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderApi {
  id: string;
  userId?: string;
  status: 'pending' | 'shipping' | 'completed' | 'cancelled';
  total: number;
  address: string;
  paymentMethod: 'cod' | 'transfer';
  note: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemApi[];
}

export interface PaginatedOrders {
  orders: OrderApi[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateOrderPayload {
  address: string;
  paymentMethod?: 'cod' | 'transfer';
  note?: string;
}

export const ordersApi = {
  /**
   * POST /api/v1/orders
   * Tạo đơn hàng từ giỏ hàng hiện tại.
   */
  createOrder: (payload: CreateOrderPayload) =>
    request<OrderApi>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * GET /api/v1/orders/my
   * Lấy lịch sử đơn hàng của người dùng đang đăng nhập.
   */
  getMyOrders: (page = 1, limit = 10) =>
    request<PaginatedOrders>(`/orders/my?page=${page}&limit=${limit}`, {
      method: 'GET',
    }),

  /**
   * GET /api/v1/orders/:id
   * Chi tiết một đơn hàng (user xem của mình, admin xem tất cả).
   */
  getOrderById: (id: string) =>
    request<OrderApi>(`/orders/${id}`, {
      method: 'GET',
    }),

  /**
   * GET /api/v1/orders  (Admin only)
   * Lấy tất cả đơn hàng, hỗ trợ lọc theo status và phân trang.
   */
  getAllOrders: (page = 1, limit = 10, status?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    return request<PaginatedOrders>(`/orders?${params.toString()}`, {
      method: 'GET',
    });
  },

  /**
   * PATCH /api/v1/orders/:id/status  (Admin only)
   * Cập nhật trạng thái đơn hàng.
   */
  updateOrderStatus: (id: string, status: string) =>
    request<OrderApi>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ── Statistics API (Admin only) ───────────────────────────────────────────────

export interface StatsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalActiveProducts: number;
}

export interface StatsMonthMetric {
  value: number;
  /** % tăng trưởng so với tháng trước, null nếu tháng trước = 0 */
  growth: number | null;
}

export interface StatsOrdersByStatus {
  pending: number;
  shipping: number;
  completed: number;
  cancelled: number;
}

export interface StatsTopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface DashboardOverviewData {
  summary: StatsSummary;
  currentMonth: {
    revenue: StatsMonthMetric;
    orders: StatsMonthMetric;
  };
  previousMonth: {
    revenue: number;
    orders: number;
  };
  ordersByStatus: StatsOrdersByStatus;
  topProducts: StatsTopProduct[];
}

export interface RevenueDataPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface RevenueByPeriodData {
  period: { from: string; to: string };
  groupBy: 'month' | 'day';
  data: RevenueDataPoint[];
  summary: {
    totalRevenue: number;
    totalOrders: number;
    dataPoints: number;
  };
}

export interface TopProductItem {
  rank: number;
  productId: string;
  productName: string;
  unitPrice: number;
  totalQuantity: number;
  totalRevenue: number;
}

export interface TopProductsData {
  period: { from: string | null; to: string | null };
  sortBy: string;
  limit: number;
  products: TopProductItem[];
  summary: {
    totalProducts: number;
    totalQuantitySold: number;
    totalRevenue: number;
  };
}

export interface GetRevenueParams {
  from?: string;
  to?: string;
  groupBy?: 'month' | 'day';
}

export interface GetTopProductsParams {
  limit?: number;
  from?: string;
  to?: string;
  sortBy?: 'quantity' | 'revenue';
}

export const statisticsApi = {
  /**
   * GET /api/v1/admin/statistics/overview
   * Lấy số liệu tổng quan cho dashboard Admin.
   */
  getOverview: () =>
    request<DashboardOverviewData>('/admin/statistics/overview', { method: 'GET' }),

  /**
   * GET /api/v1/admin/statistics/revenue
   * Lấy dữ liệu doanh thu theo khoảng thời gian.
   */
  getRevenue: (params: GetRevenueParams = {}) => {
    const query = new URLSearchParams();
    if (params.from)    query.append('from',    params.from);
    if (params.to)      query.append('to',      params.to);
    if (params.groupBy) query.append('groupBy', params.groupBy);
    const qs = query.toString();
    return request<RevenueByPeriodData>(`/admin/statistics/revenue${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * GET /api/v1/admin/statistics/top-products
   * Lấy danh sách sản phẩm có doanh số cao nhất.
   */
  getTopProducts: (params: GetTopProductsParams = {}) => {
    const query = new URLSearchParams();
    if (params.limit  != null) query.append('limit',  String(params.limit));
    if (params.from)           query.append('from',   params.from);
    if (params.to)             query.append('to',     params.to);
    if (params.sortBy)         query.append('sortBy', params.sortBy);
    const qs = query.toString();
    return request<TopProductsData>(`/admin/statistics/top-products${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
};

