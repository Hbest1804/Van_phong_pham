import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

/**
 * Lấy tất cả danh mục sản phẩm
 */
export async function getCategories() {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id, name, description, created_at')
    .order('name', { ascending: true });

  if (error) {
    console.error('[category.service] Lỗi lấy danh sách danh mục:', error.message);
    throw new AppError('Không thể tải danh sách danh mục.', 500);
  }

  return data.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description || '',
    createdAt: c.created_at,
  }));
}
