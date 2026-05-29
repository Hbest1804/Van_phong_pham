import React, { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../lib/utils';
import { productsApi } from '../../lib/api';
import { Plus, Edit2, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Product } from '../../types';

type FormData = Omit<Product, 'id' | 'price' | 'stock'> & {
  price: number | '';
  stock: number | '';
};

const emptyForm: FormData = {
  name: '', description: '', price: '', stock: '', categoryId: '', image: '',
};

export function Products() {
  const { products, categories, reloadProducts } = useStore();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  // Trạng thái submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Trạng thái xóa per-row
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Trạng thái upload ảnh
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadImageError, setUploadImageError] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadImageError(null);

    try {
      const res = await productsApi.uploadProductImage(file);
      if (res.success && res.data?.imageUrl) {
        setFormData(prev => ({ ...prev, image: res.data!.imageUrl }));
      } else {
        setUploadImageError(res.message || 'Tải ảnh lên thất bại.');
      }
    } catch {
      setUploadImageError('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEdit = (p: Product) => {
    setIsEditing(p.id);
    setSubmitError(null);
    setSubmitSuccess(false);
    setFormData({ name: p.name, description: p.description, price: p.price, stock: p.stock, categoryId: p.categoryId, image: p.image });
  };

  const handleCancel = () => {
    setIsEditing(null);
    setIsAdding(false);
    setFormData(emptyForm);
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa sản phẩm "${name}"? Hành động này không thể hoàn tác.`)) return;
    setDeletingId(id);
    try {
      const res = await productsApi.deleteProduct(id);
      if (res.success) {
        await reloadProducts();
      } else {
        alert(res.message || 'Xóa thất bại. Vui lòng thử lại.');
      }
    } catch {
      alert('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async () => {
    setSubmitError(null);
    setSubmitSuccess(false);
    setSubmitting(true);

    try {
      let res;

      if (isEditing) {
        // Cập nhật → gọi PUT API
        res = await productsApi.updateProduct(isEditing, {
          name: formData.name,
          description: formData.description,
          price: formData.price === '' ? 0 : Number(formData.price),
          stock: formData.stock === '' ? 0 : Number(formData.stock),
          categoryId: formData.categoryId,
          imageUrl: formData.image,
        });
      } else {
        // Tạo mới → gọi POST API
        res = await productsApi.createProduct({
          name: formData.name,
          description: formData.description,
          price: formData.price === '' ? 0 : Number(formData.price),
          stock: formData.stock === '' ? 0 : Number(formData.stock),
          categoryId: formData.categoryId,
          imageUrl: formData.image,
        });
      }

      if (res.success) {
        setSubmitSuccess(true);
        await reloadProducts();
        setTimeout(() => handleCancel(), 1200);
      } else {
        setSubmitError(res.message || (isEditing ? 'Cập nhật thất bại.' : 'Tạo sản phẩm thất bại.'));
      }
    } catch {
      setSubmitError('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Quản lý Sản phẩm</h1>
        <Button onClick={() => { setIsAdding(true); setSubmitError(null); setSubmitSuccess(false); }}>
          <Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm
        </Button>
      </div>

      {(isAdding || isEditing) && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">{isEditing ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>

          {/* Feedback messages */}
          {submitError && (
            <div className="flex items-center gap-2 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="flex items-center gap-2 mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {isEditing ? 'Cập nhật sản phẩm thành công!' : 'Tạo sản phẩm thành công!'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">Tên SP</label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Danh mục</label>
              <select
                id="product-category-select"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">Chọn danh mục</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Giá (VND)</label>
              <Input
                type="number"
                min={0}
                value={formData.price}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({ ...formData, price: val === '' ? '' : Number(val) });
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tồn kho</label>
              <Input
                type="number"
                min={0}
                value={formData.stock}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({ ...formData, stock: val === '' ? '' : Number(val) });
                }}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Hình ảnh sản phẩm</label>
              <div className="flex gap-4 items-start">
                {formData.image ? (
                  <div className="relative w-24 h-24 border rounded-lg overflow-hidden group bg-slate-100 flex-shrink-0">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 text-slate-400 flex-shrink-0">
                    {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                  </div>
                )}
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="product-image-file"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="product-image-file"
                      className={`inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-200 bg-white px-4 py-2 hover:bg-slate-100 hover:text-slate-900 cursor-pointer h-10 ${uploadingImage ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      {uploadingImage ? 'Đang tải lên...' : 'Chọn từ máy tính'}
                    </label>
                    <span className="text-xs text-slate-500">Hỗ trợ JPG, PNG, WEBP tối đa 5MB</span>
                  </div>
                  
                  {uploadImageError && (
                    <p className="text-xs text-red-600 font-medium">{uploadImageError}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">Hoặc URL ảnh:</span>
                    <Input
                      placeholder="https://..."
                      value={formData.image}
                      onChange={e => setFormData({ ...formData, image: e.target.value })}
                      disabled={uploadingImage}
                      className="h-8 text-xs flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Mô tả</label>
              <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={submitting}>Hủy</Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
              ) : 'Lưu'}
            </Button>
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
                  <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded bg-slate-100" />
                  <span className="font-medium text-slate-900">{p.name}</span>
                </td>
                <td className="p-4 font-medium">{formatCurrency(p.price)}</td>
                <td className="p-4">{p.stock}</td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === p.id}
                    onClick={() => handleDelete(p.id, p.name)}
                  >
                    {deletingId === p.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      : <Trash2 className="w-4 h-4 text-red-600" />}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
