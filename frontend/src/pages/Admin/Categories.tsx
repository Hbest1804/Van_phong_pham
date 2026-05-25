import React, { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');

  const handleSaveEdit = () => {
    if (isEditing && editName.trim()) {
      updateCategory(isEditing, editName.trim());
      setIsEditing(null);
    }
  };

  const handleAdd = () => {
    if (newName.trim()) {
      addCategory(newName.trim());
      setNewName('');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl border shadow-sm p-6 rounded-lg bg-white">
      <h1 className="text-3xl font-bold mb-8">Quản lý Danh mục</h1>

      <div className="flex gap-2 mb-8">
        <Input placeholder="Tên danh mục mới" value={newName} onChange={e => setNewName(e.target.value)} />
        <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" /> Thêm</Button>
      </div>

      <ul className="divide-y border-t">
        {categories.map(c => (
          <li key={c.id} className="py-4 flex justify-between items-center">
            {isEditing === c.id ? (
              <div className="flex gap-2 flex-1 mr-4">
                <Input value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                <Button size="sm" onClick={handleSaveEdit}>Lưu</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(null)}>Hủy</Button>
              </div>
            ) : (
              <>
                <span className="font-medium text-lg">{c.name}</span>
                <div>
                  <Button variant="ghost" size="sm" onClick={() => { setIsEditing(c.id); setEditName(c.name); }}>
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { if(confirm('Xóa?')) deleteCategory(c.id) }}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
