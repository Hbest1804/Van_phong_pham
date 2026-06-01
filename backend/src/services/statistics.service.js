import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Lấy ngày đầu / cuối của tháng hiện tại (UTC) dưới dạng ISO string.
 */
function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Lấy ngày đầu / cuối của tháng trước (UTC) dưới dạng ISO string.
 */
function getPreviousMonthRange() {
  const now   = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Tính phần trăm thay đổi giữa hai giá trị (so với tháng trước).
 * Trả về null nếu giá trị gốc bằng 0 (tránh chia cho 0).
 *
 * @param {number} current
 * @param {number} previous
 * @returns {number|null} % thay đổi, làm tròn 2 chữ số thập phân
 */
function calcGrowth(current, previous) {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * 9.1 Lấy số liệu tổng quan cho dashboard Admin
 * GET /api/v1/admin/statistics/overview
 *
 * Trả về:
 *  - Tổng doanh thu (tất cả thời gian) từ đơn hàng completed
 *  - Tổng số đơn hàng (tất cả thời gian)
 *  - Tổng số khách hàng (role = 'user')
 *  - Tổng số sản phẩm đang kinh doanh (is_active = true)
 *  - Doanh thu tháng này vs tháng trước (+ % tăng trưởng)
 *  - Số đơn hàng tháng này vs tháng trước (+ % tăng trưởng)
 *  - Phân bổ đơn hàng theo trạng thái (pending/shipping/completed/cancelled)
 *  - Top 5 sản phẩm bán chạy (theo tổng quantity trong order_items của đơn completed)
 *
 * @returns {Promise<object>}
 */
export async function getDashboardOverview() {
  const currMonth = getCurrentMonthRange();
  const prevMonth = getPreviousMonthRange();

  // ── 1. Thống kê tổng hợp toàn thời gian ─────────────────────────────────

  const [
    totalRevenueResult,
    totalOrdersResult,
    totalUsersResult,
    totalActiveProductsResult,
    pendingResult,
    shippingResult,
    completedResult,
    cancelledResult,
  ] = await Promise.all([
    // Tổng doanh thu từ đơn completed (dùng RPC)
    supabaseAdmin.rpc('get_revenue_sum'),

    // Tổng đơn hàng (tất cả trạng thái)
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true }),

    // Tổng khách hàng
    supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user'),

    // Sản phẩm đang kinh doanh
    supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Phân bổ đơn theo trạng thái
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'shipping'),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cancelled'),
  ]);

  // Kiểm tra lỗi DB
  const dbErrors = [
    totalRevenueResult.error,
    totalOrdersResult.error,
    totalUsersResult.error,
    totalActiveProductsResult.error,
    pendingResult.error,
    shippingResult.error,
    completedResult.error,
    cancelledResult.error,
  ].filter(Boolean);

  if (dbErrors.length > 0) {
    console.error('[statistics.service] Lỗi truy vấn tổng hợp:', dbErrors[0].message);
    throw new AppError('Không thể lấy dữ liệu tổng quan. Vui lòng thử lại.', 500);
  }

  // Tổng doanh thu
  const totalRevenue = totalRevenueResult.data ?? 0;

  // Phân bổ đơn theo trạng thái
  const statusCounts = {
    pending: pendingResult.count ?? 0,
    shipping: shippingResult.count ?? 0,
    completed: completedResult.count ?? 0,
    cancelled: cancelledResult.count ?? 0,
  };

  // ── 2. Thống kê tháng hiện tại ───────────────────────────────────────────

  const [currRevenueResult, currOrdersResult, prevRevenueResult, prevOrdersResult] =
    await Promise.all([
      // Doanh thu tháng này (completed) - dùng RPC
      supabaseAdmin.rpc('get_revenue_sum', {
        p_start_date: currMonth.start,
        p_end_date: currMonth.end
      }),

      // Số đơn tháng này
      supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', currMonth.start)
        .lt('created_at', currMonth.end),

      // Doanh thu tháng trước (completed) - dùng RPC
      supabaseAdmin.rpc('get_revenue_sum', {
        p_start_date: prevMonth.start,
        p_end_date: prevMonth.end
      }),

      // Số đơn tháng trước
      supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevMonth.start)
        .lt('created_at', prevMonth.end),
    ]);

  const monthErrors = [
    currRevenueResult.error,
    currOrdersResult.error,
    prevRevenueResult.error,
    prevOrdersResult.error,
  ].filter(Boolean);

  if (monthErrors.length > 0) {
    console.error('[statistics.service] Lỗi truy vấn theo tháng:', monthErrors[0].message);
    throw new AppError('Không thể lấy dữ liệu theo tháng. Vui lòng thử lại.', 500);
  }

  const currentMonthRevenue  = currRevenueResult.data ?? 0;
  const previousMonthRevenue = prevRevenueResult.data ?? 0;
  const currentMonthOrders   = currOrdersResult.count  ?? 0;
  const previousMonthOrders  = prevOrdersResult.count  ?? 0;

  // ── 3. Top 5 sản phẩm bán chạy ──────────────────────────────────────────

  const { data: topProductsRaw, error: topProductsError } = await supabaseAdmin
    .rpc('get_top_products', {
      p_limit_num: 5,
      p_sort_by: 'quantity'
    });

  if (topProductsError) {
    console.error('[statistics.service] Lỗi lấy top sản phẩm:', topProductsError.message);
    throw new AppError('Không thể lấy top sản phẩm bán chạy. Vui lòng thử lại.', 500);
  }

  const topProducts = (topProductsRaw || []).map(p => ({
    productId:     p.product_id,
    productName:   p.product_name,
    totalQuantity: Number(p.total_quantity),
    totalRevenue:  Math.round(Number(p.total_revenue) * 100) / 100,
  }));

  // ── 4. Tổng hợp kết quả trả về ───────────────────────────────────────────

  return {
    // Chỉ số chính
    summary: {
      totalRevenue:        Math.round(totalRevenue * 100) / 100,
      totalOrders:         totalOrdersResult.count  ?? 0,
      totalCustomers:      totalUsersResult.count   ?? 0,
      totalActiveProducts: totalActiveProductsResult.count ?? 0,
    },

    // Thống kê tháng hiện tại kèm tăng trưởng so với tháng trước
    currentMonth: {
      revenue: {
        value:      Math.round(currentMonthRevenue * 100) / 100,
        growth:     calcGrowth(currentMonthRevenue, previousMonthRevenue),
      },
      orders: {
        value:      currentMonthOrders,
        growth:     calcGrowth(currentMonthOrders, previousMonthOrders),
      },
    },

    // Thống kê tháng trước (để client tự tính nếu cần)
    previousMonth: {
      revenue: Math.round(previousMonthRevenue * 100) / 100,
      orders:  previousMonthOrders,
    },

    // Phân bổ đơn hàng theo trạng thái
    ordersByStatus: statusCounts,

    // Top 5 sản phẩm bán chạy (theo số lượng, đơn completed)
    topProducts,
  };
}

/**
 * 9.2 Doanh thu theo tháng trong một khoảng thời gian
 * GET /api/v1/admin/statistics/revenue
 *
 * Query params:
 *   from   {string}  — ISO date string bắt đầu khoảng (VD: 2025-01-01). Mặc định: 12 tháng trước.
 *   to     {string}  — ISO date string kết thúc khoảng (VD: 2025-12-31). Mặc định: ngày hiện tại.
 *   groupBy {string} — 'month' | 'day' (mặc định 'month')
 *
 * @param {object} queryParams
 * @returns {Promise<object>} { period, groupBy, data: [{ label, revenue, orders }], summary }
 */
export async function getRevenueByPeriod(queryParams = {}) {
  const { from, to, groupBy = 'month' } = queryParams;

  // Validate groupBy
  const allowedGroupBy = ['month', 'day'];
  if (!allowedGroupBy.includes(groupBy)) {
    throw new AppError("groupBy chỉ chấp nhận 'month' hoặc 'day'.", 400);
  }

  // Xác định khoảng thời gian mặc định: 12 tháng gần nhất nếu không truyền
  const now = new Date();
  let startDate, endDate;

  if (from) {
    startDate = new Date(from);
    if (isNaN(startDate.getTime())) throw new AppError("Giá trị 'from' không phải là ngày hợp lệ.", 400);
  } else {
    // Mặc định 12 tháng trước
    startDate = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 1));
  }

  if (to) {
    endDate = new Date(to);
    if (isNaN(endDate.getTime())) throw new AppError("Giá trị 'to' không phải là ngày hợp lệ.", 400);
    // Đẩy đến cuối ngày (23:59:59.999Z)
    endDate.setUTCHours(23, 59, 59, 999);
  } else {
    endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  }

  if (startDate >= endDate) {
    throw new AppError("'from' phải nhỏ hơn 'to'.", 400);
  }

  // Lấy thống kê doanh thu và đơn hàng đã gom nhóm từ database (dùng RPC)
  const { data: statsRaw, error: statsError } = await supabaseAdmin
    .rpc('get_revenue_stats', {
      p_from_date: startDate.toISOString(),
      p_to_date:   endDate.toISOString(),
      p_group_by:  groupBy,
    });

  if (statsError) {
    console.error('[statistics.service] Lỗi lấy doanh thu theo khoảng:', statsError.message);
    throw new AppError('Không thể lấy dữ liệu doanh thu. Vui lòng thử lại.', 500);
  }

  // Gom nhóm theo ngày / tháng
  const revenueMap = new Map();  // label → revenue
  const ordersMap  = new Map();  // label → orders count

  const getLabel = (isoString) => {
    const d = new Date(isoString);
    if (groupBy === 'day') {
      // Format: YYYY-MM-DD
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
    // Format: YYYY-MM
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  for (const row of (statsRaw || [])) {
    revenueMap.set(row.label, Number(row.revenue));
    ordersMap.set(row.label, Number(row.orders));
  }

  // Sinh đủ tất cả các nhãn trong khoảng (dù không có đơn → 0)
  const labels = [];
  const cursor = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    groupBy === 'day' ? startDate.getUTCMonth() : startDate.getUTCMonth(),
    groupBy === 'day' ? startDate.getUTCDate() : 1,
  ));
  const endCursor = new Date(endDate);

  while (cursor <= endCursor) {
    const label = getLabel(cursor.toISOString());
    if (!labels.includes(label)) labels.push(label);

    if (groupBy === 'day') {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    } else {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  const data = labels.map(label => ({
    label,
    revenue: Math.round((revenueMap.get(label) || 0) * 100) / 100,
    orders:  ordersMap.get(label)  || 0,
  }));

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalOrders  = data.reduce((s, d) => s + d.orders, 0);

  return {
    period: {
      from: startDate.toISOString(),
      to:   endDate.toISOString(),
    },
    groupBy,
    data,
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      dataPoints: data.length,
    },
  };
}

/**
 * 9.3 Top sản phẩm bán chạy nhất
 * GET /api/v1/admin/statistics/top-products
 *
 * Query params:
 *   limit   {number}  — Số sản phẩm trả về (1–50, mặc định 10)
 *   from    {string}  — ISO date string bắt đầu lọc (tuỳ chọn)
 *   to      {string}  — ISO date string kết thúc lọc (tuỳ chọn)
 *   sortBy  {string}  — 'quantity' | 'revenue' (mặc định 'quantity')
 *
 * @param {object} queryParams
 * @returns {Promise<object>} { period, sortBy, limit, products: [...], summary }
 */
export async function getTopProducts(queryParams = {}) {
  const {
    limit   = 10,
    from,
    to,
    sortBy  = 'quantity',
  } = queryParams;

  // Validate limit
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  // Validate sortBy
  const allowedSortBy = ['quantity', 'revenue'];
  if (!allowedSortBy.includes(sortBy)) {
    throw new AppError("sortBy chỉ chấp nhận 'quantity' hoặc 'revenue'.", 400);
  }

  // Xử lý khoảng thời gian (tuỳ chọn)
  let startDate = null;
  let endDate   = null;

  if (from) {
    startDate = new Date(from);
    if (isNaN(startDate.getTime())) throw new AppError("Giá trị 'from' không phải là ngày hợp lệ.", 400);
  }
  if (to) {
    endDate = new Date(to);
    if (isNaN(endDate.getTime())) throw new AppError("Giá trị 'to' không phải là ngày hợp lệ.", 400);
    endDate.setUTCHours(23, 59, 59, 999);
  }
  if (startDate && endDate && startDate >= endDate) {
    throw new AppError("'from' phải nhỏ hơn 'to'.", 400);
  }

  // Lấy top sản phẩm bán chạy VÀ tổng hợp số liệu toàn bộ (dùng RPC song song)
  const [itemsResult, summaryResult] = await Promise.all([
    supabaseAdmin.rpc('get_top_products', {
      p_from_date: startDate ? startDate.toISOString() : null,
      p_to_date:   endDate   ? endDate.toISOString()   : null,
      p_sort_by:   sortBy,
      p_limit_num: parsedLimit
    }),
    supabaseAdmin.rpc('get_top_products_summary', {
      p_from_date: startDate ? startDate.toISOString() : null,
      p_to_date:   endDate   ? endDate.toISOString()   : null
    })
  ]);

  if (itemsResult.error) {
    console.error('[statistics.service] Lỗi lấy top sản phẩm:', itemsResult.error.message);
    throw new AppError('Không thể lấy dữ liệu sản phẩm bán chạy. Vui lòng thử lại.', 500);
  }

  if (summaryResult.error) {
    console.error('[statistics.service] Lỗi lấy tổng hợp top sản phẩm:', summaryResult.error.message);
    throw new AppError('Không thể lấy dữ liệu sản phẩm bán chạy. Vui lòng thử lại.', 500);
  }

  const itemsRaw = itemsResult.data || [];
  const summaryRaw = summaryResult.data?.[0] || { total_products: 0, total_quantity_sold: 0, total_revenue: 0 };

  const sorted = itemsRaw.map((p, index) => ({
    rank:          index + 1,
    productId:     p.product_id,
    productName:   p.product_name,
    unitPrice:     Math.round(Number(p.unit_price) * 100) / 100,
    totalQuantity: Number(p.total_quantity),
    totalRevenue:  Math.round(Number(p.total_revenue) * 100) / 100,
  }));

  return {
    period: {
      from: startDate ? startDate.toISOString() : null,
      to:   endDate   ? endDate.toISOString()   : null,
    },
    sortBy,
    limit: parsedLimit,
    products: sorted,
    summary: {
      totalProducts:       Number(summaryRaw.total_products),
      totalQuantitySold:   Number(summaryRaw.total_quantity_sold),
      totalRevenue:        Math.round(Number(summaryRaw.total_revenue) * 100) / 100,
    },
  };
}
