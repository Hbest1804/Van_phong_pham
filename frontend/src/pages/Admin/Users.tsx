import React from 'react';
import { useStore } from '../../contexts/StoreContext';
import { Button } from '../../components/ui/Button';
import { Lock, Unlock, Mail } from 'lucide-react';

export function Users() {
  const { users, toggleUserStatus } = useStore();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quản lý Khách hàng</h1>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-slate-900">Họ tên</th>
              <th className="p-4 font-semibold text-slate-900">Email</th>
              <th className="p-4 font-semibold text-slate-900">Vai trò</th>
              <th className="p-4 font-semibold text-slate-900">Trạng thái</th>
              <th className="p-4 font-semibold text-slate-900 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="p-4 font-medium text-slate-900">{u.name}</td>
                <td className="p-4 text-slate-600 flex items-center gap-2"><Mail className="w-3 h-3"/> {u.email}</td>
                <td className="p-4">{u.role === 'admin' ? <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full text-xs">Admin</span> : 'Khách'}</td>
                <td className="p-4">
                  {u.status === 'active' ? (
                    <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-xs">Đang HĐ</span>
                  ) : (
                    <span className="text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full text-xs">Bị Khóa</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {u.role !== 'admin' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleUserStatus(u.id)}
                      className={u.status === 'active' ? 'text-orange-600' : 'text-emerald-600'}
                      title={u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                    >
                      {u.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
