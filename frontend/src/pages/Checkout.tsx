import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';
import { PaymentMethod } from '../types';
import { ordersApi } from '../lib/api';
import { motion } from 'motion/react';

export function Checkout() {
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState(user?.address || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (items.length === 0 && !isSuccess) {
    return <Navigate to="/cart" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;   // chặn double-submit (double-click / Enter liên tục)
    setError('');

    if (!address.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await ordersApi.createOrder({
        address: address.trim(),
        paymentMethod,
        note: note.trim() || undefined,
      });

      if (res.success) {
        try {
          await clearCart();
        } catch (cartErr) {
          // Đơn hàng đã tạo thành công trên server — lỗi xoá giỏ hàng local
          // không được ngăn người dùng thấy màn hình thành công.
          console.error('[Checkout] clearCart failed (order still created):', cartErr);
        }
        setIsSuccess(true);
      } else {
        setError(res.message || 'Đặt hàng thất bại. Vui lòng thử lại.');
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto mt-20 text-center bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg"
        >
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <h1 className="text-3xl font-black mb-4 text-slate-800">Đặt hàng thành công!</h1>
        <p className="text-slate-500 mb-8 text-lg">Cảm ơn bạn đã mua sắm tại Stationery Hub. Đơn hàng của bạn đang được xử lý.</p>
        <Button size="lg" className="rounded-xl px-10 shadow-lg" onClick={() => navigate('/profile')}>Xem đơn hàng của tôi</Button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <h2 className="text-2xl font-extrabold mb-6 text-indigo-950">Thông tin giao hàng</h2>
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-xl rounded-2xl">
          <CardContent className="pt-8">
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Họ tên người nhận</label>
                <Input value={user.name} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email</label>
                <Input value={user.email} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Địa chỉ giao hàng *</label>
                <Input
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Nhập địa chỉ đầy đủ"
                  className="focus-visible:ring-violet-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Ghi chú (tuỳ chọn)</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú thêm cho đơn hàng..."
                  className="focus-visible:ring-violet-500"
                />
              </div>
              <div className="space-y-3 pt-2">
                <label className="text-sm font-bold text-slate-700">Phương thức thanh toán</label>
                <div className="flex flex-col space-y-3">
                  <label className={`flex items-center space-x-3 border-2 p-4 rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-violet-500 bg-violet-50/50' : 'border-slate-100 hover:border-violet-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-5 h-5 text-violet-600 focus:ring-violet-500 border-slate-300" />
                    <span className="font-semibold text-slate-700">Thanh toán khi nhận hàng (COD)</span>
                  </label>
                  <label className={`flex items-center space-x-3 border-2 p-4 rounded-xl cursor-pointer transition-all ${paymentMethod === 'transfer' ? 'border-violet-500 bg-violet-50/50' : 'border-slate-100 hover:border-violet-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="payment" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} className="w-5 h-5 text-violet-600 focus:ring-violet-500 border-slate-300" />
                    <span className="font-semibold text-slate-700">Chuyển khoản ngân hàng</span>
                  </label>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded-xl px-4 py-3"
                >
                  {error}
                </motion.div>
              )}
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <h2 className="text-2xl font-extrabold mb-6 text-indigo-950">Tóm tắt đơn hàng</h2>
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden">
          <CardContent className="pt-8 bg-gradient-to-b from-indigo-50/50 to-white/10">
            <ul className="space-y-4 mb-6 relative">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-2">
                  <div className="flex items-center gap-3">
                    <img src={product.image} className="w-12 h-12 rounded bg-slate-100 object-cover" alt={product.name} />
                    <span className="text-slate-800 font-semibold line-clamp-1">{quantity} x {product.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 whitespace-nowrap">{formatCurrency(product.price * quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-indigo-100 pt-6 flex justify-between font-black text-xl">
              <span className="text-slate-800">Tổng cộng</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 font-mono">{formatCurrency(total)}</span>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-8">
              <Button
                type="submit"
                form="checkout-form"
                disabled={isLoading}
                className="w-full rounded-xl py-6 text-lg font-bold shadow-lg shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Đang đặt hàng...
                  </span>
                ) : 'Hoàn tất đặt hàng'}
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
