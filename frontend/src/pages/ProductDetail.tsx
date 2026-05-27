import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';
import { productsApi } from '../lib/api';
import { Product } from '../types';
import { ArrowLeft, ShoppingCart, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories } = useStore();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    productsApi.getProductById(id)
      .then(res => {
        if (res.success && res.data) {
          setProduct(res.data);
        } else {
          setError(res.message || 'Không tìm thấy sản phẩm.');
        }
      })
      .catch(() => {
        setError('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 sm:p-10 border border-white">
        <div className="flex items-center gap-3 mb-6 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Đang tải sản phẩm...</span>
        </div>
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 animate-pulse">
          <div className="aspect-square bg-slate-100 rounded-2xl" />
          <div className="flex flex-col gap-4">
            <div className="h-5 w-24 bg-slate-100 rounded-full" />
            <div className="h-10 w-3/4 bg-slate-100 rounded-lg" />
            <div className="h-8 w-1/2 bg-slate-100 rounded-lg" />
            <div className="space-y-2 mt-2">
              <div className="h-4 bg-slate-100 rounded" />
              <div className="h-4 bg-slate-100 rounded w-5/6" />
              <div className="h-4 bg-slate-100 rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error / not found ───────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto mt-16 text-center bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-10 border border-white"
      >
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy sản phẩm</h2>
        <p className="text-slate-500 mb-6">{error ?? 'Sản phẩm không tồn tại hoặc đã bị xoá.'}</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
        </Button>
      </motion.div>
    );
  }

  const category = categories.find(c => c.id === product.categoryId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden p-6 sm:p-10 border border-white"
    >
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-4 text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
      </Button>
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 shadow-inner p-4"
        >
          <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-xl" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-col"
        >
          {category && (
            <div className="inline-block w-fit px-3 py-1 mb-4 text-xs font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 rounded-full">
              {category.name}
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">{product.name}</h1>
          <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 mb-6 font-mono">
            {formatCurrency(product.price)}
          </p>
          <div className="prose prose-slate prose-lg mb-8 text-slate-600">
            <p className="leading-relaxed">{product.description}</p>
          </div>

          <div className="mt-auto pt-8 border-t border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Tình trạng:</span>
              {product.stock > 0 ? (
                <span className="inline-flex items-center text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  Còn {product.stock} sản phẩm
                </span>
              ) : (
                <span className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">Hết hàng</span>
              )}
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="w-full sm:w-auto px-10 rounded-xl shadow-lg hover:shadow-xl"
                disabled={product.stock === 0}
                onClick={() => {
                  addItem(product);
                  navigate('/cart');
                }}
              >
                <ShoppingCart className="w-5 h-5 mr-3" /> Thêm vào Giỏ Hàng
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
