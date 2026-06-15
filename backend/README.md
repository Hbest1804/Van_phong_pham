# ⚙️ Backend API — Văn Phòng Phẩm

RESTful API backend xây dựng bằng **Node.js + Express + JavaScript (ESModule) + Supabase**.

---

## 🚀 Quick Start

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env từ example
copy .env.example .env
# → Điền SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# → Điền JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
# → Điền GEMINI_API_KEY, SMTP_USER, SMTP_PASS

# 3. (Tuỳ chọn) Tạo tài khoản admin đầu tiên
npm run seed:admin

# 4. Chạy dev server (auto-reload khi thay đổi file)
npm run dev
```

Server sẽ chạy tại `http://localhost:5000`

---

## 📁 Cấu trúc thư mục

```
backend/
├── src/
│   ├── server.js                  # Entry point — khởi động server
│   ├── app.js                     # Express app setup + middleware + routes
│   ├── config/
│   │   ├── env.js                 # Đọc và validate biến môi trường
│   │   └── supabase.js            # Khởi tạo Supabase client (anon + service_role)
│   ├── middlewares/
│   │   ├── auth.middleware.js     # Kiểm tra JWT + phân quyền role
│   │   ├── validate.middleware.js # Validate dữ liệu request (express-validator)
│   │   ├── upload.middleware.js   # Upload ảnh qua Multer (memory, 5MB)
│   │   ├── errorHandler.js        # Xử lý lỗi toàn cục
│   │   └── notFound.js            # Trả về 404
│   ├── routes/
│   │   ├── auth.routes.js         # /api/v1/auth/*
│   │   ├── product.routes.js      # /api/v1/products/*
│   │   ├── category.routes.js     # /api/v1/categories/*
│   │   ├── cart.routes.js         # /api/v1/cart/*
│   │   ├── order.routes.js        # /api/v1/orders/*
│   │   ├── adminUser.routes.js    # /api/v1/admin/users/*
│   │   ├── statistics.routes.js   # /api/v1/admin/statistics/*
│   │   └── ai.routes.js           # /api/v1/ai/*
│   ├── controllers/               # Nhận request → gọi service → trả response
│   │   ├── auth.controller.js
│   │   ├── product.controller.js
│   │   ├── category.controller.js
│   │   ├── cart.controller.js
│   │   ├── order.controller.js
│   │   ├── adminUser.controller.js
│   │   ├── statistics.controller.js
│   │   └── ai.controller.js
│   ├── services/                  # Business logic + gọi Supabase
│   │   ├── auth.service.js
│   │   ├── product.service.js
│   │   ├── category.service.js
│   │   ├── cart.service.js
│   │   ├── order.service.js
│   │   ├── adminUser.service.js
│   │   ├── statistics.service.js
│   │   └── ai.service.js
│   ├── utils/
│   │   ├── AppError.js            # Custom error class
│   │   ├── jwt.js                 # Tạo và xác thực JWT token
│   │   ├── mailer.js              # Gửi email qua Nodemailer/SMTP
│   │   └── response.js            # Helper gửi response chuẩn (JSON)
│   └── scripts/
│       └── seed-admin.js          # Script tạo tài khoản admin đầu tiên
├── supabase/
│   └── schema.sql                 # SQL tạo bảng trên Supabase
├── Dockerfile
├── .env.example                   # Mẫu biến môi trường
├── .gitignore
└── package.json
```

---

## 🔌 API Endpoints

> Base prefix: `/api/v1`

### 🔐 Auth — `/api/v1/auth`

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/register` | ❌ | Đăng ký tài khoản |
| POST | `/login` | ❌ | Đăng nhập, nhận JWT + cookie |
| POST | `/refresh-token` | ❌ | Làm mới access token (HttpOnly cookie) |
| POST | `/logout` | ✅ | Đăng xuất, thu hồi refresh token |
| POST | `/forgot-password` | ❌ | Gửi email đặt lại mật khẩu |
| POST | `/reset-password` | ❌ | Đặt lại mật khẩu bằng token |

### 📦 Products — `/api/v1/products`

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/?page&limit&categoryId&search` | ❌ | Danh sách sản phẩm |
| GET | `/:id` | ❌ | Chi tiết sản phẩm |
| POST | `/` | Admin | Tạo sản phẩm (có upload ảnh) |
| PUT | `/:id` | Admin | Cập nhật sản phẩm |
| DELETE | `/:id` | Admin | Xoá sản phẩm |

### 🏷️ Categories — `/api/v1/categories`

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/` | ❌ | Danh sách danh mục |
| GET | `/:id` | ❌ | Chi tiết danh mục |
| POST | `/` | Admin | Tạo danh mục |
| PUT | `/:id` | Admin | Cập nhật danh mục |
| DELETE | `/:id` | Admin | Xoá danh mục |

### 🛒 Cart — `/api/v1/cart`

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/` | User | Lấy toàn bộ giỏ hàng |
| POST | `/` | User | Thêm sản phẩm (tự tăng nếu đã có) |
| POST | `/bulk-sync` | User | Đồng bộ giỏ hàng local khi đăng nhập |
| PUT | `/:productId` | User | Cập nhật số lượng |
| DELETE | `/:productId` | User | Xoá một sản phẩm |
| DELETE | `/` | User | Xoá toàn bộ giỏ hàng |

### 🧾 Orders — `/api/v1/orders`

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/` | User | Đặt hàng từ giỏ hàng |
| GET | `/my` | User | Đơn hàng của tôi |
| GET | `/:id` | User/Admin | Chi tiết đơn hàng |
| GET | `/` | Admin | Tất cả đơn hàng (lọc, phân trang) |
| PATCH | `/:id/status` | Admin | Cập nhật trạng thái |

### 👥 Admin Users — `/api/v1/admin/users`

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/?page&limit&status&sortBy&sortOrder` | Admin | Danh sách người dùng |
| GET | `/:id` | Admin | Chi tiết người dùng |
| PATCH | `/:id/status` | Admin | Khoá / mở khoá tài khoản |

### 📊 Statistics — `/api/v1/admin/statistics`

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/overview` | Admin | Tổng quan dashboard |
| GET | `/revenue?from&to&groupBy` | Admin | Doanh thu theo thời gian (month\|day) |
| GET | `/top-products?limit&from&to&sortBy` | Admin | Top sản phẩm bán chạy |

### 🤖 AI Advisor — `/api/v1/ai`

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/chat` | User/Guest | Gửi tin nhắn đến AI (Gemini) |
| GET | `/search?q` | User/Guest | Tìm kiếm ngôn ngữ tự nhiên |
| GET | `/sessions` | User | Lịch sử hội thoại |
| GET | `/sessions/:session_id` | User | Tin nhắn trong hội thoại |
| DELETE | `/sessions/:session_id` | User | Xoá hội thoại |

### 🏥 Health Check

```
GET /api/health   → { status: 'ok', timestamp: '...' }
```

---

## 🗄️ Database Setup (Supabase)

1. Tạo project mới tại [supabase.com](https://supabase.com)
2. Vào **SQL Editor** và chạy file `supabase/schema.sql`
3. Lấy `URL` và keys từ **Project Settings → API**
4. Điền vào file `.env`

---

## 🔒 Bảo mật

| Cơ chế | Chi tiết |
|--------|---------| 
| **Mật khẩu** | Hash bằng `bcryptjs` (salt = 12) |
| **Access Token** | JWT — hết hạn **15 phút** |
| **Refresh Token** | JWT — hết hạn **7 ngày**, lưu HttpOnly Cookie |
| **Token Rotation** | Refresh sẽ thu hồi token cũ & cấp token mới |
| **Phân quyền** | `authenticate` + `authorize('admin')` middleware |
| **Validation** | `express-validator` trên mọi endpoint |
| **File Upload** | Chỉ `image/*`, tối đa **5 MB** |
| **Reset Password** | Token hết hạn sau `RESET_TOKEN_EXPIRES_MIN` phút |

---

## 💡 Luồng xử lý Request

```
Request → Route → Middleware (Auth/Validate) → Controller → Service → Supabase → Response
```
