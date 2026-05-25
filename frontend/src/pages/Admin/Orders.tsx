import React, { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { OrderStatus } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Edit2 } from 'lucide-react';

const statuses = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export function Orders() {
  const { orders, updateOrderStatus, users } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quản lý Đơn hàng</h1>

      <div className="space-y-4">
        {sortedOrders.map(order => {
          const user = users.find(u => u.id === order.userId);
          const isEditing = editingId === order.id;

          return (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50 border-b py-3 flex flex-row items-center justify-between space-y-0">
                <div className="flex gap-4 items-center">
                  <span className="font-bold text-slate-900 uppercase">#{order.id}</span>
                  <span className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <select
                      className="border rounded px-2 py-1 text-sm bg-white"
                      value={order.status}
                      onChange={(e) => {
                        updateOrderStatus(order.id, e.target.value as OrderStatus);
                        setEditingId(null);
                      }}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                    >
                      {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  ) : (
                    <>
                      <span className="px-3 py-1 bg-white border rounded-full text-xs font-semibold">{statuses.find(s => s.value === order.status)?.label}</span>
                      <button onClick={() => setEditingId(order.id)} className="text-blue-600 hover:text-blue-700 p-1"><Edit2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-slate-900">Chi tiết sản phẩm</h4>
                  <ul className="space-y-1 text-sm">
                    {order.items.map(i => (
                      <li key={i.productId} className="flex justify-between">
                        <span>{i.quantity}x {i.name}</span>
                        <span className="text-slate-600">{formatCurrency(i.price * i.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="font-bold mt-2 pt-2 border-t flex justify-between">
                    Tổng: <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <h4 className="text-sm font-semibold mb-2 text-slate-900">Thông tin giao hàng</h4>
                  <p><span className="text-slate-500">Người nhận:</span> {user?.name} ({user?.email})</p>
                  <p><span className="text-slate-500">Thanh toán:</span> {order.paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'}</p>
                  <p><span className="text-slate-500">Địa chỉ:</span> {order.address}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
