# 🛒 Website Bán Văn Phòng Phẩm Trực Tuyến

Hệ thống thương mại điện tử chuyên biệt cho ngành hàng văn phòng phẩm, phục vụ học sinh, sinh viên, nhân viên văn phòng và các cơ sở kinh doanh. Được xây dựng theo kiến trúc **Client-Server** tách biệt hoàn toàn giữa frontend và backend, hỗ trợ triển khai bằng **Docker Compose + Nginx**.

---

## 📁 Cấu trúc Monorepo

```
tttn/
├── frontend/          # Giao diện người dùng (ReactJS + Vite + TypeScript)
├── backend/           # REST API Server (Node.js + Express)
├── nginx/             # Cấu hình Nginx reverse proxy
├── docker-compose.yml # Triển khai toàn bộ hệ thống bằng Docker
└── README.md
```

---

## 🏗️ Kiến trúc Hệ thống

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                  │
│              ReactJS SPA — Port 3000                │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP REST API  (/api/v1/*)
                      ▼
┌─────────────────────────────────────────────────────┐
│              NGINX (Reverse Proxy)                  │
│   /api/* → backend:5000   /  → SPA index.html      │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│            BACKEND (Node.js / Express)              │
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
| Icons | Lucide React |
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
│   │   ├── Home.tsx               # Trang chủ — danh sách & tìm kiếm sản phẩm
│   │   ├── ProductDetail.tsx      # Chi tiết sản phẩm
│   │   ├── Cart.tsx               # Giỏ hàng
│   │   ├── Checkout.tsx           # Đặt hàng & thanh toán
│   │   ├── Profile.tsx            # Thông tin cá nhân & lịch sử đơn hàng
│   │   ├── AiAdvisor.tsx          # Trang tư vấn sản phẩm bằng AI
│   │   ├── Auth/
│   │   │   ├── Login.tsx          # Đăng nhập
│   │   │   ├── Register.tsx       # Đăng ký
│   │   │   ├── ForgotPassword.tsx # Quên mật khẩu
│   │   │   └── ResetPassword.tsx  # Đặt lại mật khẩu
│   │   └── Admin/
│   │       ├── Dashboard.tsx      # Thống kê doanh thu, biểu đồ
│   │       ├── Products.tsx       # Quản lý sản phẩm (CRUD + upload ảnh)
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
│   │   └── CartContext.tsx        # Quản lý giỏ hàng (local + server sync)
│   └── lib/                       # Utility functions
├── index.html
├── vite.config.ts
├── tsconfig.json
├── vercel.json                    # Cấu hình deploy Vercel
└── package.json
```

### Các trang & Routes

| Route | Trang | Mô tả |
|-------|-------|-------|
| `/` | Home | Danh sách sản phẩm, tìm kiếm, lọc theo danh mục |
| `/product/:id` | ProductDetail | Chi tiết sản phẩm, thêm vào giỏ |
| `/login` | Login | Đăng nhập tài khoản |
| `/register` | Register | Đăng ký tài khoản mới |
| `/forgot-password` | ForgotPassword | Gửi email lấy lại mật khẩu |
| `/reset-password` | ResetPassword | Đặt lại mật khẩu bằng token |
| `/cart` | Cart | Xem & chỉnh sửa giỏ hàng |
| `/checkout` | Checkout | Nhập địa chỉ, chọn thanh toán, đặt hàng |
| `/profile` | Profile | Thông tin cá nhân, lịch sử đơn hàng |
| `/ai-advisor` | AiAdvisor | Tư vấn sản phẩm bằng AI (chatbot + tìm kiếm ngữ nghĩa) |
| `/admin` | Dashboard | Thống kê doanh thu, đơn hàng, top sản phẩm |
| `/admin/products` | Products | Quản lý sản phẩm |
| `/admin/categories` | Categories | Quản lý danh mục |
| `/admin/orders` | Orders | Quản lý đơn hàng |
| `/admin/users` | Users | Quản lý người dùng |

### Cài đặt & Chạy

```bash
cd frontend
npm install
cp .env.example .env   # Điền VITE_API_URL
npm run dev            # http://localhost:3000
```

---

## ⚙️ Backend

### Thông tin

| Mục | Chi tiết |
|-----|---------|
| Thư mục | `backend/` |
| Runtime | Node.js >= 18 |
| Framework | Express.js v4 |
| Ngôn ngữ | JavaScript (ESModule) |
| Database | PostgreSQL via Supabase |
| Authentication | JWT (Access Token 15m + Refresh Token 7d, HttpOnly Cookie) |
| File Upload | Multer (memory storage → Supabase Storage, giới hạn 5MB) |
| Email | Nodemailer + SMTP (Gmail App Password) |
| AI | Google Gemini API |
| Port | `5000` |

### Cấu trúc thư mục

```
backend/
├── src/
│   ├── server.js                  # Entry point — khởi động server
│   ├── app.js                     # Express app, đăng ký middleware & routes
│   ├── config/
│   │   ├── env.js                 # Đọc và validate biến môi trường
│   │   └── supabase.js            # Khởi tạo Supabase client (anon + service_role)
│   ├── middlewares/
│   │   ├── auth.middleware.js     # Xác thực JWT, phân quyền theo role
│   │   ├── validate.middleware.js # Validate dữ liệu đầu vào (express-validator)
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
│   ├── services/                  # Business logic + truy vấn Supabase
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
│   │   ├── jwt.js                 # Tạo & xác thực JWT token
│   │   ├── mailer.js              # Gửi email qua Nodemailer/SMTP
│   │   └── response.js            # Helper gửi response chuẩn (JSON)
│   └── scripts/
│       └── seed-admin.js          # Script tạo tài khoản admin đầu tiên
├── supabase/
│   └── schema.sql                 # SQL tạo bảng, index cho Supabase
├── Dockerfile
├── .env.example
├── .gitignore
└── package.json
```

### API Endpoints

> Base URL: `http://localhost:5000`  
> Prefix chung: `/api/v1`

#### 🔐 Auth — `/api/v1/auth`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/register` | Đăng ký tài khoản mới | ❌ |
| POST | `/login` | Đăng nhập, nhận JWT | ❌ |
| POST | `/refresh-token` | Làm mới access token (HttpOnly cookie) | ❌ |
| POST | `/logout` | Đăng xuất, thu hồi refresh token | ✅ |
| POST | `/forgot-password` | Gửi link đặt lại mật khẩu qua email | ❌ |
| POST | `/reset-password` | Đặt lại mật khẩu bằng token | ❌ |

#### 📦 Products — `/api/v1/products`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/?page&limit&categoryId&search` | ❌ | Danh sách sản phẩm (tìm kiếm, lọc, phân trang) |
| GET | `/:id` | ❌ | Chi tiết sản phẩm |
| POST | `/` | Admin | Tạo sản phẩm mới (có upload ảnh) |
| PUT | `/:id` | Admin | Cập nhật sản phẩm |
| DELETE | `/:id` | Admin | Xoá sản phẩm |

#### 🏷️ Categories — `/api/v1/categories`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/` | ❌ | Tất cả danh mục |
| GET | `/:id` | ❌ | Chi tiết danh mục |
| POST | `/` | Admin | Tạo danh mục |
| PUT | `/:id` | Admin | Cập nhật danh mục |
| DELETE | `/:id` | Admin | Xoá danh mục |

#### 🛒 Cart — `/api/v1/cart`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/` | User | Lấy toàn bộ giỏ hàng |
| POST | `/` | User | Thêm sản phẩm vào giỏ (tự tăng nếu đã có) |
| POST | `/bulk-sync` | User | Đồng bộ giỏ hàng local khi đăng nhập |
| PUT | `/:productId` | User | Cập nhật số lượng sản phẩm |
| DELETE | `/:productId` | User | Xoá một sản phẩm khỏi giỏ |
| DELETE | `/` | User | Xoá toàn bộ giỏ hàng |

#### 🧾 Orders — `/api/v1/orders`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/` | User | Tạo đơn hàng từ giỏ hàng |
| GET | `/my` | User | Đơn hàng của tôi (phân trang) |
| GET | `/:id` | User/Admin | Chi tiết đơn hàng |
| GET | `/` | Admin | Tất cả đơn hàng (lọc, phân trang) |
| PATCH | `/:id/status` | Admin | Cập nhật trạng thái đơn hàng |

#### 👥 Admin Users — `/api/v1/admin/users`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/?page&limit&status&sortBy&sortOrder` | Admin | Danh sách người dùng (lọc, sắp xếp, phân trang) |
| GET | `/:id` | Admin | Chi tiết người dùng |
| PATCH | `/:id/status` | Admin | Khoá / mở khoá tài khoản |

#### 📊 Statistics — `/api/v1/admin/statistics`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/overview` | Admin | Tổng quan dashboard (doanh thu, đơn hàng theo trạng thái, top sản phẩm) |
| GET | `/revenue?from&to&groupBy` | Admin | Doanh thu theo khoảng thời gian (groupBy: month\|day) |
| GET | `/top-products?limit&from&to&sortBy` | Admin | Top sản phẩm bán chạy (sortBy: quantity\|revenue) |

#### 🤖 AI Advisor — `/api/v1/ai`

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/chat` | User/Guest | Gửi tin nhắn đến AI tư vấn sản phẩm (Gemini) |
| GET | `/search?q` | User/Guest | Tìm kiếm sản phẩm bằng ngôn ngữ tự nhiên |
| GET | `/sessions` | User | Lịch sử các cuộc hội thoại |
| GET | `/sessions/:session_id` | User | Tin nhắn trong một cuộc hội thoại |
| DELETE | `/sessions/:session_id` | User | Xoá cuộc hội thoại |

#### 🏥 Health Check

```
GET /api/health   → { status: 'ok', timestamp: '...' }
```

### Cài đặt & Chạy

```bash
cd backend
npm install
cp .env.example .env   # Điền thông tin Supabase, JWT secrets, SMTP, Gemini
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
| `cart_items` | Giỏ hàng lưu trên server (user_id, product_id, quantity) |
| `orders` | Đơn hàng (items dạng JSONB, tổng tiền, trạng thái, địa chỉ, thanh toán) |

### Trạng thái đơn hàng

```
pending (Chờ xác nhận) → shipping (Đang giao) → completed (Hoàn thành)
                                               ↘ cancelled (Đã hủy)
```

### Cài đặt Database

1. Tạo project tại [supabase.com](https://supabase.com)
2. Vào **SQL Editor** → chạy file `backend/supabase/schema.sql`
3. Lấy keys từ **Project Settings → API**
4. Điền vào `backend/.env`

---

## 🔒 Bảo mật

| Cơ chế | Chi tiết |
|--------|---------| 
| **Mật khẩu** | Hash bằng `bcryptjs` (salt rounds = 12) |
| **Access Token** | JWT — hết hạn sau **15 phút** |
| **Refresh Token** | JWT — hết hạn sau **7 ngày**, lưu trong **HttpOnly Cookie** |
| **Token Rotation** | Mỗi lần refresh sẽ cấp mới & thu hồi token cũ |
| **Phân quyền** | Middleware `authenticate` + `authorize('admin')` |
| **Validation** | `express-validator` kiểm tra toàn bộ dữ liệu đầu vào |
| **File Upload** | Chỉ chấp nhận `image/*`, giới hạn **5 MB** |
| **Quên mật khẩu** | Token reset hết hạn sau **15 phút** (cấu hình được) |
| **CORS** | Chỉ cho phép origin từ domain frontend cấu hình + `*.vercel.app` |

---

## 🐳 Docker — Triển khai Production

Hệ thống hỗ trợ triển khai đầy đủ bằng **Docker Compose** với 3 service:

| Service | Container | Mô tả |
|---------|-----------|-------|
| `backend` | `vpp_backend` | Express API, port 5000 (internal) |
| `frontend` | `vpp_frontend_builder` | Build React → copy dist vào volume, rồi thoát |
| `nginx` | `vpp_nginx` | Reverse proxy + serve SPA, port 80 |

**Luồng khởi động:**
```
1. backend  → khởi Express, chờ /api/health healthy
2. frontend → build React, copy /dist → shared volume, exit(0)
3. nginx    → khởi sau khi (1) healthy + (2) xong
              /api/* → proxy backend:5000
              /      → serve SPA index.html từ volume
```

```bash
# Lần đầu / rebuild toàn bộ
docker compose up -d --build

# Rebuild ép buộc
docker compose up -d --build --force-recreate

# Xem logs
docker compose logs -f nginx
docker compose logs -f backend
```

Sau khi chạy: **http://localhost**

---

## 🚀 Hướng dẫn Chạy Development

### Yêu cầu

- Node.js >= 18
- Tài khoản [Supabase](https://supabase.com) (miễn phí)
- Google Gemini API Key (cho tính năng AI)
- Gmail App Password (cho gửi email)

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
# → Điền SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# → Điền JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
# → Điền GEMINI_API_KEY
# → Điền SMTP_HOST, SMTP_USER, SMTP_PASS
npm run seed:admin   # (tuỳ chọn) Tạo tài khoản admin đầu tiên
npm run dev          # http://localhost:5000

# 4. Cấu hình Frontend (terminal mới)
cd ../frontend
npm install
cp .env.example .env
# → Điền VITE_API_URL=http://localhost:5000
npm run dev          # http://localhost:3000
```

Sau khi chạy:
- 🌐 **Frontend**: http://localhost:3000
- ⚙️ **Backend API**: http://localhost:5000
- 🔍 **Health check**: http://localhost:5000/api/health

---

## ✨ Tính năng

### Khách hàng
- ✅ Đăng ký / Đăng nhập / Quên mật khẩu / Đặt lại mật khẩu qua email
- ✅ Duyệt sản phẩm, lọc theo danh mục, tìm kiếm theo từ khoá
- ✅ Xem chi tiết sản phẩm (hình ảnh, mô tả, giá, tồn kho)
- ✅ Giỏ hàng server-side (thêm, cập nhật số lượng, xoá, đồng bộ khi đăng nhập)
- ✅ Đặt hàng với địa chỉ giao hàng và ghi chú
- ✅ Thanh toán COD hoặc chuyển khoản
- ✅ Theo dõi trạng thái đơn hàng
- ✅ Cập nhật thông tin cá nhân
- ✅ **Tư vấn sản phẩm bằng AI** (chatbot Gemini, tìm kiếm ngữ nghĩa, lịch sử hội thoại)

### Quản trị viên (Admin)
- ✅ Dashboard thống kê: tổng quan doanh thu, so sánh tháng, biểu đồ theo ngày/tháng
- ✅ Top sản phẩm bán chạy (theo số lượng hoặc doanh thu)
- ✅ Quản lý sản phẩm: thêm, sửa, xoá, upload ảnh lên Supabase Storage
- ✅ Quản lý danh mục sản phẩm
- ✅ Quản lý đơn hàng: xem chi tiết, cập nhật trạng thái, lọc theo trạng thái
- ✅ Quản lý người dùng: xem danh sách, khoá / mở khoá tài khoản

---

## 🌐 Biến môi trường

### Backend (`backend/.env`)

| Biến | Mô tả |
|------|-------|
| `PORT` | Cổng server (mặc định: 5000) |
| `NODE_ENV` | `development` hoặc `production` |
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_ANON_KEY` | Anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase |
| `JWT_ACCESS_SECRET` | Secret key cho Access Token |
| `JWT_REFRESH_SECRET` | Secret key cho Refresh Token |
| `JWT_ACCESS_EXPIRES_IN` | Thời hạn access token (mặc định: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Thời hạn refresh token (mặc định: `7d`) |
| `FRONTEND_URL` | URL frontend cho CORS |
| `GEMINI_API_KEY` | Google Gemini API Key |
| `SMTP_HOST` | SMTP server (mặc định: `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (mặc định: `587`) |
| `SMTP_SECURE` | TLS (mặc định: `false`) |
| `SMTP_USER` | Email gửi |
| `SMTP_PASS` | App password |
| `RESET_TOKEN_EXPIRES_MIN` | Thời hạn token reset password (phút, mặc định: `15`) |

### Frontend (`frontend/.env`)

| Biến | Mô tả |
|------|-------|
| `VITE_API_URL` | URL backend API (VD: `http://localhost:5000`) |
