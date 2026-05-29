import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Map một row cart_items (join products) thành object trả về client.
 */
function mapCartItem(row) {
  const p = row.products;
  return {
    cartItemId: row.id,
    quantity: row.quantity,
    product: {
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      stock: p.stock,
      categoryId: p.category_id,
      image: p.image_url || '',
      isActive: p.is_active,
    },
  };
}

// ── Service functions ──────────────────────────────────────────────────────────

/**
 * GET giỏ hàng của người dùng hiện tại.
 * Trả về danh sách items kèm thông tin sản phẩm và tổng tiền.
 *
 * @param {string|number} userId - ID của người dùng (từ req.user.id)
 * @returns {Promise<{ items: object[], totalPrice: number, itemCount: number }>}
 */
export async function getCart(userId) {
  // Validate: userId phải tồn tại và là số hoặc chuỗi không rỗng
  if (!userId) {
    throw new AppError('ID người dùng không hợp lệ.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('cart_items')
    .select(`
      id,
      quantity,
      products (
        id,
        name,
        description,
        price,
        stock,
        category_id,
        image_url,
        is_active
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[cart.service] Lỗi lấy giỏ hàng:', error.message);
    throw new AppError('Không thể tải giỏ hàng. Vui lòng thử lại.', 500);
  }

  // Giữ lại các item mà sản phẩm tồn tại trong hệ thống (kể cả đã ngừng kinh doanh)
  const validItems = (data || []).filter(row => row.products);

  const items = validItems.map(mapCartItem);

  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, totalPrice, itemCount };
}

/**
 * Thêm sản phẩm vào giỏ hàng.
 * - Nếu sản phẩm chưa có → INSERT row mới.
 * - Nếu đã có → cộng dồn quantity (UPDATE).
 * - Kiểm tra: sản phẩm tồn tại, đang active, và đủ tồn kho.
 *
 * @param {string|number} userId    - ID người dùng (từ req.user.id)
 * @param {string|number} productId - ID sản phẩm
 * @param {number}        quantity  - Số lượng muốn thêm (mặc định 1)
 * @returns {Promise<object>} Cart item sau khi thêm
 */
export async function addToCart(userId, productId, quantity = 1) {
  if (!userId) {
    throw new AppError('ID người dùng không hợp lệ.', 400);
  }
  if (!productId) {
    throw new AppError('Mã sản phẩm không được để trống.', 400);
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(productId)) {
    throw new AppError('Mã sản phẩm không hợp lệ.', 400);
  }

  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new AppError('Số lượng phải là số nguyên lớn hơn 0.', 400);
  }

  // Gọi database function qua RPC để thêm/cập nhật giỏ hàng atomically, tránh race condition
  const { data: cartItem, error: rpcError } = await supabaseAdmin
    .rpc('add_to_cart_atomic', {
      p_user_id: userId,
      p_product_id: productId,
      p_quantity: qty
    })
    .single();

  if (rpcError) {
    console.error('[cart.service] Lỗi thêm vào giỏ atomic:', rpcError.message);
    
    if (rpcError.code === 'P0002') {
      throw new AppError('Sản phẩm không tồn tại.', 404);
    }
    if (rpcError.code === 'P0001') {
      throw new AppError('Sản phẩm đã ngừng kinh doanh.', 400);
    }
    if (rpcError.code === 'P0003') {
      throw new AppError(rpcError.message, 400);
    }
    throw new AppError('Không thể thêm sản phẩm vào giỏ hàng.', 500);
  }

  if (!cartItem) {
    throw new AppError('Không thể thêm sản phẩm vào giỏ hàng.', 500);
  }

  return {
    cartItemId: cartItem.id,
    productId: cartItem.product_id,
    quantity: cartItem.quantity,
    message: cartItem.message,
  };
}

/**
 * Cập nhật số lượng sản phẩm trong giỏ hàng.
 * - Validate: cart item thuộc về user (chống sửa của người khác).
 * - Validate: số lượng mới không vượt tồn kho.
 *
 * @param {string} userId    - UUID người dùng
 * @param {string} productId - UUID sản phẩm
 * @param {number} quantity  - Số lượng mới (phải >= 1)
 */
export async function updateCartItem(userId, productId, quantity) {
  if (!userId || !productId) {
    throw new AppError('Thông tin không hợp lệ.', 400);
  }

  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new AppError('Số lượng phải là số nguyên lớn hơn 0.', 400);
  }

  // ── 1 & 2. Lấy mục giỏ hàng kèm thông tin sản phẩm bằng JOIN (Single Roundtrip) ──
  const { data: cartItem, error: findError } = await supabaseAdmin
    .from('cart_items')
    .select(`
      id,
      user_id,
      product_id,
      quantity,
      products (
        stock,
        is_active
      )
    `)
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (findError) {
    console.error('[cart.service] Lỗi tìm cart item:', findError.message);
    throw new AppError('Không thể tìm mục giỏ hàng.', 500);
  }
  if (!cartItem) {
    throw new AppError('Sản phẩm không có trong giỏ hàng.', 404);
  }

  const product = cartItem.products;
  if (!product) {
    throw new AppError('Sản phẩm không tồn tại.', 404);
  }
  if (!product.is_active) {
    throw new AppError('Sản phẩm đã ngừng kinh doanh.', 400);
  }
  if (qty > product.stock) {
    throw new AppError(
      `Số lượng vượt quá tồn kho. Hiện còn ${product.stock} sản phẩm.`,
      400
    );
  }

  // ── 3. Cập nhật số lượng ─────────────────────────────────────────────────
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('cart_items')
    .update({ quantity: qty })
    .eq('user_id', userId)
    .eq('product_id', productId)
    .select('id, quantity, product_id')
    .single();

  if (updateError) {
    console.error('[cart.service] Lỗi cập nhật giỏ hàng:', updateError.message);
    throw new AppError('Không thể cập nhật số lượng.', 500);
  }

  return {
    cartItemId: updated.id,
    productId: updated.product_id,
    quantity: updated.quantity,
  };
}

/**
 * Xoá một sản phẩm khỏi giỏ hàng.
 *
 * @param {string} userId    - UUID người dùng
 * @param {string} productId - UUID sản phẩm
 */
export async function removeCartItem(userId, productId) {
  if (!userId || !productId) {
    throw new AppError('Thông tin không hợp lệ.', 400);
  }

  // Kết hợp kiểm tra quyền sở hữu và xoá trong một truy vấn duy nhất
  const { data, error: deleteError } = await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
    .select('id');

  if (deleteError) {
    console.error('[cart.service] Lỗi xoá cart item:', deleteError.message);
    throw new AppError('Không thể xoá sản phẩm khỏi giỏ hàng.', 500);
  }
}

/**
 * Xoá toàn bộ giỏ hàng của người dùng.
 *
 * @param {string} userId - UUID người dùng
 */
export async function clearCart(userId) {
  if (!userId) {
    throw new AppError('ID người dùng không hợp lệ.', 400);
  }

  const { error } = await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[cart.service] Lỗi xoá giỏ hàng:', error.message);
    throw new AppError('Không thể xoá giỏ hàng. Vui lòng thử lại.', 500);
  }
}

/**
 * Đồng bộ giỏ hàng bulk từ local/guest.
 *
 * @param {string} userId - UUID người dùng
 * @param {Array}  items  - Mảng các sản phẩm [{ productId, quantity }]
 */
export async function bulkSyncCart(userId, items) {
  if (!userId) {
    throw new AppError('ID người dùng không hợp lệ.', 400);
  }
  if (!Array.isArray(items)) {
    throw new AppError('Dữ liệu đồng bộ phải là một mảng.', 400);
  }

  const { error } = await supabaseAdmin.rpc('sync_cart_bulk', {
    p_user_id: userId,
    p_items: items
  });

  if (error) {
    console.error('[cart.service] Lỗi đồng bộ giỏ hàng bulk:', error.message);
    throw new AppError('Không thể đồng bộ giỏ hàng với máy chủ.', 500);
  }
}
