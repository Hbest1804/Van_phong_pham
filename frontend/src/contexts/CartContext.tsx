import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, Product } from '../types';
import { cartApi } from '../lib/api';

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
  syncWithServer: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem('cart_items');
    return stored ? JSON.parse(stored) : [];
  });
  // Map productId → cartItemId (UUID server) để gọi PUT/DELETE
  const [cartItemIds, setCartItemIds] = useState<CartItemIdMap>({});
  const [isLoading, setIsLoading] = useState(false);

  // Persist vào localStorage khi items thay đổi
  useEffect(() => {
    localStorage.setItem('cart_items', JSON.stringify(items));
  }, [items]);

  const isLoggedIn = () => !!localStorage.getItem('accessToken');

  /**
   * Đồng bộ giỏ hàng từ server.
   */
  const syncWithServer = async () => {
    if (!isLoggedIn()) return;

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
      }
    } catch (err) {
      console.error('[CartContext] Không thể đồng bộ giỏ hàng:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Tự động sync khi mount nếu user đã đăng nhập
  useEffect(() => {
    syncWithServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Thêm sản phẩm vào giỏ.
   */
  const addItem = async (product: Product, quantity = 1) => {
    if (isLoggedIn()) {
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
    if (isLoggedIn()) {
      const cartItemId = cartItemIds[productId];
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

    if (isLoggedIn()) {
      const cartItemId = cartItemIds[productId];
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
    if (isLoggedIn()) {
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
