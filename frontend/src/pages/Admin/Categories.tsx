import React, { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Edit2, Trash2, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Category } from '../../types';

export function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore();

  // Trạng thái hiển thị modal
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  // Dữ liệu form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Trạng thái API
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Trạng thái xóa per-row
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (c: Category) => {
    setIsEditing(c.id);
    setName(c.name);
    setDescription(c.description || '');
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setIsEditing(null);
    setName('');
    setDescription('');
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError('Tên danh mục không được để trống.');
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(false);
    setSubmitting(true);

    try {
      let res;
      if (isEditing) {
        res = await updateCategory(isEditing, name.trim(), description.trim());
      } else {
        res = await addCategory(name.trim(), description.trim());
      }

      if (res && res.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          handleCancel();
        }, 1000);
      } else {
        setSubmitError(res?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } catch (err) {
      setSubmitError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Xóa danh mục "${catName}"? Hành động này không thể hoàn tác.`)) return;

    setDeletingId(id);
    try {
      await deleteCategory(id);
    } catch (err) {
      alert('Không thể kết nối đến máy chủ khi xóa.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Quản lý Danh mục</h1>
        <Button onClick={() => { setIsAdding(true); setSubmitError(null); setSubmitSuccess(false); }}>
          <Plus className="w-4 h-4 mr-2" /> Thêm danh mục
        </Button>
      </div>

      {/* Modal Form Thêm/Sửa */}
      {(isAdding || isEditing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={handleCancel}></div>

          <form
            onSubmit={handleSave}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-2xl max-w-md w-full relative z-10 animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-6 text-slate-800">
              {isEditing ? 'Sửa danh mục' : 'Thêm danh mục mới'}
            </h2>

            {/* Thông báo lỗi */}
            {submitError && (
              <div className="flex items-center gap-2 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {submitError}
              </div>
            )}

            {/* Thông báo thành công */}
            {submitSuccess && (
              <div className="flex items-center gap-2 mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {isEditing ? 'Cập nhật danh mục thành công!' : 'Tạo danh mục mới thành công!'}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Nhập tên danh mục (ví dụ: Bút bi, Giấy A4)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={submitting}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  placeholder="Nhập mô tả ngắn cho danh mục..."
                  className="flex min-h-[90px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...
                  </>
                ) : (
                  'Lưu'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Bảng danh sách danh mục */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-700 w-1/3">Tên danh mục</th>
              <th className="p-4 font-semibold text-slate-700 w-1/2">Mô tả</th>
              <th className="p-4 font-semibold text-slate-700 text-right w-1/6">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-slate-400">
                  Không có danh mục nào. Hãy thêm danh mục đầu tiên!
                </td>
              </tr>
            ) : (
              categories.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-4 font-medium text-slate-900">{c.name}</td>
                  <td className="p-4 text-slate-500 max-w-xs truncate" title={c.description}>
                    {c.description || <em className="text-slate-300">Không có mô tả</em>}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === c.id}
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        {deletingId === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-600" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
