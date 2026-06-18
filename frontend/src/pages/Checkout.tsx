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
import { motion, AnimatePresence } from 'motion/react';

// Sinh số thẻ giả 16 chữ số – cố định theo từng tài khoản (lưu localStorage)
const getOrCreateCardNumber = (userId: string | number): string => {
  const key = `fake_card_${userId}`;
  const saved = localStorage.getItem(key);
  if (saved) return saved;
  const prefix = ['4539', '4916', '5234', '5412', '3714', '6011'][Math.floor(Math.random() * 6)];
  const rest = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  const card = (prefix + rest).replace(/(\d{4})(?=\d)/g, '$1 ');
  localStorage.setItem(key, card);
  return card;
};

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

  // State thẻ ngân hàng giả
  const [cardNumber] = useState(() => getOrCreateCardNumber(user?.id ?? 'guest'));
  const [cardHolder, setCardHolder] = useState(user?.name?.toUpperCase() || '');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('');
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [cvvError, setCvvError] = useState('');

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (items.length === 0 && !isSuccess) {
    return <Navigate to="/cart" replace />;
  }

  // Format expiry MM/YY
  const handleExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(digits.slice(0, 2) + '/' + digits.slice(2));
    } else {
      setCardExpiry(digits);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;   // chặn double-submit (double-click / Enter liên tục)
    setError('');
    setCvvError('');

    if (!address.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    if (paymentMethod === 'transfer') {
      if (!cardHolder.trim()) {
        setError('Vui lòng nhập tên chủ thẻ.');
        return;
      }
      const month = parseInt(cardExpiry.slice(0, 2), 10);
      if (cardExpiry.length < 5 || isNaN(month) || month < 1 || month > 12) {
        setError('Vui lòng nhập ngày hết hạn hợp lệ (MM/YY).');
        return;
      }
      if (cardCvv.length < 3) {
        setCvvError('Vui lòng nhập mã CVV hợp lệ (3 chữ số).');
        return;
      }
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
        <p className="text-slate-500 mb-8 text-lg">Cảm ơn bạn đã mua sắm tại Văn phòng phẩm Huy Hoàng. Đơn hàng của bạn đang được xử lý.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="rounded-xl px-10 shadow-lg" onClick={() => navigate('/profile')}>Xem đơn hàng của tôi</Button>
          <Button size="lg" variant="outline" className="rounded-xl px-10 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => navigate(-1)}>← Quay lại</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-violet-600 transition-colors group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Quay lại
          </button>
          <span className="text-slate-300">|</span>
          <h2 className="text-2xl font-extrabold text-indigo-950">Thông tin giao hàng</h2>
        </div>
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
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🚚</span>
                      <span className="font-semibold text-slate-700">Thanh toán khi nhận hàng (COD)</span>
                    </div>
                  </label>
                  <label className={`flex items-center space-x-3 border-2 p-4 rounded-xl cursor-pointer transition-all ${paymentMethod === 'transfer' ? 'border-violet-500 bg-violet-50/50' : 'border-slate-100 hover:border-violet-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="payment" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} className="w-5 h-5 text-violet-600 focus:ring-violet-500 border-slate-300" />
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💳</span>
                      <span className="font-semibold text-slate-700">Thẻ ngân hàng / Chuyển khoản</span>
                    </div>
                  </label>
                </div>

                {/* ── UI Thẻ Ngân Hàng Giả ── */}
                <AnimatePresence>
                  {paymentMethod === 'transfer' && (
                    <motion.div
                      initial={{ opacity: 0, y: -12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 pt-1"
                    >
                      {/* Thẻ 3D Flip */}
                      <div
                        className="relative mx-auto"
                        style={{ width: '100%', maxWidth: 340, height: 190, perspective: 1000 }}
                      >
                        <div
                          style={{
                            width: '100%', height: '100%',
                            transition: 'transform 0.6s cubic-bezier(.4,2,.6,1)',
                            transformStyle: 'preserve-3d',
                            transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            position: 'relative'
                          }}
                        >
                          {/* Mặt trước thẻ */}
                          <div
                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                            className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700" />
                            {/* Pattern */}
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                            <div className="relative p-5 h-full flex flex-col justify-between text-white">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-[10px] font-semibold opacity-70 uppercase tracking-widest">VPP Huy Hoàng</p>
                                  <p className="text-xs font-bold opacity-90">Thẻ Demo</p>
                                </div>
                                <div className="flex gap-1">
                                  <div className="w-7 h-7 rounded-full bg-yellow-400 opacity-90" />
                                  <div className="w-7 h-7 rounded-full bg-red-500 opacity-70 -ml-3" />
                                </div>
                              </div>
                              {/* Chip */}
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-inner flex items-center justify-center">
                                  <div className="w-7 h-5 border border-yellow-600/40 rounded grid grid-cols-2 gap-0.5 p-0.5">
                                    {[...Array(4)].map((_,i) => <div key={i} className="bg-yellow-600/30 rounded-sm" />)}
                                  </div>
                                </div>
                              </div>
                              {/* Số thẻ */}
                              <div>
                                <p className="text-lg font-mono font-bold tracking-widest drop-shadow-sm">{cardNumber}</p>
                              </div>
                              {/* Thông tin dưới */}
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-[9px] opacity-60 uppercase tracking-wider">Chủ thẻ</p>
                                  <p className="text-sm font-bold tracking-wide">{cardHolder || 'TEN CHU THE'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] opacity-60 uppercase tracking-wider">Hết hạn</p>
                                  <p className="text-sm font-bold font-mono">{cardExpiry || 'MM/YY'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Mặt sau thẻ */}
                          <div
                            style={{
                              backfaceVisibility: 'hidden',
                              WebkitBackfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)'
                            }}
                            className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
                            <div className="relative h-full flex flex-col justify-between">
                              <div className="mt-6 w-full h-10 bg-slate-950" />
                              <div className="px-5 pb-6 space-y-3">
                                <div className="flex items-center justify-end gap-3">
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">CVV</span>
                                  <div className="bg-white rounded px-3 py-1.5 flex-1 text-center">
                                    <span className="font-mono font-bold text-slate-800 tracking-widest text-sm">
                                      {cardCvv ? '•'.repeat(cardCvv.length) : '•••'}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[9px] text-slate-500 text-center leading-relaxed">
                                  Đây là thẻ demo dùng cho mục đích minh hoạ. Không sử dụng thông tin thẻ thật.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Form nhập thông tin thẻ */}
                      <div className="space-y-3 bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Số thẻ</label>
                          <Input
                            value={cardNumber}
                            disabled
                            className="font-mono tracking-widest bg-white text-slate-400 cursor-not-allowed"
                          />
                          <p className="text-[10px] text-slate-400">* Số thẻ được tạo tự động (demo)</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tên chủ thẻ</label>
                          <Input
                            value={cardHolder}
                            onChange={e => setCardHolder(e.target.value.toUpperCase())}
                            placeholder="TEN CHU THE"
                            className="font-semibold uppercase tracking-wide focus-visible:ring-violet-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ngày hết hạn</label>
                            <Input
                              value={cardExpiry}
                              onChange={e => handleExpiryChange(e.target.value)}
                              placeholder="MM/YY"
                              maxLength={5}
                              className="font-mono focus-visible:ring-violet-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Mã CVV</label>
                            <Input
                              value={cardCvv}
                              onChange={e => {
                                const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                                setCardCvv(v);
                                setCvvError('');
                              }}
                              onFocus={() => setIsCardFlipped(true)}
                              onBlur={() => setIsCardFlipped(false)}
                              placeholder="•••"
                              maxLength={3}
                              type="password"
                              className={`font-mono text-center focus-visible:ring-violet-500 ${cvvError ? 'border-rose-400 ring-1 ring-rose-400' : ''}`}
                            />
                            {cvvError && <p className="text-[10px] text-rose-500 font-medium">{cvvError}</p>}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
