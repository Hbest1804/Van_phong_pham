import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Users, Tags, ShoppingBasket, Home, LayoutDashboard } from 'lucide-react';

export function AdminLayout() {
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link to="/" className="text-xl font-bold flex items-center gap-2">
            <Home className="w-5 h-5"/> Về Cửa Hàng
          </Link>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          <Link to="/admin" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </Link>
          <Link to="/admin/products" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800">
            <Package className="w-5 h-5" /> Sản phẩm
          </Link>
          <Link to="/admin/categories" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800">
            <Tags className="w-5 h-5" /> Danh mục
          </Link>
          <Link to="/admin/orders" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800">
            <ShoppingBasket className="w-5 h-5" /> Đơn hàng
          </Link>
          <Link to="/admin/users" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800">
            <Users className="w-5 h-5" /> Khách hàng
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
