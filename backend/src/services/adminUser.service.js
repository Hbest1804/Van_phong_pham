import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Ánh xạ row DB → object trả về client (loại bỏ password_hash)
 */
function formatUser(user) {
  return {
    id:        user.id,
    email:     user.email,
    name:      user.name,
    role:      user.role,
    status:    user.status,
    phone:     user.phone    || null,
    address:   user.address  || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * 8.1 Lấy danh sách tài khoản khách hàng (role = 'user')
 * GET /api/v1/admin/users
 *
 * Query params:
 *   page     {number}  — trang hiện tại (mặc định 1)
 *   limit    {number}  — số bản ghi / trang (mặc định 20, tối đa 100)
 *   search   {string}  — tìm theo tên hoặc email (ILIKE)
 *   status   {string}  — lọc theo trạng thái: 'active' | 'locked'
 *   sortBy   {string}  — trường sắp xếp: 'created_at' | 'name' | 'email' (mặc định 'created_at')
 *   sortOrder{string}  — 'asc' | 'desc' (mặc định 'desc')
 *
 * @param {object} queryParams
 * @returns {{ users, pagination }}
 */
export async function getUsers(queryParams = {}) {
  const {
    page      = 1,
    limit     = 20,
    search    = '',
    status    = '',
    sortBy    = 'created_at',
    sortOrder = 'desc',
  } = queryParams;

  const parsedPage  = Math.max(1, parseInt(page, 10)  || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset      = (parsedPage - 1) * parsedLimit;

  // Whitelist sortBy để chặn SQL injection
  const allowedSortFields = ['created_at', 'name', 'email', 'status'];
  const safeSortBy    = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const ascending     = sortOrder === 'asc';

  // Chỉ lấy tài khoản khách hàng (không lấy admin)
  let query = supabaseAdmin
    .from('users')
    .select('id, email, name, role, status, phone, address, created_at, updated_at', { count: 'exact' })
    .eq('role', 'user');

  // Lọc theo trạng thái
  if (status === 'active' || status === 'locked') {
    query = query.eq('status', status);
  }

  // Tìm kiếm theo tên hoặc email
  if (search.trim()) {
    const keyword = search.trim();
    query = query.or(`name.ilike.%${keyword}%,email.ilike.%${keyword}%`);
  }

  // Sắp xếp & phân trang
  query = query
    .order(safeSortBy, { ascending })
    .range(offset, offset + parsedLimit - 1);

  const { data: users, error, count } = await query;

  if (error) {
    console.error('[adminUser.service] Lỗi lấy danh sách users:', error.message);
    throw new AppError('Không thể lấy danh sách người dùng. Vui lòng thử lại.', 500);
  }

  return {
    users: users.map(formatUser),
    pagination: {
      total:       count ?? 0,
      page:        parsedPage,
      limit:       parsedLimit,
      totalPages:  Math.ceil((count ?? 0) / parsedLimit),
    },
  };
}

/**
 * 8.2 Xem chi tiết một tài khoản khách hàng
 * GET /api/v1/admin/users/:id
 *
 * @param {string} userId  — UUID của user cần xem
 * @returns {object} user
 */
export async function getUserById(userId) {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, status, phone, address, created_at, updated_at')
    .eq('id', userId)
    .eq('role', 'user')   // Admin chỉ quản lý tài khoản khách hàng
    .maybeSingle();

  if (error) {
    console.error('[adminUser.service] Lỗi lấy chi tiết user:', error.message);
    throw new AppError('Không thể lấy thông tin người dùng. Vui lòng thử lại.', 500);
  }

  if (!user) {
    throw new AppError('Không tìm thấy tài khoản khách hàng.', 404);
  }

  return formatUser(user);
}

/**
 * 8.3 Thay đổi trạng thái tài khoản (khóa / mở khóa)
 * PATCH /api/v1/admin/users/:id/status
 *
 * @param {string} userId     — UUID của user cần thay đổi trạng thái
 * @param {string} newStatus  — 'active' | 'locked'
 * @returns {object} user đã được cập nhật
 */
export async function updateUserStatus(userId, newStatus) {
  // Validate giá trị trạng thái
  if (!['active', 'locked'].includes(newStatus)) {
    throw new AppError("Trạng thái không hợp lệ. Chỉ chấp nhận 'active' hoặc 'locked'.", 400);
  }

  // Kiểm tra user tồn tại và là khách hàng (không phải admin)
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('id, role, status')
    .eq('id', userId)
    .maybeSingle();

  if (lookupError) {
    console.error('[adminUser.service] Lỗi kiểm tra user:', lookupError.message);
    throw new AppError('Không thể xử lý yêu cầu. Vui lòng thử lại.', 500);
  }

  if (!existing) {
    throw new AppError('Không tìm thấy tài khoản.', 404);
  }

  // Không cho phép thay đổi trạng thái tài khoản admin
  if (existing.role === 'admin') {
    throw new AppError('Không thể thay đổi trạng thái tài khoản quản trị viên.', 403);
  }

  // Nếu trạng thái không thay đổi → thông báo luôn
  if (existing.status === newStatus) {
    const label = newStatus === 'active' ? 'đang hoạt động' : 'đã bị khoá';
    throw new AppError(`Tài khoản ${label} rồi.`, 409);
  }

  // Cập nhật trạng thái
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('users')
    .update({ status: newStatus })
    .eq('id', userId)
    .select('id, email, name, role, status, phone, address, created_at, updated_at')
    .single();

  if (updateError) {
    console.error('[adminUser.service] Lỗi cập nhật trạng thái user:', updateError.message);
    throw new AppError('Không thể cập nhật trạng thái tài khoản. Vui lòng thử lại.', 500);
  }

  return formatUser(updated);
}
