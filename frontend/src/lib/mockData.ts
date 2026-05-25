import { Category, Product, User } from '../types';

export const initialCategories: Category[] = [
  { id: 'c1', name: 'Bút viết' },
  { id: 'c2', name: 'Sổ tay' },
  { id: 'c3', name: 'Bìa hồ sơ' },
  { id: 'c4', name: 'Dụng cụ học sinh' },
];

export const initialProducts: Product[] = [
  {
    id: 'p1',
    name: 'Bút bi Thiên Long TL-027',
    description: 'Bút bi chất lượng cao, nét viết trơn, mực đều.',
    price: 4000,
    stock: 500,
    categoryId: 'c1',
    image: 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=500&q=80',
  },
  {
    id: 'p2',
    name: 'Sổ tay bìa da cao cấp',
    description: 'Sổ tay 200 trang, bìa da lộn, giấy chống lóa.',
    price: 120000,
    stock: 50,
    categoryId: 'c2',
    image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500&q=80',
  },
  {
    id: 'p3',
    name: 'Bìa còng nhẫn 3.5cm',
    description: 'Bìa hồ sơ chất liệu nhựa PP siêu bền.',
    price: 35000,
    stock: 120,
    categoryId: 'c3',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&q=80',
  },
  {
    id: 'p4',
    name: 'Bộ thước kẻ hình học',
    description: 'Bộ thước kẻ bằng nhựa trong suốt, an toàn.',
    price: 15000,
    stock: 200,
    categoryId: 'c4',
    image: 'https://images.unsplash.com/photo-1611078726521-4f1659779268?w=500&q=80',
  },
  {
    id: 'p5',
    name: 'Bút dạ quang Stabilo',
    description: 'Bút dạ quang nhiều màu sắc nổi bật.',
    price: 22000,
    stock: 150,
    categoryId: 'c1',
    image: 'https://images.unsplash.com/photo-1596468759392-1fb89eb25bba?w=500&q=80',
  }
];

export const initialUsers: User[] = [
  {
    id: 'admin',
    email: 'admin@stationery.com',
    password: '123',
    name: 'Quản trị viên',
    role: 'admin',
    status: 'active',
  },
  {
    id: 'user',
    email: 'user@gmail.com',
    password: '123',
    name: 'Khách hàng',
    role: 'user',
    status: 'active',
    address: '123 Đường A, Quận 1, TP.HCM',
    phone: '0901234567',
  }
];
