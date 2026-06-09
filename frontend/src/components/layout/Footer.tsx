import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, MapPin, Phone, Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white/80 backdrop-blur-xl border-t border-indigo-100/50 mt-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Intro */}
          <div className="space-y-4">
            <h3 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
              Stationery Hub
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Điểm đến lý tưởng cho những người đam mê văn phòng phẩm, nghệ sĩ và sinh viên. Khám phá không gian sáng tạo với những sản phẩm chất lượng nhất.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-pink-600 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-blue-400 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4 uppercase tracking-wider text-sm">Về Chúng Tôi</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">Câu chuyện thương hiệu</Link></li>
              <li><Link to="/" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">Tuyển dụng</Link></li>
              <li><Link to="/" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">Tin tức & Sự kiện</Link></li>
              <li><Link to="/" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4 uppercase tracking-wider text-sm">Hỗ Trợ Khách Hàng</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">Hướng dẫn mua hàng</Link></li>
              <li><Link to="/" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">Chính sách kiểm hàng</Link></li>
              <li><Link to="/" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">Chính sách đổi trả</Link></li>
              <li><Link to="/" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">Câu hỏi thường gặp (FAQ)</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4 uppercase tracking-wider text-sm">Liên Hệ</h4>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin className="w-5 h-5 text-indigo-500 mr-2 shrink-0" />
                <span className="text-slate-500 text-sm">41 Lê Duẩn Đà Nẵng</span>
              </li>
              <li className="flex items-center">
                <Phone className="w-5 h-5 text-indigo-500 mr-2 shrink-0" />
                <span className="text-slate-500 text-sm">1900 1234 (Miễn phí)</span>
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 text-indigo-500 mr-2 shrink-0" />
                <span className="text-slate-500 text-sm">hello@stationeryhub.vn</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm text-center md:text-left">
            &copy; {new Date().getFullYear()} Huy Hoàng. Mọi quyền được bảo lưu.
          </p>
          <div className="flex gap-4 items-center">
            <span className="text-sm font-medium text-slate-500">Thanh toán an toàn với:</span>
            <div className="flex gap-2">
              <div className="w-10 h-6 bg-slate-200 rounded border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500">VISA</div>
              <div className="w-10 h-6 bg-slate-200 rounded border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500">ATM</div>
              <div className="w-10 h-6 bg-slate-200 rounded border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500">MOMO</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
