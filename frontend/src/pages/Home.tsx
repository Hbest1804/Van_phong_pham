import React, { useState, useEffect } from 'react';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { Link, useSearchParams } from 'react-router-dom';
import { ShoppingCart, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { HeroSlider } from '../components/ui/HeroSlider';
import { productsApi, aiApi } from '../lib/api';
import { Product } from '../types';

export function Home() {
  const { categories } = useStore();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const aiSearchQuery = searchParams.get('aiSearch') || '';
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<number>(1000000);
  const [localPrice, setLocalPrice] = useState<number>(1000000);

  // Debounce: chỉ cập nhật priceRange (trigger API) sau 400ms kể từ lần kéo slider cuối cùng
  useEffect(() => {
    if (localPrice === priceRange) return;
    const timer = setTimeout(() => {
      setPriceRange(localPrice);
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('page', '1');
        return newParams;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [localPrice, priceRange, setSearchParams]);

  // State quản lý sản phẩm lấy từ backend
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 12
  });

  const page = Number(searchParams.get('page')) || 1;

  // Gọi API lấy danh sách sản phẩm khi có thay đổi bộ lọc, tìm kiếm, giá hoặc trang
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (aiSearchQuery) {
      aiApi.search(aiSearchQuery)
        .then(res => {
          if (isMounted && res.success && res.data) {
            const filtered = res.data.filter(p => {
              const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
              const matchesPrice = p.price <= priceRange;
              return matchesCategory && matchesPrice;
            });
            setDisplayedProducts(filtered);
            setPagination({
              totalItems: filtered.length,
              totalPages: 1,
              currentPage: 1,
              limit: filtered.length || 12
            });
          }
        })
        .catch(err => {
          console.error('Lỗi tìm kiếm sản phẩm bằng AI:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
      return;
    }

    productsApi.getProducts({
      page,
      limit: 12,
      search: searchQuery || undefined,
      categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
      maxPrice: priceRange
    })
      .then(res => {
        if (isMounted && res.success && res.data) {
          setDisplayedProducts(res.data.products);
          setPagination(res.data.pagination);
        }
      })
      .catch(err => {
        console.error('Lỗi tải sản phẩm:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchQuery, aiSearchQuery, selectedCategory, priceRange, page]);

  // Reset trang về 1 khi đổi danh mục
  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Cập nhật localPrice để UI phản hồi ngay, debounce effect sẽ trigger API sau 400ms
  const handlePriceChange = (val: number) => {
    setLocalPrice(val);
  };

  // Chuyển trang
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(newPage));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
                onClick={() => handleCategoryChange('all')}
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
                  onClick={() => handleCategoryChange(c.id)}
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
              value={localPrice}
              onChange={(e) => handlePriceChange(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="text-sm font-bold text-indigo-600 mt-2">{formatCurrency(localPrice)}</div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {searchQuery && (
            <h2 className="text-2xl font-bold mb-6 text-indigo-950">Kết quả tìm kiếm cho: "{searchQuery}"</h2>
          )}
          {aiSearchQuery && (
            <h2 className="text-2xl font-bold mb-6 text-violet-950 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600 animate-pulse animate-duration-1000" />
              Kết quả tìm kiếm thông minh bằng AI cho: "{aiSearchQuery}"
            </h2>
          )}
          
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-24 gap-4"
              >
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <span className="text-slate-500 font-medium">Đang tải sản phẩm...</span>
              </motion.div>
            ) : displayedProducts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-24 text-slate-500 text-lg"
              >
                Không tìm thấy sản phẩm nào phù hợp.
              </motion.div>
            ) : (
              <motion.div 
                key="grid"
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
                {displayedProducts.map(p => (
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
                          src={p.image || '/placeholder.png'} 
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
          </AnimatePresence>

          {/* Giao diện Phân trang */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-12 pb-6">
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
              >
                Trước
              </Button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={pagination.currentPage === p ? 'default' : 'outline'}
                  onClick={() => handlePageChange(p)}
                  className="w-10 h-10 p-0"
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
