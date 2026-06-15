# 🖥️ Frontend — Văn Phòng Phẩm

Giao diện người dùng xây dựng bằng **ReactJS 19 + Vite 6 + TypeScript + Tailwind CSS v4**.

---

## 🚀 Quick Start

```bash
npm install
cp .env.example .env   # Điền VITE_API_URL
npm run dev            # http://localhost:3000
```

---

## 📁 Cấu trúc thư mục

```
frontend/
├── src/
│   ├── App.tsx                    # Cấu hình routing chính (BrowserRouter)
│   ├── main.tsx                   # Entry point React
│   ├── index.css                  # Global styles + Tailwind
│   ├── types.ts                   # TypeScript types dùng chung
│   ├── pages/
│   │   ├── Home.tsx               # Trang chủ — danh sách & tìm kiếm sản phẩm
│   │   ├── ProductDetail.tsx      # Chi tiết sản phẩm, thêm vào giỏ
│   │   ├── Cart.tsx               # Giỏ hàng
│   │   ├── Checkout.tsx           # Đặt hàng & thanh toán
│   │   ├── Profile.tsx            # Thông tin cá nhân & lịch sử đơn hàng
│   │   ├── AiAdvisor.tsx          # Chatbot AI tư vấn sản phẩm (Gemini)
│   │   ├── Auth/
│   │   │   ├── Login.tsx          # Đăng nhập
│   │   │   ├── Register.tsx       # Đăng ký
│   │   │   ├── ForgotPassword.tsx # Gửi email đặt lại mật khẩu
│   │   │   └── ResetPassword.tsx  # Đặt lại mật khẩu bằng token
│   │   └── Admin/
│   │       ├── Dashboard.tsx      # Thống kê doanh thu, biểu đồ
│   │       ├── Products.tsx       # Quản lý sản phẩm (CRUD + upload ảnh)
│   │       ├── Categories.tsx     # Quản lý danh mục (CRUD)
│   │       ├── Orders.tsx         # Quản lý đơn hàng
│   │       └── Users.tsx          # Quản lý người dùng
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx     # Layout cho trang user (header, footer)
│   │   │   └── AdminLayout.tsx    # Layout cho trang admin (sidebar)
│   │   └── ui/                    # UI components tái sử dụng
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Quản lý trạng thái đăng nhập + JWT
│   │   ├── StoreContext.tsx       # Quản lý danh sách sản phẩm, danh mục
│   │   └── CartContext.tsx        # Quản lý giỏ hàng (local + sync lên server)
│   └── lib/                       # Utility functions (API client, helpers)
├── index.html
├── vite.config.ts
├── tsconfig.json
├── vercel.json                    # Cấu hình deploy Vercel (SPA fallback)
└── package.json
```

---

## 🗺️ Routes

| Route | Trang | Mô tả |
|-------|-------|-------|
| `/` | Home | Danh sách sản phẩm, tìm kiếm, lọc theo danh mục |
| `/product/:id` | ProductDetail | Chi tiết sản phẩm |
| `/login` | Login | Đăng nhập |
| `/register` | Register | Đăng ký |
| `/forgot-password` | ForgotPassword | Quên mật khẩu |
| `/reset-password` | ResetPassword | Đặt lại mật khẩu |
| `/cart` | Cart | Giỏ hàng |
| `/checkout` | Checkout | Đặt hàng & thanh toán |
| `/profile` | Profile | Thông tin cá nhân & lịch sử đơn hàng |
| `/ai-advisor` | AiAdvisor | Tư vấn sản phẩm bằng AI |
| `/admin` | Dashboard | Tổng quan thống kê |
| `/admin/products` | Products | Quản lý sản phẩm |
| `/admin/categories` | Categories | Quản lý danh mục |
| `/admin/orders` | Orders | Quản lý đơn hàng |
| `/admin/users` | Users | Quản lý người dùng |

---

## 🌐 Biến môi trường (`frontend/.env`)

| Biến | Mô tả |
|------|-------|
| `VITE_API_URL` | URL backend API (VD: `http://localhost:5000`) |

---

## 📦 Thư viện chính

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|---------|
| React | 19 | UI framework |
| Vite | 6 | Build tool + dev server |
| TypeScript | ~5.8 | Static typing |
| Tailwind CSS | v4 | Utility-first CSS |
| React Router DOM | v7 | Client-side routing |
| Recharts | v3 | Biểu đồ thống kê (Admin Dashboard) |
| Motion | v12 | Animations |
| Lucide React | latest | Icon set |
| clsx + tailwind-merge | latest | Class name utilities |

---

## 🛠️ Scripts

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Chạy dev server tại `http://localhost:3000` |
| `npm run build` | Build production bundle vào `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Type-check bằng TypeScript |
