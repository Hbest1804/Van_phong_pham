import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { ShoppingCart, LogOut, User as UserIcon, LayoutDashboard, Search, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate(`/`);
    }
  };

  const handleAiSearch = (e: React.MouseEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?aiSearch=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-indigo-100/50 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">Thiên đường văn phòng phẩm </span>
        </Link>
        <div className="flex flex-1 items-center justify-center px-6">
          <form onSubmit={handleSearch} className="w-full max-w-md relative group flex items-center">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-indigo-400 group-focus-within:text-violet-600 transition-colors" />
            <Input
              type="search"
              placeholder="Tìm kiếm thường hoặc mô tả bằng AI..."
              className="pl-10 pr-10 border-indigo-100 bg-white/50 focus-visible:ring-violet-500 rounded-full transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm.trim() && (
              <button
                type="button"
                onClick={handleAiSearch}
                className="absolute right-3 p-1.5 rounded-full text-violet-600 hover:bg-violet-50 hover:text-violet-700 transition-all cursor-pointer flex items-center justify-center"
                title="Tìm kiếm thông minh bằng AI"
              >
                <Sparkles className="h-4 w-4 animate-pulse" />
              </button>
            )}
          </form>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Link to="/ai-advisor">
            <Button variant="ghost" className="p-2 h-auto text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-full transition-transform hover:scale-105 flex items-center space-x-1" title="Trợ lý AI">
              <Sparkles className="h-5 w-5 text-violet-500 animate-pulse" />
              <span className="hidden sm:inline text-xs sm:text-sm font-semibold text-slate-700 hover:text-violet-700">Trợ lý AI</span>
            </Button>
          </Link>
          <Link to="/cart">
            <Button variant="ghost" className="relative p-2 h-auto text-slate-600 hover:text-violet-700 hover:bg-violet-50 rounded-full transition-transform hover:scale-105">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 text-[10px] font-bold text-white shadow-sm transform scale-110">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
          {user ? (
            <div className="flex items-center space-x-1 sm:space-x-2">
              {user.role === 'admin' && (
                <Link to="/admin">
                  <Button variant="ghost" className="h-auto p-2 text-slate-600 hover:text-violet-700 hover:bg-violet-50 rounded-full transition-transform hover:scale-105" title="Quản trị">
                    <LayoutDashboard className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <Link to="/profile">
                <Button variant="ghost" className="h-auto p-2 text-slate-600 hover:text-violet-700 hover:bg-violet-50 rounded-full transition-transform hover:scale-105" title="Cá nhân">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" className="h-auto p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-full transition-transform hover:scale-105" onClick={() => { logout(); navigate('/'); }} title="Đăng xuất">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" className="rounded-full px-6 shadow-sm">Đăng nhập</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
