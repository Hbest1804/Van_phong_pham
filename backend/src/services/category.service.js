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

/**
 * Tạo danh mục mới (Admin)
 * @param {object} data
 * @param {string} data.name
 * @param {string} [data.description]
 */
export async function createCategory(data) {
  const name = (data.name || '').trim();
  const description = (data.description || '').trim();

  // 1. Kiểm tra xem danh mục đã tồn tại chưa (case-insensitive check)
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('categories')
    .select('id')
    .ilike('name', name)
    .maybeSingle();

  if (checkError) {
    console.error('[category.service] Lỗi kiểm tra danh mục:', checkError.message);
    throw new AppError('Không thể tạo danh mục.', 500);
  }

  if (existing) {
    throw new AppError('Tên danh mục này đã tồn tại.', 400);
  }

  // 2. Tạo mới
  const { data: newCategory, error } = await supabaseAdmin
    .from('categories')
    .insert({ name, description })
    .select()
    .single();

  if (error) {
    console.error('[category.service] Lỗi tạo danh mục:', error.message);
    throw new AppError('Không thể tạo danh mục. Vui lòng thử lại.', 500);
  }

  return {
    id: newCategory.id,
    name: newCategory.name,
    description: newCategory.description || '',
    createdAt: newCategory.created_at,
  };
}

/**
 * Cập nhật danh mục (Admin)
 * @param {string} id
 * @param {object} data
 * @param {string} [data.name]
 * @param {string} [data.description]
 */
export async function updateCategory(id, data) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new AppError('Mã danh mục không hợp lệ.', 400);
  }

  const payload = {};
  if (data.name !== undefined) {
    const name = (data.name || '').trim();
    if (!name) {
      throw new AppError('Tên danh mục không được để trống.', 400);
    }

    // Check if name is already taken by another category (case-insensitive)
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('[category.service] Lỗi kiểm tra danh mục:', checkError.message);
      throw new AppError('Không thể cập nhật danh mục.', 500);
    }

    if (existing) {
      throw new AppError('Tên danh mục này đã tồn tại.', 400);
    }

    payload.name = name;
  }

  if (data.description !== undefined) {
    payload.description = (data.description || '').trim();
  }

  if (Object.keys(payload).length === 0) {
    throw new AppError('Không có dữ liệu nào được cập nhật.', 400);
  }

  const { data: updated, error } = await supabaseAdmin
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[category.service] Lỗi cập nhật danh mục:', error.message);
    throw new AppError('Không thể cập nhật danh mục. Vui lòng thử lại.', 500);
  }

  if (!updated) {
    throw new AppError('Danh mục không tồn tại.', 404);
  }

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description || '',
    createdAt: updated.created_at,
  };
}

/**
 * Xóa danh mục (Admin)
 * @param {string} id
 */
export async function deleteCategory(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new AppError('Mã danh mục không hợp lệ.', 400);
  }

  // 1. Kiểm tra xem danh mục có tồn tại không
  const { data: existing, error: findError } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (findError) {
    console.error('[category.service] Lỗi kiểm tra danh mục:', findError.message);
    throw new AppError('Không thể xóa danh mục. Vui lòng thử lại.', 500);
  }

  if (!existing) {
    throw new AppError('Danh mục không tồn tại.', 404);
  }

  // 2. Kiểm tra xem có sản phẩm nào thuộc danh mục này không
  const { data: productsCount, error: checkProductsError } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('category_id', id)
    .limit(1);

  if (checkProductsError) {
    console.error('[category.service] Lỗi kiểm tra sản phẩm thuộc danh mục:', checkProductsError.message);
    throw new AppError('Không thể xóa danh mục. Vui lòng thử lại.', 500);
  }

  if (productsCount && productsCount.length > 0) {
    throw new AppError('Không thể xóa danh mục vì đang có sản phẩm thuộc danh mục này.', 400);
  }

  // 3. Thực hiện xóa
  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[category.service] Lỗi xóa danh mục:', error.message);
    throw new AppError('Không thể xóa danh mục. Vui lòng thử lại.', 500);
  }
}


