export type Role = 'user' | 'admin';
export type UserStatus = 'active' | 'locked';
export type OrderStatus = 'pending' | 'shipping' | 'completed' | 'cancelled';
export type PaymentMethod = 'cod' | 'transfer';

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: Role;
  status: UserStatus;
  address?: string;
  phone?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  image: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  address: string;
  paymentMethod: PaymentMethod;
  createdAt: number;
  updatedAt: number;
}
