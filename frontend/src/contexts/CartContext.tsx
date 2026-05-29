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
          try {
            // Đẩy tất cả local items lên server
            await Promise.all(
              localItems.map(item =>
                cartApi.addToCart(item.product.id, item.quantity)
              )
            );
          } catch (err) {
            console.error('[CartContext] Lỗi đồng bộ giỏ hàng vô danh lên server:', err);
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
    if (user) {
      setIsLoading(true);
      try {
        const res = await cartApi.addToCart(product.id, quantity);
        if (res.success && res.data) {
          // Lưu cartItemId mới nhận về
          setCartItemIds(prev => ({ ...prev, [product.id]: res.data!.cartItemId }));
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
        }
      } catch (err) {
        console.error('[CartContext] Lỗi thêm vào giỏ:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
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
    }
  };

  /**
   * Xoá một sản phẩm khỏi giỏ.
   */
  const removeItem = async (productId: string) => {
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
          await cartApi.removeFromCart(cartItemId);
          setCartItemIds(prev => {
            const next = { ...prev };
            delete next[productId];
            return next;
          });
        } catch (err) {
          console.error('[CartContext] Lỗi xoá sản phẩm:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.warn(`[CartContext] Không tìm thấy cartItemId cho sản phẩm ${productId} trên server.`);
      }
    }
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  /**
   * Cập nhật số lượng sản phẩm.
   */
  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }

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
          await cartApi.updateCartItem(cartItemId, quantity);
        } catch (err) {
          console.error('[CartContext] Lỗi cập nhật số lượng:', err);
          return; // Không cập nhật local nếu server lỗi
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
          }
        } catch (err) {
          console.error('[CartContext] Lỗi tự động thêm vào giỏ khi updateQuantity:', err);
          return;
        } finally {
          setIsLoading(false);
        }
      }
    }

    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  /**
   * Xoá toàn bộ giỏ hàng.
   */
  const clearCart = async () => {
    if (user) {
      setIsLoading(true);
      try {
        await cartApi.clearCart();
        setCartItemIds({});
      } catch (err) {
        console.error('[CartContext] Lỗi xoá giỏ hàng:', err);
      } finally {
        setIsLoading(false);
      }
    }
    setItems([]);
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
