import React, { createContext, useContext, useEffect, useState } from 'react';
import { Category, Order, Product, User } from '../types';
import { initialCategories, initialProducts, initialUsers } from '../lib/mockData';
import { categoriesApi, productsApi } from '../lib/api';

interface StoreContextType {
  products: Product[];
  categories: Category[];
  orders: Order[];
  users: User[];
  // NOTE: write operations below là local-only cho đến khi có CRUD API
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (name: string, description?: string) => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  toggleUserStatus: (id: string) => void;
  /** Re-fetch products từ API (gọi sau khi có thị trường CRUD thực tế) */
  reloadProducts: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = localStorage.getItem('db_products');
    return stored ? JSON.parse(stored) : [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const stored = localStorage.getItem('db_categories');
    return stored ? JSON.parse(stored) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const stored = localStorage.getItem('db_orders');
    return stored ? JSON.parse(stored) : [];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const stored = localStorage.getItem('db_users');
    return stored ? JSON.parse(stored) : initialUsers;
  });

  // Tải danh mục và sản phẩm từ API thực tế
  useEffect(() => {
    categoriesApi.getCategories()
      .then(res => {
        if (res.success && res.data) {
          setCategories(res.data);
        } else {
          // res.success=false không throw nên phải xử lý tường minh ở đây
          console.error('Lỗi load danh mục từ API:', res.message);
          setCategories(initialCategories);
        }
      })
      .catch(err => {
        console.error('Lỗi kết nối load danh mục:', err);
        setCategories(initialCategories);
      });

    productsApi.getProducts({ limit: 100 })
      .then(res => {
        if (res.success && res.data) {
          setProducts(res.data.products);
        } else {
          // res.success=false không throw nên phải xử lý tường minh ở đây
          console.error('Lỗi load sản phẩm từ API:', res.message);
          setProducts(initialProducts);
        }
      })
      .catch(err => {
        console.error('Lỗi kết nối load sản phẩm:', err);
        setProducts(initialProducts);
      });
  }, []);

  // API là source of truth cho products/categories — không sync ngược vào localStorage
  // (tránh ghi đè dữ liệu cũ chưa được cập nhật vào DB khi remount)
  useEffect(() => localStorage.setItem('db_orders', JSON.stringify(orders)), [orders]);
  // Users synced partially here to see admin updates, actual source of truth for users is shared via localStorage

  // Sync users if auth changed it
  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem('db_users');
      if (stored) setUsers(JSON.parse(stored));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  /** Re-fetch products từ API — gọi lại sau khi có CRUD mutation thực tế */
  const reloadProducts = async () => {
    try {
      const res = await productsApi.getProducts({ limit: 100 });
      if (res.success && res.data) setProducts(res.data.products);
    } catch (err) {
      console.error('Lỗi reload products:', err);
    }
  };

  // NOTE: các hàm dưới đây chỉ cập nhật local state cho đến khi có CRUD API thực tế
  const addProduct = (product: Omit<Product, 'id'>) => {
    setProducts([...products, { ...product, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const updateProduct = (id: string, update: Partial<Product>) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...update } : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const addCategory = async (name: string, description?: string) => {
    try {
      const res = await categoriesApi.createCategory({ name, description });
      if (res.success && res.data) {
        setCategories(prev => [...prev, res.data!]);
      } else {
        alert(res.message || 'Lỗi thêm danh mục');
      }
    } catch (err) {
      console.error('Lỗi thêm danh mục:', err);
      alert('Lỗi kết nối khi thêm danh mục');
    }
  };

  const updateCategory = async (id: string, name: string) => {
    try {
      const res = await categoriesApi.updateCategory(id, { name });
      if (res.success && res.data) {
        setCategories(prev => prev.map(c => c.id === id ? res.data! : c));
      } else {
        alert(res.message || 'Lỗi cập nhật danh mục');
      }
    } catch (err) {
      console.error('Lỗi cập nhật danh mục:', err);
      alert('Lỗi kết nối khi cập nhật danh mục');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const res = await categoriesApi.deleteCategory(id);
      if (res.success) {
        setCategories(prev => prev.filter(c => c.id !== id));
      } else {
        alert(res.message || 'Lỗi xóa danh mục');
      }
    } catch (err) {
      console.error('Lỗi xóa danh mục:', err);
      alert('Lỗi kết nối khi xóa danh mục');
    }
  };

  const addOrder = (order: Order) => {
    setOrders([...orders, order]);
    // Also deduct stock
    const newProducts = [...products];
    order.items.forEach(item => {
      const p = newProducts.find(p => p.id === item.productId);
      if (p) p.stock = Math.max(0, p.stock - item.quantity);
    });
    setProducts(newProducts);
  };

  const updateOrderStatus = (id: string, status: Order['status']) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
  };

  const toggleUserStatus = (id: string) => {
    const updated = users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'active' ? 'locked' : 'active' } as User;
      }
      return u;
    });
    setUsers(updated);
    localStorage.setItem('db_users', JSON.stringify(updated));
  };

  return (
    <StoreContext.Provider value={{
      products, categories, orders, users,
      addProduct, updateProduct, deleteProduct,
      addCategory, updateCategory, deleteCategory,
      addOrder, updateOrderStatus, toggleUserStatus,
      reloadProducts,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
