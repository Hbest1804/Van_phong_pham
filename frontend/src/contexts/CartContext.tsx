import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { CartItem, Product } from '../types';
import { cartApi } from '../lib/api';
import { useAuth } from './AuthContext';

// cartItemId map: productId → cartItemId (UUID từ server)
type CartItemIdMap = Record<string, string>;

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  total: number;
  itemCount: number;
  isLoading: boolean;
  syncWithServer: () => Promise<CartItemIdMap | null>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem('cart_items');
    return stored ? JSON.parse(stored) : [];
  });
  // Map productId → cartItemId (UUID server) để gọi PUT/DELETE
  const [cartItemIds, setCartItemIds] = useState<CartItemIdMap>({});
  const [isLoading, setIsLoading] = useState(false);

  // Chỉ lưu local cart khi chưa đăng nhập, xoá đi khi đã đăng nhập
  useEffect(() => {
    if (!user) {
      localStorage.setItem('cart_items', JSON.stringify(items));
    } else {
      localStorage.removeItem('cart_items');
    }
  }, [items, user]);

  /**
   * Đồng bộ giỏ hàng từ server.
   */
  const syncWithServer = async (): Promise<CartItemIdMap | null> => {
    if (!user) return null;

    setIsLoading(true);
    try {
      const res = await cartApi.getCart();
      if (res.success && res.data) {
        const serverItems: CartItem[] = res.data.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
        }));
        setItems(serverItems);

        // Cập nhật map productId → cartItemId
        const idMap: CartItemIdMap = {};
        res.data.items.forEach(item => {
          idMap[item.product.id] = item.cartItemId;
        });
        setCartItemIds(idMap);
        return idMap;
      }
    } catch (err) {
      console.error('[CartContext] Không thể đồng bộ giỏ hàng:', err);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  // Sử dụng itemsRef để tránh stale closure trong useEffect lắng nghe auth thay đổi
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Đồng bộ hoặc merge khi trạng thái đăng nhập (user) thay đổi
  const prevUserRef = useRef<any>(undefined);

  useEffect(() => {
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
          // Đẩy tất cả local items lên server tuần tự để tránh nghẽn/rate-limiting/race condition
          for (const item of localItems) {
            try {
              const res = await cartApi.addToCart(item.product.id, item.quantity);
              if (!res.success) {
                console.error(`[CartContext] Lỗi đồng bộ SP ${item.product.name}:`, res.message);
              }
            } catch (err) {
              console.error(`[CartContext] Lỗi đồng bộ SP ${item.product.name}:`, err);
            }
          }
        }
        // Đồng bộ lại giỏ hàng từ server
        await syncWithServer();
      }
      // Đăng xuất (Member -> Guest)
      else if (!user && prevUser) {
        setItems([]);
        setCartItemIds({});
      }
    };

    handleAuthChange();
  }, [user]);

  /**
   * Thêm sản phẩm vào giỏ.
   */
  const addItem = async (product: Product, quantity = 1) => {
    const previousItems = [...items];
    const previousIds = { ...cartItemIds };

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
        if (res.success && res.data) {
          // Lưu cartItemId mới nhận về
          setCartItemIds(prev => ({ ...prev, [product.id]: res.data!.cartItemId }));
        } else {
          console.error('[CartContext] Lỗi thêm vào giỏ:', res.message);
          // Rollback
          setItems(previousItems);
          setCartItemIds(previousIds);
        }
      } catch (err) {
        console.error('[CartContext] Lỗi thêm vào giỏ:', err);
        // Rollback
        setItems(previousItems);
        setCartItemIds(previousIds);
      } finally {
        setIsLoading(false);
      }
    }
  };

  /**
   * Xoá một sản phẩm khỏi giỏ.
   */
  const removeItem = async (productId: string) => {
    const previousItems = [...items];
    const previousIds = { ...cartItemIds };

    // Optimistically update local UI immediately
    setItems(prev => prev.filter(item => item.product.id !== productId));

    if (user) {
      let cartItemId = cartItemIds[productId];
      if (!cartItemId) {
        // Đồng bộ lại nếu thiếu mapping
        const freshIdMap = await syncWithServer();
        if (freshIdMap) {
          cartItemId = freshIdMap[productId];
        }
      }

      if (cartItemId) {
        setIsLoading(true);
        try {
          const res = await cartApi.removeFromCart(cartItemId);
          if (res && !res.success) {
            console.error('[CartContext] Lỗi xoá sản phẩm:', res.message);
            // Rollback
            setItems(previousItems);
            setCartItemIds(previousIds);
            return;
          }
          setCartItemIds(prev => {
            const next = { ...prev };
            delete next[productId];
            return next;
          });
        } catch (err) {
          console.error('[CartContext] Lỗi xoá sản phẩm:', err);
          // Rollback
          setItems(previousItems);
          setCartItemIds(previousIds);
          return;
        } finally {
          setIsLoading(false);
        }
      } else {
        console.warn(`[CartContext] Không tìm thấy cartItemId cho sản phẩm ${productId} trên server.`);
        // Rollback
        setItems(previousItems);
        setCartItemIds(previousIds);
        return;
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

    const previousItems = [...items];
    const previousIds = { ...cartItemIds };

    // Optimistically update local UI immediately
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );

    if (user) {
      let cartItemId = cartItemIds[productId];
      if (!cartItemId) {
        // Đồng bộ lại nếu thiếu mapping
        const freshIdMap = await syncWithServer();
        if (freshIdMap) {
          cartItemId = freshIdMap[productId];
        }
      }

      if (cartItemId) {
        setIsLoading(true);
        try {
          const res = await cartApi.updateCartItem(cartItemId, quantity);
          if (!res.success) {
            console.error('[CartContext] Lỗi cập nhật số lượng:', res.message);
            // Rollback
            setItems(previousItems);
            setCartItemIds(previousIds);
            return;
          }
        } catch (err) {
          console.error('[CartContext] Lỗi cập nhật số lượng:', err);
          // Rollback
          setItems(previousItems);
          setCartItemIds(previousIds);
          return;
        } finally {
          setIsLoading(false);
        }
      } else {
        // Tự động thêm vào giỏ trên server nếu chưa có
        setIsLoading(true);
        try {
          const res = await cartApi.addToCart(productId, quantity);
          if (res.success && res.data) {
            setCartItemIds(prev => ({ ...prev, [productId]: res.data!.cartItemId }));
          } else {
            console.error('[CartContext] Lỗi tự động thêm vào giỏ:', res.message);
            // Rollback
            setItems(previousItems);
            setCartItemIds(previousIds);
            return;
          }
        } catch (err) {
          console.error('[CartContext] Lỗi tự động thêm vào giỏ khi updateQuantity:', err);
          // Rollback
          setItems(previousItems);
          setCartItemIds(previousIds);
          return;
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  /**
   * Xoá toàn bộ giỏ hàng.
   */
  const clearCart = async () => {
    const previousItems = [...items];
    const previousIds = { ...cartItemIds };

    // Optimistically update local UI immediately
    setItems([]);

    if (user) {
      setIsLoading(true);
      try {
        const res = await cartApi.clearCart();
        if (res && !res.success) {
          console.error('[CartContext] Lỗi xoá giỏ hàng:', res.message);
          // Rollback
          setItems(previousItems);
          setCartItemIds(previousIds);
          return;
        }
        setCartItemIds({});
      } catch (err) {
        console.error('[CartContext] Lỗi xoá giỏ hàng:', err);
        // Rollback
        setItems(previousItems);
        setCartItemIds(previousIds);
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
