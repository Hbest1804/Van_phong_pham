import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, categories } = useStore();
  const { addItem } = useCart();

  const product = products.find(p => p.id === id);
  if (!product) {
    return (
       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-slate-500">
         Không tìm thấy sản phẩm.
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
          <div className="inline-block w-fit px-3 py-1 mb-4 text-xs font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 rounded-full">
             {category?.name}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">{product.name}</h1>
          <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 mb-6 font-mono">{formatCurrency(product.price)}</p>
          <div className="prose prose-slate prose-lg mb-8 text-slate-600">
            <p className="leading-relaxed">{product.description}</p>
          </div>
          
          <div className="mt-auto pt-8 border-t border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Tình trạng:</span>
              {product.stock > 0 ? (
                <span className="inline-flex items-center text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
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
