import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Map một row orders (join order_items + products) thành object trả về client.
 */
function mapOrderItem(item) {
  return {
    id: item.id,
    productId: item.product_id,
    productName: item.product_name,
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
    subtotal: Number(item.unit_price) * item.quantity,
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    status: row.status,
    total: Number(row.total),
    address: row.address,
    paymentMethod: row.payment_method,
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: (row.order_items || []).map(mapOrderItem),
  };
}

// ── Service functions ──────────────────────────────────────────────────────────

/**
 * Tạo đơn hàng mới từ giỏ hàng hiện tại của người dùng.
 *
 * Luồng:
 *  1. Lấy cart_items (join products) của user.
 *  2. Validate: giỏ hàng không rỗng, tất cả sản phẩm đang active & đủ tồn kho.
 *  3. INSERT orders row.
 *  4. INSERT order_items rows (trigger DB sẽ tự giảm tồn kho).
 *  5. Xoá cart của user sau khi đặt hàng thành công.
 *
 * @param {string} userId                  - UUID người dùng (từ req.user.id)
 * @param {object} payload
 * @param {string} payload.address         - Địa chỉ giao hàng
 * @param {string} [payload.paymentMethod] - 'cod' | 'transfer' (mặc định 'cod')
 * @param {string} [payload.note]          - Ghi chú đơn hàng
 * @returns {Promise<object>} Đơn hàng vừa tạo kèm danh sách items
 */
export async function createOrder(userId, { address, paymentMethod = 'cod', note = '' }) {
  if (!userId) throw new AppError('ID người dùng không hợp lệ.', 400);
  if (!address || !address.trim()) throw new AppError('Địa chỉ giao hàng không được để trống.', 400);

  const validMethods = ['cod', 'transfer'];
  if (!validMethods.includes(paymentMethod)) {
    throw new AppError('Phương thức thanh toán không hợp lệ. Chỉ chấp nhận: cod, transfer.', 400);
  }

  // ── 1. Lấy giỏ hàng hiện tại ─────────────────────────────────────────────
  const { data: cartItems, error: cartError } = await supabaseAdmin
    .from('cart_items')
    .select(`
      id,
      quantity,
      products (
        id,
        name,
        price,
        stock,
        is_active
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (cartError) {
    console.error('[order.service] Lỗi lấy giỏ hàng:', cartError.message);
    throw new AppError('Không thể lấy thông tin giỏ hàng.', 500);
  }

  // ── 2. Validate ───────────────────────────────────────────────────────────
  if (!cartItems || cartItems.length === 0) {
    throw new AppError('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng.', 400);
  }

  const validItems = cartItems.filter((ci) => ci.products);
  if (validItems.length === 0) {
    throw new AppError('Không có sản phẩm hợp lệ trong giỏ hàng.', 400);
  }

  for (const ci of validItems) {
    const p = ci.products;
    if (!p.is_active) {
      throw new AppError(`Sản phẩm "${p.name}" đã ngừng kinh doanh.`, 400);
    }
    if (ci.quantity > p.stock) {
      throw new AppError(
        `Sản phẩm "${p.name}" không đủ tồn kho. Hiện còn ${p.stock} sản phẩm.`,
        400
      );
    }
  }

  // ── 3. Tính tổng tiền ─────────────────────────────────────────────────────
  const total = validItems.reduce(
    (sum, ci) => sum + Number(ci.products.price) * ci.quantity,
    0
  );

  // ── 4. INSERT order ───────────────────────────────────────────────────────
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: userId,
      status: 'pending',
      total,
      address: address.trim(),
      payment_method: paymentMethod,
      note: note?.trim() || null,
    })
    .select('id, status, total, address, payment_method, note, created_at, updated_at')
    .single();

  if (orderError) {
    console.error('[order.service] Lỗi tạo đơn hàng:', orderError.message);
    throw new AppError('Không thể tạo đơn hàng. Vui lòng thử lại.', 500);
  }

  // ── 5. INSERT order_items (trigger sẽ tự giảm tồn kho) ───────────────────
  const orderItemsPayload = validItems.map((ci) => ({
    order_id: order.id,
    product_id: ci.products.id,
    product_name: ci.products.name,
    quantity: ci.quantity,
    unit_price: ci.products.price,
  }));

  const { data: insertedItems, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(orderItemsPayload)
    .select('id, product_id, product_name, quantity, unit_price');

  if (itemsError) {
    console.error('[order.service] Lỗi tạo order_items:', itemsError.message);
    // Rollback: xoá order vừa tạo để tránh đơn hàng rỗng
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    throw new AppError('Không thể tạo chi tiết đơn hàng. Vui lòng thử lại.', 500);
  }

  // ── 6. Xoá giỏ hàng sau khi đặt hàng thành công ──────────────────────────
  const { error: clearError } = await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('user_id', userId);

  if (clearError) {
    // Không ném lỗi — đơn hàng đã tạo thành công, chỉ log cảnh báo
    console.warn('[order.service] Cảnh báo: không thể xoá giỏ hàng sau khi đặt hàng:', clearError.message);
  }

  return {
    id: order.id,
    status: order.status,
    total: Number(order.total),
    address: order.address,
    paymentMethod: order.payment_method,
    note: order.note || '',
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: insertedItems.map(mapOrderItem),
  };
}

/**
 * Lấy danh sách đơn hàng của người dùng hiện tại (phân trang).
 *
 * @param {string} userId  - UUID người dùng
 * @param {object} options
 * @param {number} options.page  - Trang hiện tại (mặc định 1)
 * @param {number} options.limit - Số đơn / trang (mặc định 10)
 * @returns {Promise<{ orders, total, page, limit, totalPages }>}
 */
export async function getMyOrders(userId, { page = 1, limit = 10 } = {}) {
  if (!userId) throw new AppError('ID người dùng không hợp lệ.', 400);

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const from = (p - 1) * l;
  const to = from + l - 1;

  const { data, error, count } = await supabaseAdmin
    .from('orders')
    .select(
      `
      id, status, total, address, payment_method, note, created_at, updated_at,
      order_items (
        id, product_id, product_name, quantity, unit_price
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[order.service] Lỗi lấy đơn hàng của user:', error.message);
    throw new AppError('Không thể tải danh sách đơn hàng.', 500);
  }

  return {
    orders: (data || []).map(mapOrder),
    total: count ?? 0,
    page: p,
    limit: l,
    totalPages: Math.ceil((count ?? 0) / l),
  };
}

/**
 * Lấy chi tiết một đơn hàng theo ID.
 * User chỉ xem được đơn của mình; admin xem được tất cả.
 *
 * @param {string} orderId - UUID đơn hàng
 * @param {object} requester - { id, role }
 * @returns {Promise<object>} Chi tiết đơn hàng
 */
export async function getOrderById(orderId, requester) {
  if (!orderId) throw new AppError('Mã đơn hàng không hợp lệ.', 400);

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(
      `
      id, user_id, status, total, address, payment_method, note, created_at, updated_at,
      order_items (
        id, product_id, product_name, quantity, unit_price
      )
    `
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    console.error('[order.service] Lỗi lấy chi tiết đơn hàng:', error.message);
    throw new AppError('Không thể tải chi tiết đơn hàng.', 500);
  }

  if (!order) throw new AppError('Đơn hàng không tồn tại.', 404);

  // Kiểm tra quyền: user chỉ xem đơn hàng của chính mình
  if (requester.role !== 'admin' && order.user_id !== requester.id) {
    throw new AppError('Bạn không có quyền xem đơn hàng này.', 403);
  }

  return {
    ...mapOrder(order),
    userId: order.user_id,
  };
}

/**
 * Lấy tất cả đơn hàng — chỉ dành cho Admin (phân trang + lọc theo status).
 *
 * @param {object} options
 * @param {number}  options.page
 * @param {number}  options.limit
 * @param {string}  [options.status]  - Lọc theo trạng thái đơn hàng
 * @returns {Promise<{ orders, total, page, limit, totalPages }>}
 */
export async function getAllOrders({ page = 1, limit = 10, status } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const from = (p - 1) * l;
  const to = from + l - 1;

  const validStatuses = ['pending', 'shipping', 'completed', 'cancelled'];

  let query = supabaseAdmin
    .from('orders')
    .select(
      `
      id, user_id, status, total, address, payment_method, note, created_at, updated_at,
      order_items (
        id, product_id, product_name, quantity, unit_price
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status && validStatuses.includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[order.service] Lỗi lấy tất cả đơn hàng (admin):', error.message);
    throw new AppError('Không thể tải danh sách đơn hàng.', 500);
  }

  return {
    orders: (data || []).map((row) => ({ ...mapOrder(row), userId: row.user_id })),
    total: count ?? 0,
    page: p,
    limit: l,
    totalPages: Math.ceil((count ?? 0) / l),
  };
}

/**
 * Cập nhật trạng thái đơn hàng — chỉ dành cho Admin.
 * Luồng chuyển trạng thái hợp lệ:
 *   pending → shipping → completed
 *   pending | shipping → cancelled
 *
 * @param {string} orderId    - UUID đơn hàng
 * @param {string} newStatus  - Trạng thái mới
 * @returns {Promise<object>} Đơn hàng sau khi cập nhật
 */
export async function updateOrderStatus(orderId, newStatus) {
  if (!orderId) throw new AppError('Mã đơn hàng không hợp lệ.', 400);

  const validStatuses = ['pending', 'shipping', 'completed', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new AppError(
      `Trạng thái không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(', ')}.`,
      400
    );
  }

  // Lấy trạng thái hiện tại
  const { data: existing, error: findError } = await supabaseAdmin
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .maybeSingle();

  if (findError) {
    console.error('[order.service] Lỗi tìm đơn hàng:', findError.message);
    throw new AppError('Không thể tìm đơn hàng.', 500);
  }
  if (!existing) throw new AppError('Đơn hàng không tồn tại.', 404);

  // Kiểm tra luồng chuyển trạng thái hợp lệ
  const allowedTransitions = {
    pending: ['shipping', 'cancelled'],
    shipping: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  const allowed = allowedTransitions[existing.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Không thể chuyển đơn hàng từ "${existing.status}" sang "${newStatus}".`,
      422
    );
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .select(
      `
      id, user_id, status, total, address, payment_method, note, created_at, updated_at,
      order_items (
        id, product_id, product_name, quantity, unit_price
      )
    `
    )
    .single();

  if (updateError) {
    console.error('[order.service] Lỗi cập nhật trạng thái đơn hàng:', updateError.message);

    // Bắt lỗi từ trigger DB (cancelled là terminal state)
    if (updateError.message?.includes('Không thể chuyển đơn hàng từ cancelled')) {
      throw new AppError(updateError.message, 422);
    }
    throw new AppError('Không thể cập nhật trạng thái đơn hàng.', 500);
  }

  return { ...mapOrder(updated), userId: updated.user_id };
}
