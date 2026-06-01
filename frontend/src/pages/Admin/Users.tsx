import React, { useState, useEffect, useCallback } from 'react';
import { adminUsersApi } from '../../lib/api';
import { User } from '../../types';
import { Lock, Unlock, Mail, Search, RefreshCw, ChevronLeft, ChevronRight, Phone, MapPin } from 'lucide-react';

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Bị khóa' },
];

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminUsersApi.getUsers({
        page,
        limit: 10,
        search: search || undefined,
        status: filterStatus || undefined,
      });
      if (res.success && res.data) {
        setUsers(res.data.users);
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
      } else {
        setError(res.message || 'Không thể tải danh sách khách hàng.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setPage(1);
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'locked' : 'active';
    const actionText = newStatus === 'locked' ? 'KHÓA' : 'MỞ KHÓA';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản của khách hàng "${user.name}" không?`)) {
      return;
    }

    try {
      const res = await adminUsersApi.updateUserStatus(user.id, newStatus);
      if (res.success && res.data) {
        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, status: res.data!.user.status } : u))
        );
      } else {
        alert(res.message || 'Cập nhật trạng thái tài khoản thất bại.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối khi cập nhật trạng thái.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quản lý Khách hàng</h1>
          {!loading && (
            <p className="text-sm text-slate-500 mt-1">
              Tổng cộng <span className="font-bold text-slate-700">{total}</span> khách hàng
            </p>
          )}
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all bg-white shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Filter status */}
        <div className="flex gap-2 flex-wrap w-full md:w-auto">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                filterStatus === f.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Tìm theo tên, email..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
          >
            Tìm
          </button>
        </form>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="h-12 bg-slate-50 border-b animate-pulse" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 border-b bg-white animate-pulse" />
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-6 py-5 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && users.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-medium">Không tìm thấy khách hàng nào.</p>
        </div>
      )}

      {/* Users Table */}
      {!loading && !error && users.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4 font-semibold">Khách hàng</th>
                  <th className="p-4 font-semibold">Liên hệ</th>
                  <th className="p-4 font-semibold">Trạng thái</th>
                  <th className="p-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Customer Name & Role */}
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">ID: {u.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    
                    {/* Contact Info */}
                    <td className="p-4 space-y-1">
                      <div className="flex items-center gap-2 text-slate-600 text-xs">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                      {u.phone && (
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                      {u.address && (
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[200px]" title={u.address}>{u.address}</span>
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                          Bị khóa
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="p-4 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                            u.status === 'active'
                              ? 'text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100'
                              : 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
                          }`}
                          title={u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          {u.status === 'active' ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 font-semibold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Trước
          </button>
          <span className="text-sm font-bold text-slate-600">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 font-semibold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white cursor-pointer"
          >
            Tiếp <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
