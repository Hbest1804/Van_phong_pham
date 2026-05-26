# 🛒 Website Bán Văn Phòng Phẩm Trực Tuyến


Hệ thống thương mại điện tử chuyên biệt cho ngành hàng văn phòng phẩm, phục vụ học sinh, sinh viên, nhân viên văn phòng và các cơ sở kinh doanh. Được xây dựng theo kiến trúc **Client-Server** tách biệt hoàn toàn giữa frontend và backend.

---

## 📁 Cấu trúc Monorepo

```
tttn/
├── frontend/          # Giao diện người dùng (ReactJS + Vite)
├── backend/           # REST API Server (Node.js + Express)

```

---

## 🏗️ Kiến trúc Hệ thống

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                  │
│              ReactJS SPA - Port 3000                │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP REST API
                      ▼
┌─────────────────────────────────────────────────────┐
│               BACKEND (Node.js/Express)             │
│                    Port 5000                        │
│  Routes → Middlewares → Controllers → Services      │
└─────────────────────┬───────────────────────────────┘
                      │ Supabase JS Client
                      ▼
┌─────────────────────────────────────────────────────┐
│                  SUPABASE (BaaS)                    │
│   PostgreSQL Database │ Auth │ Storage (Images)     │
└─────────────────────────────────────────────────────┘
```

**Luồng xử lý Request:**
```
Request → Route → Middleware (Auth/Validate) → Controller → Service → Supabase → Response
```

---

## 🖥️ Frontend

### Thông tin

| Mục | Chi tiết |
|-----|---------|
| Thư mục | `frontend/` |
| Framework | ReactJS 19 + Vite 6 |
| Ngôn ngữ | TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router DOM v7 |
| Charts | Recharts |
| Animation | Motion |
| Port | `3000` |

### Cấu trúc thư mục

```
frontend/
├── src/
│   ├── App.tsx                    # Cấu hình routing chính
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Global styles
│   ├── types.ts                   # TypeScript types dùng chung
│   ├── pages/
│   │   ├── Home.tsx               # Trang chủ - danh sách sản phẩm
│   │   ├── ProductDetail.tsx      # Trang chi tiết sản phẩm
│   │   ├── Cart.tsx               # Giỏ hàng
│   │   ├── Checkout.tsx           # Trang đặt hàng & thanh toán
│   │   ├── Profile.tsx            # Thông tin cá nhân & lịch sử đơn hàng
│   │   ├── Auth/
│   │   │   ├── Login.tsx          # Đăng nhập
│   │   │   └── Register.tsx       # Đăng ký
│   │   └── Admin/
│   │       ├── Dashboard.tsx      # Thống kê doanh thu, biểu đồ
│   │       ├── Products.tsx       # Quản lý sản phẩm (CRUD)
│   │       ├── Categories.tsx     # Quản lý danh mục (CRUD)
│   │       ├── Orders.tsx         # Quản lý đơn hàng
│   │       └── Users.tsx          # Quản lý người dùng
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx     # Layout cho trang user
│   │   │   └── AdminLayout.tsx    # Layout cho trang admin
│   │   └── ui/                    # UI components tái sử dụng
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Quản lý trạng thái đăng nhập
│   │   ├── StoreContext.tsx       # Quản lý dữ liệu sản phẩm, danh mục
│   │   └── CartContext.tsx        # Quản lý giỏ hàng
│   └── lib/                       # Utility functions
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Các trang & Routes

| Route | Trang | Mô tả |
|-------|-------|-------|
| `/` | Home | Danh sách sản phẩm, tìm kiếm, lọc theo danh mục |
| `/product/:id` | ProductDetail | Chi tiết sản phẩm, thêm vào giỏ |
| `/login` | Login | Đăng nhập tài khoản |
| `/register` | Register | Đăng ký tài khoản mới |
| `/cart` | Cart | Xem & chỉnh sửa giỏ hàng |
| `/checkout` | Checkout | Nhập địa chỉ, chọn thanh toán, đặt hàng |
| `/profile` | Profile | Thông tin cá nhân, lịch sử đơn hàng |
| `/admin` | Dashboard | Thống kê doanh thu, đơn hàng |
| `/admin/products` | Products | Quản lý sản phẩm |
| `/admin/categories` | Categories | Quản lý danh mục |
| `/admin/orders` | Orders | Quản lý đơn hàng |
| `/admin/users` | Users | Quản lý người dùng |

### Cài đặt & Chạy

```bash
cd frontend
npm install
cp .env.example .env   # Điền các biến môi trường
npm run dev            # http://localhost:3000
```

---

## ⚙️ Backend

### Thông tin

| Mục | Chi tiết |
|-----|---------|
| Thư mục | `backend/` |
| Runtime | Node.js |
| Framework | Express.js v4 |
| Ngôn ngữ | JavaScript (ESModule) |
| Database | PostgreSQL via Supabase |
| Authentication | JWT (Access Token 15m + Refresh Token 7d) |
| Port | `5000` |

### Cấu trúc thư mục

```
backend/
├── src/
│   ├── server.js                  # Entry point - khởi động server
│   ├── app.js                     # Express app, đăng ký middleware & routes
│   ├── config/
│   │   ├── env.js                 # Đọc và validate biến môi trường
│   │   └── supabase.js            # Khởi tạo Supabase client (anon + admin)
│   ├── middlewares/
│   │   ├── auth.middleware.js     # Xác thực JWT, phân quyền theo role
│   │   ├── validate.middleware.js # Validate dữ liệu đầu vào (express-validator)
│   │   ├── errorHandler.js        # Xử lý lỗi toàn cục
│   │   └── notFound.js            # Trả về 404
│   ├── routes/
│   │   ├── auth.routes.js         # /api/auth/*
│   │   ├── user.routes.js         # /api/users/*
│   │   ├── product.routes.js      # /api/products/*
│   │   ├── category.routes.js     # /api/categories/*
│   │   └── order.routes.js        # /api/orders/*
│   ├── controllers/               # Nhận request → gọi service → trả response
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── product.controller.js
│   │   ├── category.controller.js
│   │   └── order.controller.js
│   ├── services/                  # Business logic + truy vấn Supabase
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── product.service.js
│   │   ├── category.service.js
│   │   └── order.service.js
│   └── utils/
│       ├── AppError.js            # Custom error class
│       ├── jwt.js                 # Tạo & xác thực JWT token
│       └── response.js            # Helper gửi response chuẩn (JSON)
├── supabase/
│   └── schema.sql                 # SQL tạo bảng, index cho Supabase
├── .env.example
├── .gitignore
└── package.json
```

### API Endpoints

#### 🔐 Auth — `/api/auth`
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/register` | Đăng ký tài khoản | ❌ |
| POST | `/login` | Đăng nhập, nhận token | ❌ |
| POST | `/refresh-token` | Làm mới access token | ❌ |
| POST | `/logout` | Đăng xuất | ✅ |
| GET | `/me` | Thông tin tài khoản hiện tại | ✅ |

#### 👥 Users — `/api/users` *(Admin only)*
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/` | Danh sách người dùng (phân trang) |
| GET | `/:id` | Chi tiết người dùng |
| PATCH | `/:id` | Cập nhật thông tin / khoá tài khoản |
| DELETE | `/:id` | Xoá người dùng |

#### 📦 Products — `/api/products`
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/?page&limit&categoryId&search` | ❌ | Danh sách sản phẩm (tìm kiếm, lọc, phân trang) |
| GET | `/:id` | ❌ | Chi tiết sản phẩm |
| POST | `/` | Admin | Tạo sản phẩm mới |
| PUT | `/:id` | Admin | Cập nhật sản phẩm |
| DELETE | `/:id` | Admin | Xoá sản phẩm |

#### 🏷️ Categories — `/api/categories`
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/` | ❌ | Tất cả danh mục |
| GET | `/:id` | ❌ | Chi tiết danh mục |
| POST | `/` | Admin | Tạo danh mục |
| PUT | `/:id` | Admin | Cập nhật danh mục |
| DELETE | `/:id` | Admin | Xoá danh mục |

#### 🧾 Orders — `/api/orders`
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/` | User | Tạo đơn hàng mới |
| GET | `/my` | User | Đơn hàng của tôi |
| GET | `/:id` | User/Admin | Chi tiết đơn hàng |
| GET | `/` | Admin | Tất cả đơn hàng (phân trang) |
| PATCH | `/:id/status` | Admin | Cập nhật trạng thái đơn hàng |

### Cài đặt & Chạy

```bash
cd backend
npm install
cp .env.example .env   # Điền thông tin Supabase & JWT secrets
npm run dev            # http://localhost:5000
```

---

## 🗄️ Database (Supabase — PostgreSQL)

### Các bảng chính

| Bảng | Mô tả |
|------|-------|
| `users` | Tài khoản người dùng (role: user/admin, status: active/locked) |
| `categories` | Danh mục sản phẩm |
| `products` | Sản phẩm (tên, mô tả, giá, tồn kho, danh mục, ảnh) |
| `orders` | Đơn hàng (items dạng JSON, tổng tiền, trạng thái, địa chỉ, thanh toán) |

### Trạng thái đơn hàng

```
pending (Chờ xác nhận) → shipping (Đang giao) → completed (Hoàn thành)
                                                ↘ cancelled (Đã hủy)
```

### Cài đặt Database

1. Tạo project tại [supabase.com](https://supabase.com)
2. Vào **SQL Editor** → chạy file `backend/supabase/schema.sql`
3. Lấy keys từ **Project Settings → API**

---

## 🔒 Bảo mật

| Cơ chế | Chi tiết |
|--------|---------|
| **Mật khẩu** | Hash bằng `bcryptjs` (salt rounds = 12) |
| **Access Token** | JWT — hết hạn sau **15 phút** |
| **Refresh Token** | JWT — hết hạn sau **7 ngày** |
| **Phân quyền** | Middleware `authorize('admin')` bảo vệ các route nhạy cảm |
| **Validation** | `express-validator` kiểm tra dữ liệu đầu vào |

---

## 🚀 Hướng dẫn Chạy Toàn bộ Hệ thống

### Yêu cầu

- Node.js >= 18
- Tài khoản [Supabase](https://supabase.com) (miễn phí)

### Các bước

```bash
# 1. Clone project
git clone <repo-url>
cd tttn

# 2. Cài đặt Database
#    → Tạo project Supabase
#    → Chạy backend/supabase/schema.sql trong SQL Editor

# 3. Cấu hình Backend
cd backend
npm install
cp .env.example .env
# → Điền SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, JWT secrets
npm run dev

# 4. Cấu hình Frontend (terminal mới)
cd ../frontend
npm install
cp .env.example .env
# → Điền VITE_API_URL=http://localhost:5000
npm run dev
```

Sau khi chạy:
- 🌐 **Frontend**: http://localhost:3000
- ⚙️ **Backend API**: http://localhost:5000
- 🔍 **Health check**: http://localhost:5000/api/health

---

## ✨ Tính năng

### Khách hàng
- ✅ Đăng ký / Đăng nhập / Quên mật khẩu
- ✅ Duyệt sản phẩm, lọc theo danh mục, tìm kiếm theo từ khoá
- ✅ Xem chi tiết sản phẩm (hình ảnh, mô tả, giá, tồn kho)
- ✅ Giỏ hàng (thêm, cập nhật số lượng, xoá)
- ✅ Đặt hàng với địa chỉ giao hàng
- ✅ Thanh toán COD hoặc chuyển khoản
- ✅ Theo dõi trạng thái đơn hàng
- ✅ Cập nhật thông tin cá nhân

### Quản trị viên (Admin)
- ✅ Dashboard thống kê doanh thu & biểu đồ theo tháng
- ✅ Quản lý sản phẩm: thêm, sửa, xoá, upload ảnh
- ✅ Quản lý danh mục sản phẩm
- ✅ Quản lý đơn hàng: xem chi tiết, cập nhật trạng thái
- ✅ Quản lý người dùng: xem, khoá/mở khoá tài khoản

---


