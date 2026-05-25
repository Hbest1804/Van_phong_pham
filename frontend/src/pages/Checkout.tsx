import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useStore } from '../contexts/StoreContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';
import { Order, PaymentMethod } from '../types';
import { motion } from 'motion/react';

export function Checkout() {
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const { addOrder } = useStore();
  const navigate = useNavigate();

  const [address, setAddress] = useState(user?.address || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (items.length === 0 && !isSuccess) {
    return <Navigate to="/cart" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      alert('Vui lòng nhập địa chỉ giao hàng');
      return;
    }

    const order: Order = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      items: items.map(i => ({
        productId: i.product.id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity
      })),
      total,
      address,
      paymentMethod,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    addOrder(order);
    clearCart();
    setIsSuccess(true);
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
                <Input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Nhập địa chỉ đầy đủ" className="focus-visible:ring-violet-500" />
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
                     <img src={product.image} className="w-12 h-12 rounded bg-slate-100 object-cover" alt={product.name}/>
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
              <Button type="submit" form="checkout-form" className="w-full rounded-xl py-6 text-lg font-bold shadow-lg shadow-indigo-200" size="lg">Hoàn tất đặt hàng</Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
