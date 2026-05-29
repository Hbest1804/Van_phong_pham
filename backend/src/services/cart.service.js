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

  // Lọc bỏ các item mà sản phẩm không còn tồn tại hoặc đã bị ẩn
  const validItems = (data || []).filter(row => row.products && row.products.is_active);

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

  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new AppError('Số lượng phải là số nguyên lớn hơn 0.', 400);
  }

  // ── 1. Kiểm tra sản phẩm tồn tại & active ───────────────────────────────
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('id, name, stock, is_active')
    .eq('id', productId)
    .maybeSingle();

  if (productError) {
    console.error('[cart.service] Lỗi kiểm tra sản phẩm:', productError.message);
    throw new AppError('Không thể kiểm tra sản phẩm. Vui lòng thử lại.', 500);
  }
  if (!product) {
    throw new AppError('Sản phẩm không tồn tại.', 404);
  }
  if (!product.is_active) {
    throw new AppError('Sản phẩm đã ngừng kinh doanh.', 400);
  }

  // ── 2. Kiểm tra item đã có trong giỏ chưa ───────────────────────────────
  const { data: existing, error: findError } = await supabaseAdmin
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (findError) {
    console.error('[cart.service] Lỗi kiểm tra giỏ hàng:', findError.message);
    throw new AppError('Không thể kiểm tra giỏ hàng. Vui lòng thử lại.', 500);
  }

  const newQuantity = existing ? existing.quantity + qty : qty;

  // ── 3. Validate tồn kho ──────────────────────────────────────────────────
  if (newQuantity > product.stock) {
    throw new AppError(
      `Số lượng vượt quá tồn kho. Hiện còn ${product.stock} sản phẩm.`,
      400
    );
  }

  // ── 4. Upsert vào cart_items ─────────────────────────────────────────────
  let cartItem;
  let upsertError;

  if (existing) {
    // Tăng số lượng nếu đã có
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity: newQuantity })
      .eq('id', existing.id)
      .select('id, quantity, product_id')
      .single();

    cartItem = data;
    upsertError = error;
  } else {
    // Thêm mới
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .insert({ user_id: userId, product_id: productId, quantity: qty })
      .select('id, quantity, product_id')
      .single();

    cartItem = data;
    upsertError = error;
  }

  if (upsertError) {
    console.error('[cart.service] Lỗi thêm vào giỏ:', upsertError.message);
    throw new AppError('Không thể thêm sản phẩm vào giỏ hàng.', 500);
  }

  return {
    cartItemId: cartItem.id,
    productId: cartItem.product_id,
    quantity: cartItem.quantity,
    message: existing ? 'Đã cập nhật số lượng trong giỏ hàng.' : 'Đã thêm sản phẩm vào giỏ hàng.',
  };
}

/**
 * Cập nhật số lượng sản phẩm trong giỏ hàng.
 * - Validate: cart item thuộc về user (chống sửa của người khác).
 * - Validate: số lượng mới không vượt tồn kho.
 *
 * @param {string} userId     - UUID người dùng
 * @param {string} cartItemId - UUID của cart_items row
 * @param {number} quantity   - Số lượng mới (phải >= 1)
 */
export async function updateCartItem(userId, cartItemId, quantity) {
  if (!userId || !cartItemId) {
    throw new AppError('Thông tin không hợp lệ.', 400);
  }

  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new AppError('Số lượng phải là số nguyên lớn hơn 0.', 400);
  }

  // ── 1. Lấy cart item + kiểm tra quyền sở hữu ────────────────────────────
  const { data: cartItem, error: findError } = await supabaseAdmin
    .from('cart_items')
    .select('id, user_id, product_id, quantity')
    .eq('id', cartItemId)
    .maybeSingle();

  if (findError) {
    console.error('[cart.service] Lỗi tìm cart item:', findError.message);
    throw new AppError('Không thể tìm mục giỏ hàng.', 500);
  }
  if (!cartItem) {
    throw new AppError('Mục giỏ hàng không tồn tại.', 404);
  }
  if (cartItem.user_id !== userId) {
    throw new AppError('Bạn không có quyền chỉnh sửa mục này.', 403);
  }

  // ── 2. Kiểm tra tồn kho ──────────────────────────────────────────────────
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('stock, is_active')
    .eq('id', cartItem.product_id)
    .maybeSingle();

  if (productError || !product) {
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
    .eq('id', cartItemId)
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
 * Kiểm tra cart item thuộc về user trước khi xoá.
 *
 * @param {string} userId     - UUID người dùng
 * @param {string} cartItemId - UUID của cart_items row
 */
export async function removeCartItem(userId, cartItemId) {
  if (!userId || !cartItemId) {
    throw new AppError('Thông tin không hợp lệ.', 400);
  }

  // Kiểm tra tồn tại & quyền sở hữu
  const { data: cartItem, error: findError } = await supabaseAdmin
    .from('cart_items')
    .select('id, user_id')
    .eq('id', cartItemId)
    .maybeSingle();

  if (findError) {
    console.error('[cart.service] Lỗi tìm cart item:', findError.message);
    throw new AppError('Không thể tìm mục giỏ hàng.', 500);
  }
  if (!cartItem) {
    throw new AppError('Mục giỏ hàng không tồn tại.', 404);
  }
  if (cartItem.user_id !== userId) {
    throw new AppError('Bạn không có quyền xoá mục này.', 403);
  }

  const { error: deleteError } = await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('id', cartItemId);

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
