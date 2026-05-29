import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { CartItem, Product } from '../types';
import { cartApi } from '../lib/api';
import { useAuth } from './AuthContext';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  total: number;
  itemCount: number;
  isLoading: boolean;
  syncWithServer: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const currentUserRef = useRef(user);
  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const storedUser = localStorage.getItem('auth_user');
      const userObj = storedUser ? JSON.parse(storedUser) : null;
      const key = userObj ? `cart_items_${userObj.id}` : 'cart_items';
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('[CartContext] Error parsing cart/user from localStorage:', err);
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const prevUserRefForStorage = useRef(user);

  // Lưu trữ cục bộ giỏ hàng tùy theo trạng thái đăng nhập
  useEffect(() => {
    const prevUser = prevUserRefForStorage.current;
    prevUserRefForStorage.current = user;

    // Skip persisting to guest cart immediately on logout to prevent privacy leak
    if (prevUser && !user) {
      return;
    }

    if (!user) {
      localStorage.setItem('cart_items', JSON.stringify(items));
    } else {
      localStorage.setItem(`cart_items_${user.id}`, JSON.stringify(items));
      localStorage.removeItem('cart_items');
    }
  }, [items, user]);

  // Sử dụng itemsRef để tránh stale closure trong useEffect lắng nghe auth thay đổi
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Lưu trữ các thay đổi số lượng đang chờ xử lý để tránh race condition khi nhấn nút nhanh
  const pendingUpdatesRef = useRef<Record<string, { 
    targetQuantity: number; 
    originalQuantity: number; 
    timeoutId: any; 
  }>>({});

  useEffect(() => {
    return () => {
      // Dọn dẹp các timer chưa chạy khi component unmount
      if (pendingUpdatesRef.current) {
        Object.keys(pendingUpdatesRef.current).forEach(key => {
          const pending = pendingUpdatesRef.current[key];
          if (pending && pending.timeoutId) clearTimeout(pending.timeoutId);
        });
      }
    };
  }, []);

  /**
   * Đồng bộ giỏ hàng từ server.
   */
  const syncWithServer = async (): Promise<void> => {
    if (!user) return;
    const syncUserId = user.id;

    setIsLoading(true);
    try {
      const res = await cartApi.getCart();

      // Kiểm tra xem user có bị thay đổi trong quá trình gọi API hay không
      if (currentUserRef.current?.id !== syncUserId) {
        return;
      }

      if (res.success && res.data) {
        const serverItems: CartItem[] = res.data.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
        }));
        setItems(serverItems);
      }
    } catch (err) {
      console.error('[CartContext] Không thể đồng bộ giỏ hàng:', err);
    } finally {
      if (currentUserRef.current?.id === syncUserId) {
        setIsLoading(false);
      }
    }
  };

  // Đồng bộ hoặc merge khi trạng thái đăng nhập (user) thay đổi
  const prevUserRef = useRef<any>(undefined);

  useEffect(() => {
    let active = true;
    const handleAuthChange = async () => {
      const prevUser = prevUserRef.current;
      prevUserRef.current = user;

      // Initial mount
      if (prevUser === undefined) {
        if (user) {
          await syncWithServer();
        }
        return;
      }

      // Đăng nhập (Guest -> Member)
      if (user && !prevUser) {
        const localItems = [...itemsRef.current];
        if (localItems.length > 0) {
          setIsLoading(true);
          try {
            const payload = localItems.map(item => ({
              productId: item.product.id,
              quantity: item.quantity,
            }));
            const res = await cartApi.bulkSyncCart(payload);
            if (!res.success) {
              console.error('[CartContext] Lỗi đồng bộ giỏ hàng bulk:', res.message);
              alert('Không thể đồng bộ giỏ hàng của bạn lên máy chủ.');
            }
          } catch (err) {
            console.error('[CartContext] Lỗi đồng bộ giỏ hàng bulk:', err);
            alert('Có lỗi xảy ra khi đồng bộ giỏ hàng.');
          }
        }
        if (active) {
          await syncWithServer();
        }
      }
      // Đăng xuất (Member -> Guest)
      else if (!user && prevUser) {
        if (active) {
          setItems([]);
          localStorage.removeItem(`cart_items_${prevUser.id}`);
        }
      }
    };

    handleAuthChange();
    return () => {
      active = false;
    };
  }, [user]);

  /**
   * Thêm sản phẩm vào giỏ.
   */
  const addItem = async (product: Product, quantity = 1) => {
    const oldItem = itemsRef.current.find(item => item.product.id === product.id);
    const oldQuantity = oldItem ? oldItem.quantity : 0;

    // Optimistically update local UI immediately
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });

    if (user) {
      setIsLoading(true);
      try {
        const res = await cartApi.addToCart(product.id, quantity);
        if (!res.success) {
          console.error('[CartContext] Lỗi thêm vào giỏ:', res.message);
          // targeted rollback
          setItems(prev => {
            if (oldQuantity > 0) {
              return prev.map(item => item.product.id === product.id ? { ...item, quantity: oldQuantity } : item);
            } else {
              return prev.filter(item => item.product.id !== product.id);
            }
          });
        }
      } catch (err) {
        console.error('[CartContext] Lỗi thêm vào giỏ:', err);
        // targeted rollback
        setItems(prev => {
          if (oldQuantity > 0) {
            return prev.map(item => item.product.id === product.id ? { ...item, quantity: oldQuantity } : item);
          } else {
            return prev.filter(item => item.product.id !== product.id);
          }
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  /**
   * Xoá một sản phẩm khỏi giỏ.
   */
  const removeItem = async (productId: string) => {
    const pending = pendingUpdatesRef.current[productId];
    if (pending && pending.timeoutId) {
      clearTimeout(pending.timeoutId);
      delete pendingUpdatesRef.current[productId];
    }

    const oldItem = itemsRef.current.find(item => item.product.id === productId);

    // Optimistically update local UI immediately using functional state update
    setItems(prev => prev.filter(item => item.product.id !== productId));

    if (user) {
      setIsLoading(true);
      try {
        const res = await cartApi.removeFromCart(productId);
        if (res && !res.success) {
          console.error('[CartContext] Lỗi xoá sản phẩm:', res.message);
          // targeted rollback
          if (oldItem) {
            setItems(prev => prev.some(i => i.product.id === productId) ? prev : [...prev, oldItem]);
          }
          return;
        }
      } catch (err) {
        console.error('[CartContext] Lỗi xoá sản phẩm:', err);
        // targeted rollback
        if (oldItem) {
          setItems(prev => prev.some(i => i.product.id === productId) ? prev : [...prev, oldItem]);
        }
        return;
      } finally {
        setIsLoading(false);
      }
    }
  };

  /**
   * Cập nhật số lượng sản phẩm.
   */
  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }

    // Cập nhật trạng thái local optimistic ngay lập tức để UI mượt mà
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );

    if (!user) {
      // Đối với khách vãng lai, useEffect lưu localStorage tự động hoạt động
      return;
    }

    // Đối với người dùng đã đăng nhập, sử dụng debounce để tránh race condition khi click nhanh
    let pending = pendingUpdatesRef.current[productId];

    if (pending) {
      clearTimeout(pending.timeoutId);
    } else {
      const currentItem = itemsRef.current.find(item => item.product.id === productId);
      const originalQuantity = currentItem ? currentItem.quantity : quantity;
      pending = {
        targetQuantity: quantity,
        originalQuantity,
        timeoutId: null
      };
      pendingUpdatesRef.current[productId] = pending;
    }

    pending.targetQuantity = quantity;

    pending.timeoutId = setTimeout(async () => {
      const latestPending = pendingUpdatesRef.current[productId];
      delete pendingUpdatesRef.current[productId];

      if (!latestPending) return;

      const finalQuantity = latestPending.targetQuantity;
      const originalQuantity = latestPending.originalQuantity;

      setIsLoading(true);
      try {
        const res = await cartApi.updateCartItem(productId, finalQuantity);
        if (!res.success) {
          console.error('[CartContext] Lỗi cập nhật số lượng:', res.message);
          // Rollback về giá trị ban đầu trước chuỗi click nhanh
          setItems(prev =>
            prev.map(item =>
              item.product.id === productId ? { ...item, quantity: originalQuantity } : item
            )
          );
        }
      } catch (err) {
        console.error('[CartContext] Lỗi cập nhật số lượng:', err);
        // Rollback
        setItems(prev =>
          prev.map(item =>
            item.product.id === productId ? { ...item, quantity: originalQuantity } : item
          )
        );
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce 300ms
  };

  const clearCart = async () => {
    if (pendingUpdatesRef.current) {
      Object.keys(pendingUpdatesRef.current).forEach(key => {
        const pending = pendingUpdatesRef.current[key];
        if (pending && pending.timeoutId) clearTimeout(pending.timeoutId);
      });
      pendingUpdatesRef.current = {};
    }

    const previousItems = [...itemsRef.current];

    // Optimistically update local UI immediately
    setItems([]);

    if (user) {
      setIsLoading(true);
      try {
        const res = await cartApi.clearCart();
        if (res && !res.success) {
          console.error('[CartContext] Lỗi xoá giỏ hàng:', res.message);
          // targeted rollback
          setItems(previousItems);
          return;
        }
      } catch (err) {
        console.error('[CartContext] Lỗi xoá giỏ hàng:', err);
        // targeted rollback
        setItems(previousItems);
        return;
      } finally {
        setIsLoading(false);
      }
    }
  };

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount, isLoading, syncWithServer }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
