import React from 'react';
import { useCart } from '../contexts/CartContext';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Cart() {
  const { items, updateQuantity, removeItem, total } = useCart();

  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-slate-500">
        <ShoppingBag className="w-24 h-24 mb-6 text-indigo-200" />
        <h2 className="text-2xl font-semibold mb-6 text-indigo-900">Giỏ hàng của bạn đang trống</h2>
        <Link to="/">
          <Button size="lg" className="rounded-xl px-10 shadow-lg">Khám phá sản phẩm</Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-8 text-indigo-950">Giỏ hàng ({items.length})</h1>
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white overflow-hidden">
        <ul className="divide-y divide-indigo-50">
          <AnimatePresence>
            {items.map(({ product, quantity }) => (
              <motion.li 
                layout
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                key={product.id} 
                className="flex items-center p-4 sm:p-6 gap-6 hover:bg-slate-50/50 transition-colors"
              >
                <div className="relative">
                  <img src={product.image} alt={product.name} className="w-24 h-24 object-cover rounded-xl bg-slate-100 shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${product.id}`} className="text-lg font-bold text-slate-800 hover:text-violet-600 line-clamp-2 transition-colors mb-2">{product.name}</Link>
                  <div className="text-indigo-600 font-black">{formatCurrency(product.price)}</div>
                </div>
                <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded disabled:opacity-50" onClick={() => updateQuantity(product.id, quantity - 1)}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-10 text-center font-bold text-slate-700">{quantity}</span>
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded disabled:opacity-50" onClick={() => updateQuantity(product.id, quantity + 1)} disabled={quantity >= product.stock}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-right w-32 hidden sm:block font-black text-slate-800 text-lg">
                  {formatCurrency(product.price * quantity)}
                </div>
                <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full h-10 w-10 p-0 ml-2" onClick={() => removeItem(product.id)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <div className="p-6 sm:p-8 bg-gradient-to-r from-indigo-50 to-violet-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="text-lg font-medium text-slate-600">
              Tổng cộng: <br className="sm:hidden" />
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 sm:ml-2 font-mono">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link to="/" className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-violet-600 transition-colors group">
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Trang chủ
            </Link>
            <Link to="/checkout" className="flex-1 sm:flex-none">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="w-full rounded-xl px-12 py-6 text-lg font-bold shadow-xl shadow-indigo-200">
                  Thanh toán
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
