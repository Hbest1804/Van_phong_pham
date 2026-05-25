import React, { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../lib/utils';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Product } from '../../types';

export function Products() {
  const { products, categories, addProduct, updateProduct, deleteProduct } = useStore();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '', description: '', price: 0, stock: 0, categoryId: '', image: ''
  });

  const handleEdit = (p: Product) => {
    setIsEditing(p.id);
    setFormData(p);
  };

  const handleSave = () => {
    if (isEditing) {
      updateProduct(isEditing, formData);
    } else {
      addProduct(formData);
    }
    setIsEditing(null);
    setIsAdding(false);
    setFormData({ name: '', description: '', price: 0, stock: 0, categoryId: '', image: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Quản lý Sản phẩm</h1>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm
        </Button>
      </div>

      {(isAdding || isEditing) && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">{isEditing ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="text-sm font-medium">Tên SP</label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Danh mục</label>
              <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" 
                value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })}>
                <option value="">Chọn danh mục</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium">Giá</label><Input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} /></div>
            <div><label className="text-sm font-medium">Tồn kho</label><Input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} /></div>
            <div className="col-span-2"><label className="text-sm font-medium">URL Hình ảnh</label><Input value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} /></div>
            <div className="col-span-2"><label className="text-sm font-medium">Mô tả</label><Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsAdding(false); setIsEditing(null); }}>Hủy</Button>
            <Button onClick={handleSave}>Lưu</Button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-slate-900">Sản phẩm</th>
              <th className="p-4 font-semibold text-slate-900">Giá</th>
              <th className="p-4 font-semibold text-slate-900">Tồn kho</th>
              <th className="p-4 font-semibold text-slate-900 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50">
                <td className="p-4 flex items-center gap-4">
                  <img src={p.image} className="w-12 h-12 object-cover rounded bg-slate-100" />
                  <span className="font-medium text-slate-900">{p.name}</span>
                </td>
                <td className="p-4 font-medium">{formatCurrency(p.price)}</td>
                <td className="p-4">{p.stock}</td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { if(confirm('Xóa?')) deleteProduct(p.id) }}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
