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
export async function getProducts(query) {
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
  if (search && search.trim() !== '') {
    dbQuery = dbQuery.ilike('name', `%${search.trim()}%`);
  }

  // Lọc theo category (validate UUID trước để tránh lỗi 500 từ PostgreSQL)
  if (categoryId && categoryId.trim() !== '' && categoryId !== 'all') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(categoryId)) {
      throw new AppError('Mã danh mục không hợp lệ.', 400);
    }
    dbQuery = dbQuery.eq('category_id', categoryId);
  }

  // Lọc theo khoảng giá tối đa
  if (maxPrice !== undefined && maxPrice !== null) {
    const parsedMaxPrice = parseFloat(maxPrice);
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
