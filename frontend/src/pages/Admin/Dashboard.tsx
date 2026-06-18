import React, { useEffect, useState, useCallback } from 'react';
import {
  statisticsApi,
  DashboardOverviewData,
  RevenueByPeriodData,
  TopProductItem,
  GetRevenueParams,
  GetTopProductsParams,
} from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import {
  DollarSign, ShoppingBag, Package, Users,
  TrendingUp, TrendingDown, Minus, RefreshCw,
  Trophy, ChevronDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-400">—</span>;
  if (value > 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
      <TrendingUp className="w-3 h-3" />+{value}%
    </span>
  );
  if (value < 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
      <TrendingDown className="w-3 h-3" />{value}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
      <Minus className="w-3 h-3" />0%
    </span>
  );
}

function StatCard({
  title, value, icon, iconBg, iconColor, growth, sub,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  growth?: number | null;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          {growth !== undefined && (
            <div className="flex items-center gap-2 mt-2">
              <GrowthBadge value={growth ?? null} />
              {sub && <span className="text-xs text-slate-400">{sub}</span>}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${iconBg} ${iconColor} rounded-full flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Custom Tooltip cho biểu đồ ───────────────────────────────────────────────

const RevenueTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name === 'revenue' ? 'Doanh thu: ' : 'Đơn hàng: '}
          <span className="font-medium">
            {p.name === 'revenue' ? formatCurrency(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

// ── Order Status Badge ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ xử lý', color: 'text-amber-700', bg: 'bg-amber-100' },
  shipping: { label: 'Đang giao', color: 'text-blue-700', bg: 'bg-blue-100' },
  completed: { label: 'Hoàn thành', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cancelled: { label: 'Đã huỷ', color: 'text-red-700', bg: 'bg-red-100' },
};

// ── Main Component ────────────────────────────────────────────────────────────

export function Dashboard() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueByPeriodData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingTopProd, setLoadingTopProd] = useState(true);
  const [errorOverview, setErrorOverview] = useState<string | null>(null);

  // Controls
  const [revenueGroupBy, setRevenueGroupBy] = useState<'month' | 'day'>('month');
  const [topSortBy, setTopSortBy] = useState<'quantity' | 'revenue'>('quantity');
  const [topLimit, setTopLimit] = useState(10);

  // ── Fetch functions ────────────────────────────────────────────────────────

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    setErrorOverview(null);
    try {
      const res = await statisticsApi.getOverview();
      if (res.success && res.data) {
        setOverview(res.data);
      } else {
        setErrorOverview(res.message || 'Không thể tải dữ liệu tổng quan.');
      }
    } catch {
      setErrorOverview('Lỗi kết nối đến máy chủ.');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchRevenue = useCallback(async (params: GetRevenueParams = {}) => {
    setLoadingRevenue(true);
    try {
      const res = await statisticsApi.getRevenue(params);
      if (res.success && res.data) setRevenueData(res.data);
    } catch {
      console.error('Lỗi tải dữ liệu doanh thu');
    } finally {
      setLoadingRevenue(false);
    }
  }, []);

  const fetchTopProducts = useCallback(async (params: GetTopProductsParams = {}) => {
    setLoadingTopProd(true);
    try {
      const res = await statisticsApi.getTopProducts(params);
      if (res.success && res.data) setTopProducts(res.data.products);
    } catch {
      console.error('Lỗi tải top sản phẩm');
    } finally {
      setLoadingTopProd(false);
    }
  }, []);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { fetchRevenue({ groupBy: revenueGroupBy }); }, [revenueGroupBy, fetchRevenue]);
  useEffect(() => { fetchTopProducts({ sortBy: topSortBy, limit: topLimit }); }, [topSortBy, topLimit, fetchTopProducts]);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tổng quan Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dữ liệu thời gian thực từ hệ thống</p>
        </div>
        <button
          onClick={fetchOverview}
          disabled={loadingOverview}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingOverview ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Error banner */}
      {errorOverview && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <span>⚠️ {errorOverview}</span>
          <button onClick={fetchOverview} className="ml-auto underline hover:no-underline">Thử lại</button>
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {loadingOverview ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))
        ) : overview ? (
          <>
            <StatCard
              title="Tổng doanh thu"
              value={formatCurrency(overview.summary.totalRevenue)}
              icon={<DollarSign className="w-5 h-5" />}
              iconBg="bg-blue-100" iconColor="text-blue-600"
              growth={overview.currentMonth.revenue.growth}
              sub="so với tháng trước"
            />
            <StatCard
              title="Tổng đơn hàng"
              value={overview.summary.totalOrders.toLocaleString('vi-VN')}
              icon={<ShoppingBag className="w-5 h-5" />}
              iconBg="bg-emerald-100" iconColor="text-emerald-600"
              growth={overview.currentMonth.orders.growth}
              sub="so với tháng trước"
            />
            <StatCard
              title="Khách hàng"
              value={overview.summary.totalCustomers.toLocaleString('vi-VN')}
              icon={<Users className="w-5 h-5" />}
              iconBg="bg-orange-100" iconColor="text-orange-600"
            />
            <StatCard
              title="Sản phẩm đang bán"
              value={overview.summary.totalActiveProducts.toLocaleString('vi-VN')}
              icon={<Package className="w-5 h-5" />}
              iconBg="bg-purple-100" iconColor="text-purple-600"
            />
          </>
        ) : null}
      </div>

      {/* ── Phân bổ đơn hàng theo trạng thái ─────────────────────────────── */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(overview.ordersByStatus).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className={`rounded-xl px-4 py-3 ${cfg.bg} flex items-center justify-between`}>
                <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                <span className={`text-xl font-bold ${cfg.color}`}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Biểu đồ doanh thu (9.2) + Top sản phẩm (9.3) ────────────────── */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* Biểu đồ doanh thu */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Doanh thu theo thời gian</h2>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {(['month', 'day'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setRevenueGroupBy(g)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${revenueGroupBy === g
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {g === 'month' ? 'Theo tháng' : 'Theo ngày'}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6">
            {loadingRevenue ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="text-sm">Đang tải...</span>
                </div>
              </div>
            ) : revenueData && revenueData.data.length > 0 ? (
              <>
                <div className="flex items-center gap-6 mb-4 text-sm text-slate-500">
                  <span>Tổng: <strong className="text-slate-800">{formatCurrency(revenueData.summary.totalRevenue)}</strong></span>
                  <span>Đơn: <strong className="text-slate-800">{revenueData.summary.totalOrders}</strong></span>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData.data} margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickFormatter={label =>
                          revenueGroupBy === 'month'
                            ? label.slice(5)          // "YYYY-MM" → "MM"
                            : label.slice(5)           // "YYYY-MM-DD" → "MM-DD"
                        }
                      />
                      <YAxis
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<RevenueTooltip />} />
                      <Bar dataKey="revenue" name="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
                Không có dữ liệu doanh thu trong khoảng này.
              </div>
            )}
          </div>
        </div>

        {/* Top sản phẩm bán chạy (9.3) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Top sản phẩm
            </h2>
            <div className="flex items-center gap-2">
              {/* Sort by */}
              <select
                value={topSortBy}
                onChange={e => setTopSortBy(e.target.value as 'quantity' | 'revenue')}
                className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="quantity">Số lượng</option>
                <option value="revenue">Doanh thu</option>
              </select>
              {/* Limit */}
              <select
                value={topLimit}
                onChange={e => setTopLimit(Number(e.target.value))}
                className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[5, 10, 20].map(n => <option key={n} value={n}>Top {n}</option>)}
              </select>
            </div>
          </div>
          <div className="p-4">
            {loadingTopProd ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-3/4 mb-1.5" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-14 flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Chưa có dữ liệu.</p>
            ) : (
              <div className="space-y-1">
                {topProducts.map(p => (
                  <div key={p.productId} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                    {/* Rank badge */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${p.rank === 1 ? 'bg-amber-100 text-amber-700' :
                        p.rank === 2 ? 'bg-slate-200 text-slate-600' :
                          p.rank === 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-500'
                      }`}>
                      {p.rank}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.productName}</p>
                      <p className="text-xs text-slate-500">
                        {topSortBy === 'revenue'
                          ? `${p.totalQuantity} sản phẩm`
                          : `${formatCurrency(p.totalRevenue)}`
                        }
                      </p>
                    </div>
                    {/* Main metric */}
                    <div className="text-right flex-shrink-0">
                      {topSortBy === 'revenue' ? (
                        <span className="text-sm font-semibold text-blue-600">{formatCurrency(p.totalRevenue)}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                          ×{p.totalQuantity}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Biểu đồ đường đơn hàng theo tháng ───────────────────────────── */}
      {revenueData && revenueData.data.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Số lượng đơn hàng theo thời gian</h2>
          </div>
          <div className="p-6">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData.data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={label => label.slice(5)}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Line
                    type="monotone" dataKey="orders" name="orders"
                    stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
