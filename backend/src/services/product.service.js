import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

/**
 * Lấy danh sách sản phẩm kèm lọc, tìm kiếm và phân trang
 * 
 * @param {object} query
 * @param {number} query.page
 * @param {number} query.limit
 * @param {string} [query.search]
 * @param {string} [query.categoryId]
 * @param {number} [query.maxPrice]
 * @param {boolean} [query.includeInactive] - Mặc định false (chỉ lấy is_active=true)
 */
export async function getProducts(query = {}) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, parseInt(query.limit) || 12);
  const { search, categoryId, maxPrice, includeInactive = false } = query;

  // Tính toán phạm vi range cho Supabase pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Khởi tạo query
  let dbQuery = supabaseAdmin
    .from('products')
    .select('*', { count: 'exact' });

  // Mặc định chỉ lấy sản phẩm active trừ khi yêu cầu cụ thể
  if (!includeInactive) {
    dbQuery = dbQuery.eq('is_active', true);
  }

  // Lọc theo từ khóa tìm kiếm (ILIKES search)
  if (typeof search === 'string' && search.trim() !== '') {
    dbQuery = dbQuery.ilike('name', `%${search.trim()}%`);
  }

  // Lọc theo category (validate UUID trước để tránh lỗi 500 từ PostgreSQL)
  if (typeof categoryId === 'string' && categoryId.trim() !== '' && categoryId !== 'all') {
    const cleanCategoryId = categoryId.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanCategoryId)) {
      throw new AppError('Mã danh mục không hợp lệ.', 400);
    }
    dbQuery = dbQuery.eq('category_id', cleanCategoryId);
  }

  // Lọc theo khoảng giá tối đa
  if (maxPrice !== undefined && maxPrice !== null) {
    const parsedMaxPrice = typeof maxPrice === 'number' ? maxPrice : parseFloat(String(maxPrice));
    if (!isNaN(parsedMaxPrice)) {
      dbQuery = dbQuery.lte('price', parsedMaxPrice);
    }
  }

  // Sắp xếp sản phẩm mới nhất lên trước
  dbQuery = dbQuery.order('created_at', { ascending: false });

  // Áp dụng phân trang range
  dbQuery = dbQuery.range(from, to);

  const { data, count, error } = await dbQuery;

  if (error) {
    console.error('[product.service] Lỗi lấy danh sách sản phẩm:', error.message);
    throw new AppError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.', 500);
  }

  const products = data.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    price: Number(p.price),
    stock: p.stock,
    categoryId: p.category_id,
    image: p.image_url || '',
    isActive: p.is_active,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  return {
    products,
    pagination: {
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page,
      limit,
    },
  };
}

/**
 * Tạo sản phẩm mới (Admin)
 *
 * @param {object} data
 * @param {string} data.name
 * @param {string} [data.description]
 * @param {number} data.price
 * @param {number} data.stock
 * @param {string} data.categoryId
 * @param {string} [data.imageUrl]
 */
export async function createProduct(data) {
  const { name, description = '', price, stock, categoryId, imageUrl = '' } = data;

  // Validate UUID của category
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(categoryId)) {
    throw new AppError('Mã danh mục không hợp lệ.', 400);
  }

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .insert({
      name: name.trim(),
      description: description.trim(),
      price,
      stock,
      category_id: categoryId,
      image_url: imageUrl.trim(),
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[product.service] Lỗi tạo sản phẩm:', error.message);
    throw new AppError('Không thể tạo sản phẩm. Vui lòng thử lại.', 500);
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: Number(product.price),
    stock: product.stock,
    categoryId: product.category_id,
    image: product.image_url || '',
    isActive: product.is_active,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

/**
 * Cập nhật sản phẩm (Admin) — partial update
 *
 * @param {string} id
 * @param {object} data - Chỉ truyền các field cần cập nhật
 * @param {string}  [data.name]
 * @param {string}  [data.description]
 * @param {number}  [data.price]
 * @param {number}  [data.stock]
 * @param {string}  [data.categoryId]
 * @param {string}  [data.imageUrl]
 * @param {boolean} [data.isActive]
 */
export async function updateProduct(id, data) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Validate id
  if (!uuidRegex.test(id)) {
    throw new AppError('Mã sản phẩm không hợp lệ.', 400);
  }

  // Build payload chỉ với các field được gửi lên (partial update)
  const payload = {};
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.description !== undefined) payload.description = data.description.trim();
  if (data.price !== undefined) payload.price = data.price;
  if (data.stock !== undefined) payload.stock = data.stock;
  if (data.isActive !== undefined) payload.is_active = data.isActive;
  if (data.imageUrl !== undefined) payload.image_url = data.imageUrl.trim();

  if (data.categoryId !== undefined) {
    if (!uuidRegex.test(data.categoryId)) {
      throw new AppError('Mã danh mục không hợp lệ.', 400);
    }
    payload.category_id = data.categoryId;
  }

  if (Object.keys(payload).length === 0) {
    throw new AppError('Không có dữ liệu nào được cập nhật.', 400);
  }

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[product.service] Lỗi cập nhật sản phẩm:', error.message);
    throw new AppError('Không thể cập nhật sản phẩm.', 500);
  }

  if (!product) {
    throw new AppError('Sản phẩm không tồn tại.', 404);
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: Number(product.price),
    stock: product.stock,
    categoryId: product.category_id,
    image: product.image_url || '',
    isActive: product.is_active,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

/**
 * Lấy chi tiết sản phẩm theo ID
 * @param {string} id 
 */
export async function getProductById(id) {
  // Validate UUID format trước để tránh lỗi 500 từ PostgreSQL
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new AppError('Mã sản phẩm không hợp lệ.', 400);
  }

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[product.service] Lỗi lấy chi tiết sản phẩm:', error.message);
    throw new AppError('Không thể tải chi tiết sản phẩm.', 500);
  }

  if (!product) {
    throw new AppError('Sản phẩm không tồn tại.', 404);
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: Number(product.price),
    stock: product.stock,
    categoryId: product.category_id,
    image: product.image_url || '',
    isActive: product.is_active,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

/**
 * Xóa sản phẩm theo ID (Admin)
 * @param {string} id
 */
export async function deleteProduct(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new AppError('Mã sản phẩm không hợp lệ.', 400);
  }

  // Kiểm tra sản phẩm tồn tại trước khi xóa
  const { data: existing, error: findError } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (findError) {
    console.error('[product.service] Lỗi kiểm tra sản phẩm:', findError.message);
    throw new AppError('Không thể xóa sản phẩm. Vui lòng thử lại.', 500);
  }

  if (!existing) {
    throw new AppError('Sản phẩm không tồn tại.', 404);
  }

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[product.service] Lỗi xóa sản phẩm:', error.message);
    throw new AppError('Không thể xóa sản phẩm. Vui lòng thử lại.', 500);
  }
}

/**
 * Tải lên ảnh sản phẩm lên Supabase Storage bucket 'products'
 * @param {object} file - File object từ multer (memoryStorage)
 * @returns {Promise<string>} URL công khai của hình ảnh
 */
export async function uploadProductImage(file) {
  if (!file) {
    throw new AppError('Không có tập tin nào được tải lên.', 400);
  }

  const fileExt = path.extname(file.originalname) || '.jpg';
  const fileName = `${uuidv4()}${fileExt}`;

  // Tải buffer lên bucket 'products'
  const { data, error } = await supabaseAdmin.storage
    .from('products')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('[product.service] Lỗi tải ảnh lên Supabase Storage:', error);
    throw new AppError(`Tải ảnh lên Supabase thất bại: ${error.message}`, 500);
  }

  // Lấy URL công khai
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('products')
    .getPublicUrl(fileName);

  return publicUrl;
}

