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
  syncWithServer: (failedItems?: CartItem[], currentItems?: CartItem[]) => Promise<CartItemIdMap | null>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const currentUserRef = useRef(user);
  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem('cart_items');
    return stored ? JSON.parse(stored) : [];
  });
  // Map productId → cartItemId (UUID server) để gọi PUT/DELETE
  const [cartItemIds, setCartItemIds] = useState<CartItemIdMap>({});
  const [isLoading, setIsLoading] = useState(false);

  // Chỉ lưu local cart khi chưa đăng nhập, hoặc lưu những sản phẩm đồng bộ thất bại khi đã đăng nhập
  useEffect(() => {
    if (!user) {
      localStorage.setItem('cart_items', JSON.stringify(items));
    } else {
      // Khi đã đăng nhập, lọc ra các sản phẩm chưa có trong map cartItemIds (đồng bộ thất bại)
      const unsyncedItems = items.filter(item => !cartItemIds[item.product.id]);
      if (unsyncedItems.length > 0) {
        localStorage.setItem('cart_items', JSON.stringify(unsyncedItems));
      } else {
        localStorage.removeItem('cart_items');
      }
    }
  }, [items, user, cartItemIds]);

  // Sử dụng itemsRef để tránh stale closure trong useEffect lắng nghe auth thay đổi
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  /**
   * Đồng bộ giỏ hàng từ server.
   */
  const syncWithServer = async (failedItems?: CartItem[], currentItems?: CartItem[]): Promise<CartItemIdMap | null> => {
    if (!user) return null;
    const syncUserId = user.id;

    // Lấy các sản phẩm chưa đồng bộ (không có trong cartItemIds) làm fallback nếu không truyền failedItems
    const itemsToMerge = failedItems || (currentItems || itemsRef.current).filter(item => !cartItemIds[item.product.id]);

    setIsLoading(true);
    try {
      const res = await cartApi.getCart();

      // Kiểm tra xem user có bị thay đổi trong quá trình gọi API hay không
      if (currentUserRef.current?.id !== syncUserId) {
        return null;
      }

      if (res.success && res.data) {
        const serverItems: CartItem[] = res.data.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
        }));

        // Gộp các sản phẩm đồng bộ thất bại vào giỏ hàng hiển thị
        const mergedItems = [...serverItems];
        itemsToMerge.forEach(failed => {
          const exists = mergedItems.some(item => item.product.id === failed.product.id);
          if (!exists) {
            mergedItems.push(failed);
          }
        });
        setItems(mergedItems);

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
      if (currentUserRef.current?.id === syncUserId) {
        setIsLoading(false);
      }
    }
    return null;
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
          const failedItems: CartItem[] = [];
          const failedNames: string[] = [];

          // Đẩy tất cả local items lên server tuần tự để tránh nghẽn/rate-limiting/race condition
          for (const item of localItems) {
            if (!active) return;
            try {
              const res = await cartApi.addToCart(item.product.id, item.quantity);
              if (!res.success) {
                console.error(`[CartContext] Lỗi đồng bộ SP ${item.product.name}:`, res.message);
                failedItems.push(item);
                failedNames.push(item.product.name);
              }
            } catch (err) {
              console.error(`[CartContext] Lỗi đồng bộ SP ${item.product.name}:`, err);
              failedItems.push(item);
              failedNames.push(item.product.name);
            }
          }

          if (failedNames.length > 0 && active) {
            alert(`Không thể đồng bộ một số sản phẩm vào giỏ hàng trên máy chủ (có thể do hết hàng hoặc lỗi kết nối):\n- ${failedNames.join('\n- ')}`);
          }

          // Đồng bộ lại giỏ hàng từ server, gộp các sản phẩm thất bại
          if (active) {
            await syncWithServer(failedItems);
          }
        } else {
          if (active) {
            await syncWithServer();
          }
        }
      }
      // Đăng xuất (Member -> Guest)
      else if (!user && prevUser) {
        if (active) {
          setItems([]);
          setCartItemIds({});
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
    const oldItem = items.find(item => item.product.id === product.id);
    const oldQuantity = oldItem ? oldItem.quantity : 0;
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
          // targeted rollback
          setItems(prev => {
            if (oldQuantity > 0) {
              return prev.map(item => item.product.id === product.id ? { ...item, quantity: oldQuantity } : item);
            } else {
              return prev.filter(item => item.product.id !== product.id);
            }
          });
          setCartItemIds(previousIds);
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
    const oldItem = items.find(item => item.product.id === productId);
    const previousIds = { ...cartItemIds };
    const optimisticItems = items.filter(item => item.product.id !== productId);

    // Optimistically update local UI immediately
    setItems(optimisticItems);

    if (user) {
      let cartItemId = cartItemIds[productId];
      if (!cartItemId) {
        // Đồng bộ lại nếu thiếu mapping
        const freshIdMap = await syncWithServer(undefined, optimisticItems);
        if (freshIdMap) {
          cartItemId = freshIdMap[productId];
          // Re-apply optimistic update since syncWithServer overwrote it
          setItems(prev => prev.filter(item => item.product.id !== productId));
        }
      }

      if (cartItemId) {
        setIsLoading(true);
        try {
          const res = await cartApi.removeFromCart(cartItemId);
          if (res && !res.success) {
            console.error('[CartContext] Lỗi xoá sản phẩm:', res.message);
            // targeted rollback
            if (oldItem) {
              setItems(prev => prev.some(i => i.product.id === productId) ? prev : [...prev, oldItem]);
            }
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
          // targeted rollback
          if (oldItem) {
            setItems(prev => prev.some(i => i.product.id === productId) ? prev : [...prev, oldItem]);
          }
          setCartItemIds(previousIds);
          return;
        } finally {
          setIsLoading(false);
        }
      } else {
        console.warn(`[CartContext] Không tìm thấy cartItemId cho sản phẩm ${productId} trên server.`);
        // targeted rollback
        if (oldItem) {
          setItems(prev => prev.some(i => i.product.id === productId) ? prev : [...prev, oldItem]);
        }
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

    const oldItem = items.find(item => item.product.id === productId);
    const oldQuantity = oldItem ? oldItem.quantity : null;
    const previousIds = { ...cartItemIds };

    const optimisticItems = items.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    // Optimistically update local UI immediately
    setItems(optimisticItems);

    if (user) {
      let cartItemId = cartItemIds[productId];
      if (!cartItemId) {
        // Đồng bộ lại nếu thiếu mapping
        const freshIdMap = await syncWithServer(undefined, optimisticItems);
        if (freshIdMap) {
          cartItemId = freshIdMap[productId];
          // Re-apply optimistic update since syncWithServer overwrote it
          setItems(prev =>
            prev.map(item =>
              item.product.id === productId ? { ...item, quantity } : item
            )
          );
        }
      }

      if (cartItemId) {
        setIsLoading(true);
        try {
          const res = await cartApi.updateCartItem(cartItemId, quantity);
          if (!res.success) {
            console.error('[CartContext] Lỗi cập nhật số lượng:', res.message);
            // targeted rollback
            if (oldQuantity !== null) {
              setItems(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: oldQuantity } : item));
            } else {
              setItems(prev => prev.filter(item => item.product.id !== productId));
            }
            setCartItemIds(previousIds);
            return;
          }
        } catch (err) {
          console.error('[CartContext] Lỗi cập nhật số lượng:', err);
          // targeted rollback
          if (oldQuantity !== null) {
            setItems(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: oldQuantity } : item));
          } else {
            setItems(prev => prev.filter(item => item.product.id !== productId));
          }
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
            // targeted rollback
            if (oldQuantity !== null) {
              setItems(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: oldQuantity } : item));
            } else {
              setItems(prev => prev.filter(item => item.product.id !== productId));
            }
            setCartItemIds(previousIds);
            return;
          }
        } catch (err) {
          console.error('[CartContext] Lỗi tự động thêm vào giỏ khi updateQuantity:', err);
          // targeted rollback
          if (oldQuantity !== null) {
            setItems(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: oldQuantity } : item));
          } else {
            setItems(prev => prev.filter(item => item.product.id !== productId));
          }
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
          // targeted rollback
          setItems(previousItems);
          setCartItemIds(previousIds);
          return;
        }
        setCartItemIds({});
      } catch (err) {
        console.error('[CartContext] Lỗi xoá giỏ hàng:', err);
        // targeted rollback
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
