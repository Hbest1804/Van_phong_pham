# Backend API - TTTN

RESTful API backend built with **Node.js + Express + JavaScript (ESModule) + Supabase**

## 🚀 Quick Start

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env từ example
copy .env.example .env
# Rồi điền thông tin Supabase và JWT secrets vào .env

# 3. Chạy dev server (auto-reload khi thay đổi file)
npm run dev
```

Server sẽ chạy tại `http://localhost:5000`

## 📁 Cấu trúc thư mục

```
backend/
├── src/
│   ├── server.js              # Entry point - khởi động server
│   ├── app.js                 # Express app setup + middleware
│   ├── config/
│   │   ├── env.js             # Đọc và validate biến môi trường
│   │   └── supabase.js        # Khởi tạo Supabase client
│   ├── middlewares/
│   │   ├── auth.middleware.js  # Kiểm tra JWT + phân quyền role
│   │   ├── validate.middleware.js  # Validate dữ liệu request
│   │   ├── errorHandler.js    # Xử lý lỗi toàn cục
│   │   └── notFound.js        # Trả về 404
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── product.routes.js
│   │   ├── category.routes.js
│   │   └── order.routes.js
│   ├── controllers/           # Nhận request → gọi service → trả response
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── product.controller.js
│   │   ├── category.controller.js
│   │   └── order.controller.js
│   ├── services/              # Business logic + gọi Supabase
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── product.service.js
│   │   ├── category.service.js
│   │   └── order.service.js
│   └── utils/
│       ├── AppError.js        # Custom error class
│       ├── jwt.js             # Tạo và xác thực JWT token
│       └── response.js        # Helper gửi response chuẩn
├── supabase/
│   └── schema.sql             # SQL tạo bảng trên Supabase
├── .env.example               # Mẫu biến môi trường
├── .gitignore
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Auth
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/v1/auth/register` | Đăng ký |
| POST | `/api/v1/auth/login` | Đăng nhập |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| POST | `/api/v1/auth/logout` | Đăng xuất |
| GET  | `/api/v1/auth/me` | Lấy thông tin bản thân |

### Users (Admin only)
| Method | Path | Mô tả |
|--------|------|-------|
| GET    | `/api/users?page&limit` | Danh sách người dùng |
| GET    | `/api/users/:id` | Chi tiết người dùng |
| PATCH  | `/api/users/:id` | Cập nhật người dùng |
| DELETE | `/api/users/:id` | Xoá người dùng |

### Products (Public đọc / Admin ghi)
| Method | Path | Mô tả |
|--------|------|-------|
| GET    | `/api/products?page&limit&categoryId&search` | Danh sách sản phẩm |
| GET    | `/api/products/:id` | Chi tiết sản phẩm |
| POST   | `/api/products` | Tạo sản phẩm |
| PUT    | `/api/products/:id` | Cập nhật sản phẩm |
| DELETE | `/api/products/:id` | Xoá sản phẩm |

### Categories
| Method | Path | Mô tả |
|--------|------|-------|
| GET    | `/api/categories` | Danh sách danh mục |
| GET    | `/api/categories/:id` | Chi tiết danh mục |
| POST   | `/api/categories` | Tạo danh mục |
| PUT    | `/api/categories/:id` | Cập nhật danh mục |
| DELETE | `/api/categories/:id` | Xoá danh mục |

### Orders
| Method | Path | Mô tả |
|--------|------|-------|
| POST   | `/api/orders` | Đặt hàng |
| GET    | `/api/orders/my` | Đơn hàng của tôi |
| GET    | `/api/orders/:id` | Chi tiết đơn hàng |
| GET    | `/api/orders` | Tất cả đơn hàng (Admin) |
| PATCH  | `/api/orders/:id/status` | Cập nhật trạng thái (Admin) |

## 🗄️ Database Setup (Supabase)

1. Tạo project mới tại [supabase.com](https://supabase.com)
2. Vào **SQL Editor** và chạy file `supabase/schema.sql`
3. Lấy `URL` và keys từ **Project Settings → API**
4. Điền vào file `.env`

## 💡 Luồng xử lý Request

```
Request → Route → Middleware (Auth/Validate) → Controller → Service → Supabase → Response
```
