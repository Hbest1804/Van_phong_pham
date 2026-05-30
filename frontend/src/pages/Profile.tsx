import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';
import { ordersApi, OrderApi } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';

const statusMap: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  shipping:  { label: 'Đang giao',    color: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Hoàn thành',   color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Đã hủy',       color: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export function Profile() {
  const { user, updateProfile } = useAuth();

  const [name, setName]       = useState(user?.name || '');
  const [phone, setPhone]     = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');

  const [orders, setOrders]         = useState<OrderApi[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError]     = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async (p: number) => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const res = await ordersApi.getMyOrders(p, 5);
      if (res.success && res.data) {
        setOrders(res.data.orders);
        setTotalPages(res.data.totalPages);
      } else {
        setOrdersError(res.message || 'Không thể tải đơn hàng.');
      }
    } catch {
      setOrdersError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders(page);
    }
  }, [fetchOrders, page, user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, phone, address });
    alert('Cập nhật thông tin thành công');
  };

  return (
    <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
      {/* ── Thông tin cá nhân ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
        <h2 className="text-2xl font-extrabold mb-6 text-indigo-950">Thông tin cá nhân</h2>
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-violet-500 to-indigo-500"></div>
          <CardContent className="pt-8">
            <div className="flex flex-col items-center mb-8">
               <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center text-3xl font-bold text-indigo-500 mb-4 shadow-inner">
                  {user.name.charAt(0).toUpperCase()}
               </div>
               <h3 className="font-bold text-lg text-slate-800">{user.name}</h3>
               <p className="text-sm text-slate-500">{user.email}</p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email (không thể đổi)</label>
                <Input value={user.email} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Họ tên</label>
                <Input value={name} onChange={e => setName(e.target.value)} required className="focus-visible:ring-violet-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Số điện thoại</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="focus-visible:ring-violet-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Địa chỉ</label>
                <Input value={address} onChange={e => setAddress(e.target.value)} className="focus-visible:ring-violet-500" />
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" className="w-full rounded-xl mt-4 shadow-md bg-slate-900">Cập nhật thông tin</Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Lịch sử đơn hàng ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
        <h2 className="text-2xl font-extrabold mb-6 text-indigo-950">Lịch sử đơn hàng</h2>

        {/* Loading */}
        {ordersLoading && (
          <div className="flex justify-center items-center py-16">
            <svg className="animate-spin w-10 h-10 text-violet-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        )}

        {/* Error */}
        {!ordersLoading && ordersError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-6 py-5 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{ordersError}</span>
          </div>
        )}

        {/* Empty */}
        {!ordersLoading && !ordersError && orders.length === 0 && (
          <div className="bg-white/60 backdrop-blur-md p-12 rounded-2xl border border-indigo-50 shadow-sm text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-300">
               <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-700">Bạn chưa có đơn hàng nào</h3>
            <p className="text-slate-500 mt-2">Hãy khám phá các sản phẩm và đặt hàng ngay nhé.</p>
          </div>
        )}

        {/* Order list */}
        {!ordersLoading && !ordersError && orders.length > 0 && (
          <>
            <motion.div
              initial="hidden" animate="visible"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
              className="space-y-6"
            >
              <AnimatePresence>
                {orders.map(order => (
                  <motion.div key={order.id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-shadow bg-white/90 backdrop-blur-md">
                      <CardHeader className="py-4 border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 flex flex-row items-center justify-between space-y-0">
                        <div>
                          <CardTitle className="text-sm text-slate-500 font-medium">
                            Mã đơn: <span className="font-bold text-indigo-950 tracking-wider">#{order.id.slice(0, 8).toUpperCase()}</span>
                          </CardTitle>
                          <span className="text-xs font-semibold text-slate-400 block mt-1">
                            {new Date(order.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${statusMap[order.status]?.color}`}>
                          {statusMap[order.status]?.label}
                        </span>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <ul className="space-y-3 mb-6">
                          {order.items.map(item => (
                            <li key={item.id} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="font-semibold text-slate-700">
                                <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs mr-2">{item.quantity}x</span>
                                {item.productName}
                              </span>
                              <span className="text-slate-600 font-mono font-medium">{formatCurrency(item.unitPrice * item.quantity)}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex justify-between items-center pt-5 border-t border-indigo-50">
                          <span className="font-bold text-sm text-slate-500 uppercase tracking-widest">Tổng cộng</span>
                          <span className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 font-mono">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  ← Trước
                </button>
                <span className="text-sm font-bold text-slate-600">
                  Trang {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Tiếp →
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
