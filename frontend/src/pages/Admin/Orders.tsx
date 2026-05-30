import React, { useState, useEffect, useCallback } from 'react';
import { ordersApi, OrderApi } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/utils';
import { Edit2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '',          label: 'Tất cả' },
  { value: 'pending',   label: 'Chờ xác nhận' },
  { value: 'shipping',  label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  shipping:  'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['pending', 'shipping', 'cancelled'],
  shipping: ['shipping', 'completed', 'cancelled'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

export function Orders() {
  const [orders, setOrders]           = useState<OrderApi[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);

  const [editingId, setEditingId]     = useState<string | null>(null);
  const [updatingId, setUpdatingId]   = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ordersApi.getAllOrders(page, 10, filterStatus || undefined);
      if (res.success && res.data) {
        setOrders(res.data.orders);
        setTotalPages(res.data.totalPages);
        setTotal(res.data.total);
      } else {
        setError(res.message || 'Không thể tải danh sách đơn hàng.');
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Reset về trang 1 khi đổi filter
  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setPage(1);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await ordersApi.updateOrderStatus(orderId, newStatus);
      if (res.success && res.data) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: res.data!.status } : o));
      } else {
        alert(res.message || 'Cập nhật trạng thái thất bại.');
      }
    } catch {
      alert('Lỗi kết nối khi cập nhật trạng thái.');
    } finally {
      setUpdatingId(null);
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quản lý Đơn hàng</h1>
          {!loading && <p className="text-sm text-slate-500 mt-1">Tổng cộng <span className="font-bold text-slate-700">{total}</span> đơn hàng</p>}
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.value}
            onClick={() => handleFilterChange(s.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              filterStatus === s.value
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-6 py-5 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-medium">Không có đơn hàng nào.</p>
        </div>
      )}

      {/* Order list */}
      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map(order => {
            const isEditing  = editingId === order.id;
            const isUpdating = updatingId === order.id;

            return (
              <Card key={order.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow rounded-2xl">
                <CardHeader className="bg-slate-50 border-b py-3 flex flex-row items-center justify-between space-y-0">
                  <div className="flex gap-4 items-center">
                    <span className="font-bold text-slate-900 uppercase text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
                    <span className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        {isUpdating ? (
                          <svg className="animate-spin w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : null}
                        <select
                          className="border rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={order.status}
                          disabled={isUpdating}
                          onChange={e => handleStatusChange(order.id, e.target.value)}
                          onBlur={() => !isUpdating && setEditingId(null)}
                          autoFocus
                        >
                          {STATUS_OPTIONS.filter(
                            s => s.value !== '' && (ALLOWED_TRANSITIONS[order.status] || []).includes(s.value)
                          ).map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-slate-400 hover:text-slate-600 text-xs font-medium"
                        >
                          Huỷ
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`px-3 py-1 border rounded-full text-xs font-semibold ${STATUS_STYLE[order.status]}`}>
                          {STATUS_OPTIONS.find(s => s.value === order.status)?.label}
                        </span>
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <button
                            onClick={() => setEditingId(order.id)}
                            className="text-indigo-600 hover:text-indigo-800 p-1 rounded-lg hover:bg-indigo-50 transition-all"
                            title="Chỉnh sửa trạng thái"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4 grid md:grid-cols-2 gap-6">
                  {/* Sản phẩm */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-slate-900">Chi tiết sản phẩm</h4>
                    <ul className="space-y-1.5 text-sm">
                      {order.items.map(item => (
                        <li key={item.id} className="flex justify-between bg-slate-50 px-3 py-1.5 rounded-lg">
                          <span className="text-slate-700"><span className="text-indigo-600 font-bold mr-1">{item.quantity}x</span>{item.productName}</span>
                          <span className="text-slate-600 font-mono">{formatCurrency(item.unitPrice * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="font-bold mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm">
                      <span className="text-slate-600">Tổng:</span>
                      <span className="text-indigo-700 font-mono">{formatCurrency(order.total)}</span>
                    </div>
                  </div>

                  {/* Thông tin giao hàng */}
                  <div className="text-sm space-y-2">
                    <h4 className="text-sm font-semibold mb-2 text-slate-900">Thông tin giao hàng</h4>
                    <p><span className="text-slate-500">Thanh toán:</span> <span className="font-medium text-slate-700">{order.paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'}</span></p>
                    <p><span className="text-slate-500">Địa chỉ:</span> <span className="font-medium text-slate-700">{order.address}</span></p>
                    {order.note && <p><span className="text-slate-500">Ghi chú:</span> <span className="font-medium text-slate-700">{order.note}</span></p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Phân trang */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 font-semibold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Trước
          </button>
          <span className="text-sm font-bold text-slate-600">Trang {page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 font-semibold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Tiếp <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
