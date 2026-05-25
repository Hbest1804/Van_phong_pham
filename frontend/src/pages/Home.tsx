import React, { useState, useMemo } from 'react';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { Link, useSearchParams } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { HeroSlider } from '../components/ui/HeroSlider';

export function Home() {
  const { products, categories } = useStore();
  const { addItem } = useCart();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<number>(1000000);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchPrice = p.price <= priceRange;
      return matchSearch && matchCategory && matchPrice;
    });
  }, [products, searchQuery, selectedCategory, priceRange]);

  return (
    <div className="flex flex-col gap-8">
      {!searchQuery && <HeroSlider />}
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
      <aside className="w-full md:w-64 space-y-8 bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-indigo-50 h-fit">
        <div>
          <h3 className="font-semibold mb-4 text-indigo-900 border-b border-indigo-100 pb-2">Danh mục</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                selectedCategory === 'all'
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md transform scale-105"
                  : "bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200 hover:scale-105"
              )}
            >
              Tất cả
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                  selectedCategory === c.id
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md transform scale-105"
                    : "bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200 hover:scale-105"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-3 text-indigo-900 border-b border-indigo-100 pb-2">Khoảng giá (Dưới)</h3>
          <input 
            type="range" 
            min="10000" 
            max="1000000" 
            step="10000" 
            value={priceRange}
            onChange={(e) => setPriceRange(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="text-sm font-bold text-indigo-600 mt-2">{formatCurrency(priceRange)}</div>
        </div>
      </aside>

      {/* Product Grid */}
      <div className="flex-1">
        {searchQuery && (
          <h2 className="text-2xl font-bold mb-6 text-indigo-950">Kết quả tìm kiếm cho: "{searchQuery}"</h2>
        )}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Không tìm thấy sản phẩm nào.</div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
          >
            {filteredProducts.map(p => (
              <motion.div
                key={p.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ y: -5 }}
                className="h-full"
              >
                <Card className="group overflow-hidden flex flex-col h-full border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-md">
                  <Link to={`/product/${p.id}`} className="block relative aspect-square overflow-hidden bg-slate-100 p-4">
                    <motion.img 
                      whileHover={{ scale: 1.08 }}
                      transition={{ duration: 0.4 }}
                      src={p.image} 
                      alt={p.name} 
                      className="object-cover w-full h-full rounded-lg shadow-sm" 
                    />
                    {p.stock === 0 && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                        <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase shadow-lg">Hết hàng</span>
                      </div>
                    )}
                  </Link>
                  <CardContent className="flex flex-col flex-1 p-5">
                    <Link to={`/product/${p.id}`} className="block flex-1">
                      <h3 className="font-semibold text-slate-800 line-clamp-2 group-hover:text-violet-600 transition-colors mb-2 text-lg leading-snug">{p.name}</h3>
                      <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">{formatCurrency(p.price)}</p>
                    </Link>
                    <Button 
                      className="mt-5 w-full rounded-xl"
                      disabled={p.stock === 0}
                      onClick={() => addItem(p)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" /> Thêm vào giỏ
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
      </div>
    </div>
  );
}
