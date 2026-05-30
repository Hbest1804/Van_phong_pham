-- ============================================================
--  SCHEMA.SQL — Website Bán Văn Phòng Phẩm Trực Tuyến
--  Database: PostgreSQL (Supabase)
--  Tác giả  : Generated for tttn project
--  Ngày     : 2026-05-25
-- ============================================================

-- ----------------------------------------------------------------
-- 0. Extensions
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid() (Postgres 13+)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- for GIN index on product names (ILIKE search)


-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

-- Vai trò người dùng
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trạng thái tài khoản
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trạng thái đơn hàng
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'shipping', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Phương thức thanh toán
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cod', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 2. BẢNG: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,                  -- bcryptjs hash
  name          VARCHAR(100)  NOT NULL,
  role          user_role     NOT NULL DEFAULT 'user',
  status        user_status   NOT NULL DEFAULT 'active',
  phone         VARCHAR(20),
  address       TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users                IS 'Tài khoản người dùng (khách hàng & quản trị viên)';
COMMENT ON COLUMN users.password_hash  IS 'Mật khẩu đã băm bằng bcryptjs (salt 12)';
COMMENT ON COLUMN users.role           IS 'user = khách hàng, admin = quản trị viên';
COMMENT ON COLUMN users.status         IS 'active = hoạt động, locked = bị khoá';

-- Index
CREATE INDEX IF NOT EXISTS idx_users_email  ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);


-- ============================================================
-- 3. BẢNG: refresh_tokens
--    Lưu Refresh Token để hỗ trợ đăng xuất & xoay vòng token
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,               -- hash của refresh token
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE refresh_tokens IS 'Lưu refresh token (hashed) để hỗ trợ logout & token rotation';

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires  ON refresh_tokens (expires_at);


-- ============================================================
-- 3b. BẢNG: password_reset_tokens
--     Lưu token đặt lại mật khẩu (1 token / user, tự hết hạn)
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,               -- SHA-256 của raw token gửi qua email
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)                                       -- mỗi user chỉ có 1 token reset tại 1 thời điểm
);

COMMENT ON TABLE  password_reset_tokens            IS 'Token đặt lại mật khẩu — mỗi user tối đa 1 token hiệu lực';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash của token gửi trong link email';

CREATE INDEX IF NOT EXISTS idx_prt_user_id   ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires   ON password_reset_tokens (expires_at);


-- ============================================================
-- 4. BẢNG: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'Danh mục sản phẩm (bút, giấy, sổ, file hồ sơ, …)';

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories (name);


-- ============================================================
-- 5. BẢNG: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255)   NOT NULL,
  description TEXT,
  price       NUMERIC(12, 0) NOT NULL CHECK (price >= 0),   -- VNĐ, không có xu
  stock       INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id UUID           NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  image_url   TEXT,                                          -- URL ảnh trên Supabase Storage
  is_active   BOOLEAN        NOT NULL DEFAULT TRUE,          -- ẩn/hiện sản phẩm
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  products            IS 'Sản phẩm văn phòng phẩm';
COMMENT ON COLUMN products.price      IS 'Giá bán tính bằng VNĐ (không phân)';
COMMENT ON COLUMN products.stock      IS 'Số lượng tồn kho hiện tại';
COMMENT ON COLUMN products.image_url  IS 'URL công khai của ảnh trên Supabase Storage';
COMMENT ON COLUMN products.is_active  IS 'FALSE = ẩn sản phẩm, không hiển thị cho khách';

-- Index
CREATE INDEX IF NOT EXISTS idx_products_category  ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);


-- ============================================================
-- 6. BẢNG: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID           NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status         order_status   NOT NULL DEFAULT 'pending',
  total          NUMERIC(15, 0) NOT NULL CHECK (total >= 0),
  address        TEXT           NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cod',
  note           TEXT,                                       -- ghi chú của khách
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  orders                IS 'Đơn hàng của khách';
COMMENT ON COLUMN orders.total          IS 'Tổng tiền đơn hàng (VNĐ) — tính tại thời điểm đặt hàng';
COMMENT ON COLUMN orders.address        IS 'Địa chỉ giao hàng (snapshot lúc đặt)';
COMMENT ON COLUMN orders.payment_method IS 'cod = thanh toán khi nhận hàng, transfer = chuyển khoản';
COMMENT ON COLUMN orders.note           IS 'Ghi chú thêm của khách (tuỳ chọn)';

-- Index
CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);


-- ============================================================
-- 7. BẢNG: order_items
--    Mỗi dòng là 1 sản phẩm trong 1 đơn hàng
--    (tách ra khỏi JSON để dễ query & báo cáo)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID           NOT NULL REFERENCES orders  (id) ON DELETE CASCADE,
  product_id  UUID           NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  product_name VARCHAR(255)  NOT NULL,                    -- snapshot tên lúc đặt
  quantity    INTEGER        NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12, 0) NOT NULL CHECK (unit_price >= 0),  -- snapshot giá lúc đặt
  UNIQUE (order_id, product_id)                           -- mỗi sản phẩm chỉ xuất hiện 1 lần / đơn
);

COMMENT ON TABLE  order_items              IS 'Chi tiết từng mặt hàng trong đơn hàng';
COMMENT ON COLUMN order_items.product_name IS 'Tên sản phẩm snapshot — không thay đổi khi sửa sản phẩm';
COMMENT ON COLUMN order_items.unit_price   IS 'Giá tại thời điểm đặt hàng (VNĐ)';

-- Index
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);


-- ============================================================
-- 8. BẢNG: cart_items
--    Giỏ hàng phía server — mỗi row là 1 sản phẩm trong giỏ của 1 user.
--    UNIQUE (user_id, product_id) đảm bảo không trùng sản phẩm.
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users    (id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  quantity    INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)   -- mỗi sản phẩm chỉ xuất hiện 1 lần trong giỏ
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  cart_items          IS 'Giỏ hàng phía server — mỗi row là 1 sản phẩm trong giỏ của 1 user';
COMMENT ON COLUMN cart_items.quantity IS 'Số lượng sản phẩm, phải > 0';

-- Index
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id    ON cart_items (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items (product_id);


-- ============================================================
-- 9. TRIGGER: tự động cập nhật cột updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gán trigger cho từng bảng có updated_at
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','categories','products','orders','cart_items'] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I;
      CREATE TRIGGER trg_%s_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t, t, t, t);
  END LOOP;
END $$;


-- ============================================================
-- 10. TRIGGER: giảm tồn kho khi tạo order_item mới
-- ============================================================
CREATE OR REPLACE FUNCTION decrease_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Giảm tồn kho; CHECK (stock >= 0) trên bảng sẽ tự RAISE nếu âm
  UPDATE products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_order_items_decrease_stock
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION decrease_product_stock();


-- ============================================================
-- 11. TRIGGER: quản lý kho khi trạng thái đơn hàng thay đổi
--     a) Hoàn kho khi chuyển → cancelled
--     b) Enforce: cancelled là trạng thái cuối (terminal state)
-- ============================================================
CREATE OR REPLACE FUNCTION manage_stock_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- (b) Chặn đảo ngược từ 'cancelled' sang trạng thái khác
  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION
      'Không thể chuyển đơn hàng từ cancelled sang %. Cancelled là trạng thái cuối.',
      NEW.status;
  END IF;

  -- (a) Hoàn kho khi chuyển sang cancelled lần đầu
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE products p
    SET    stock = stock + oi.quantity
    FROM   order_items oi
    WHERE  oi.order_id = NEW.id
      AND  p.id = oi.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_orders_manage_stock
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION manage_stock_on_status_change();


-- ============================================================
-- 12. TRIGGER: hoàn kho khi đơn hàng bị xoá cứng (hard delete)
--     ON DELETE CASCADE xoá order_items trước khi trigger này chạy,
--     nên ta xử lý ở BEFORE DELETE để đọc được items.
-- ============================================================
CREATE OR REPLACE FUNCTION restore_stock_on_order_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ hoàn kho nếu đơn chưa bị huỷ (cancelled đã hoàn kho rồi)
  IF OLD.status <> 'cancelled' THEN
    UPDATE products p
    SET    stock = stock + oi.quantity
    FROM   order_items oi
    WHERE  oi.order_id = OLD.id
      AND  p.id = oi.product_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_orders_restore_stock_on_delete
  BEFORE DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION restore_stock_on_order_delete();


-- ============================================================
-- 13. ROW LEVEL SECURITY (RLS) — Tuỳ chọn nếu dùng Supabase Auth
--     Bỏ qua nếu backend tự xử lý auth bằng service_role key
-- ============================================================

-- Bật RLS (comment ra nếu không cần)
-- ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Ví dụ policy: user chỉ xem đơn hàng của chính mình
-- CREATE POLICY "user sees own orders"
--   ON orders FOR SELECT
--   USING (auth.uid() = user_id);


-- ============================================================
-- 14. DỮ LIỆU MẪU (Seed Data)
-- ============================================================

-- ---- Danh mục ----
INSERT INTO categories (name, description) VALUES
  ('Bút viết',        'Bút bi, bút chì, bút dạ quang, bút mực')
, ('Giấy & Tập',      'Giấy in, tập học sinh, giấy ghi chú')
, ('File & Kẹp hồ sơ','Bìa file, kẹp bướm, túi hồ sơ')
, ('Băng keo & Keo',  'Băng keo trong, băng keo đôi mặt, keo dán')
, ('Dụng cụ cắt',     'Kéo, dao rọc giấy, dao cắt chuyên dụng')
, ('Mực in & Toner',  'Mực in, hộp mực, toner máy photo')
, ('Sổ tay & Planner','Sổ ghi chú, planner, nhật ký')
, ('Khác',            'Các sản phẩm văn phòng phẩm khác')
ON CONFLICT (name) DO NOTHING;

-- ---- Tài khoản admin mặc định ----
-- Mật khẩu: Admin@123 (bcrypt hash mẫu — hãy đổi trong production!)
INSERT INTO users (email, password_hash, name, role, status) VALUES
  (
    'admin@vpp.com',
    '$2b$12$K8Gm3Y1SvFcJzCqAoNpQpuWvX0z1bHdRlS2kj9mNe7TcRfAa3OeDO',
    'Quản trị viên',
    'admin',
    'active'
  )
ON CONFLICT (email) DO NOTHING;


-- ============================================================
-- 15. HÀM DATABASE: add_to_cart_atomic
--     Thêm sản phẩm vào giỏ hàng một cách atomic để tránh race condition mất cập nhật số lượng.
--     Kiểm tra tồn kho và trạng thái hoạt động của sản phẩm ngay trong database.
-- ============================================================
CREATE OR REPLACE FUNCTION add_to_cart_atomic(
  p_user_id UUID,
  p_product_id UUID,
  p_quantity INT
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  quantity INT,
  message TEXT
) AS $$
#variable_conflict use_column
DECLARE
  v_stock INT;
  v_is_active BOOLEAN;
  v_cart_item_id UUID;
  v_product_id UUID;      -- biến tạm tránh ambiguous với output column
  v_quantity INT;         -- biến tạm tránh ambiguous với output column
  v_existing_quantity INT;
  v_message TEXT;
BEGIN
  -- 0. Khoá cart_items TRƯỚC để giữ thứ tự khoá nhất quán với create_order_transaction
  --    (cart_items → products), tránh deadlock khi checkout và add-to-cart chạy song song.
  PERFORM 1 FROM cart_items
  WHERE user_id = p_user_id AND cart_items.product_id = p_product_id
  FOR UPDATE;

  -- 1. Lấy thông tin sản phẩm và khóa dòng để tránh cập nhật đồng thời stock
  SELECT stock, is_active INTO v_stock, v_is_active
  FROM products
  WHERE products.id = p_product_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sản phẩm không tồn tại.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'Sản phẩm đã ngừng kinh doanh.' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Lấy số lượng hiện tại trong giỏ hàng (nếu có)
  SELECT cart_items.quantity INTO v_existing_quantity
  FROM cart_items
  WHERE user_id = p_user_id AND cart_items.product_id = p_product_id;

  -- 3. Thực hiện insert hoặc update atomically
  --    Dùng v_product_id / v_quantity để tránh "column reference is ambiguous"
  INSERT INTO cart_items (user_id, product_id, quantity)
  VALUES (p_user_id, p_product_id, p_quantity)
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET
    quantity   = cart_items.quantity + EXCLUDED.quantity,
    updated_at = NOW()
  RETURNING cart_items.id, cart_items.product_id, cart_items.quantity
       INTO v_cart_item_id,  v_product_id,          v_quantity;

  -- 4. Kiểm tra số lượng sau khi cập nhật để tránh race condition vượt quá tồn kho
  IF v_quantity > v_stock THEN
    RAISE EXCEPTION 'Số lượng vượt quá tồn kho. Hiện còn % sản phẩm.', v_stock USING ERRCODE = 'P0003';
  END IF;

  -- Xác định message phản hồi
  IF v_existing_quantity IS NOT NULL THEN
    v_message := 'Đã cập nhật số lượng trong giỏ hàng.';
  ELSE
    v_message := 'Đã thêm sản phẩm vào giỏ hàng.';
  END IF;

  -- Gán giá trị vào các output column của RETURNS TABLE
  id         := v_cart_item_id;
  product_id := v_product_id;
  quantity   := v_quantity;
  message    := v_message;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 16. HÀM DATABASE: sync_cart_bulk
--     Đồng bộ giỏ hàng của người dùng từ giỏ hàng guest (JSONB) lên server atomically.
--     Kiểm tra tồn kho và trạng thái hoạt động của sản phẩm ngay trong database.
-- ============================================================
CREATE OR REPLACE FUNCTION sync_cart_bulk(
  p_user_id UUID,
  p_items JSONB
)
RETURNS VOID AS $$
#variable_conflict use_column
BEGIN
  -- Thêm/Cập nhật các mặt hàng từ JSONB
  INSERT INTO cart_items (user_id, product_id, quantity)
  SELECT 
    p_user_id, 
    (item->>'productId')::UUID, 
    LEAST(SUM((item->>'quantity')::INT)::INT, p.stock)
  FROM jsonb_array_elements(p_items) AS item
  JOIN products p ON p.id = (item->>'productId')::UUID
  WHERE p.is_active = TRUE AND p.stock > 0
  GROUP BY (item->>'productId')::UUID, p.stock
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET 
    quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, (
      SELECT stock FROM products WHERE id = EXCLUDED.product_id
    )),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 17. HÀM DATABASE: create_order_transaction
--     Tạo đơn hàng từ giỏ hàng một cách hoàn toàn nguyên tử (atomic).
--     Toàn bộ các bước: validate → INSERT orders → INSERT order_items
--     (trigger giảm tồn kho) → DELETE cart_items đều nằm trong một
--     transaction duy nhất — đảm bảo tính toàn vẹn dữ liệu.
--
--     Error codes:
--       P0001 — Giỏ hàng trống
--       P0002 — Sản phẩm ngừng kinh doanh
--       P0003 — Vượt quá tồn kho
-- ============================================================
CREATE OR REPLACE FUNCTION create_order_transaction(
  p_user_id        UUID,
  p_address        TEXT,
  p_payment_method TEXT,
  p_note           TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_total    NUMERIC := 0;
  v_item     RECORD;
BEGIN
  -- 1. Khoá toàn bộ cart_items của user ngay từ đầu (FOR UPDATE):
  --    - Serialize concurrent checkouts: request thứ 2 phải chờ request 1 commit/rollback.
  --    - NOT FOUND sau PERFORM = giỏ hàng thực sự rỗng → báo lỗi P0001.
  PERFORM 1 FROM cart_items WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Tạo đơn hàng trước với total = 0 (placeholder).
  --    Total thực sự sẽ được cập nhật ở bước 5 sau khi validate xong.
  --    Làm vậy để bước 3 (INSERT order_items) có v_order_id hợp lệ.
  INSERT INTO orders (user_id, status, total, address, payment_method, note)
  VALUES (
    p_user_id,
    'pending',
    0,
    p_address,
    p_payment_method::payment_method,
    p_note
  )
  RETURNING orders.id INTO v_order_id;

  -- 3. Validate từng sản phẩm, tích luỹ tổng tiền VÀ chèn order_item trong cùng một vòng lặp.
  --    → Đảm bảo mọi order_item được chèn đều đã qua validate: không có cửa sổ thời gian
  --      cho cart_item mới (chưa validate) lọt vào qua một INSERT...SELECT riêng biệt.
  --
  --    FOR UPDATE OF p: khoá các dòng products trong suốt transaction.
  --    ORDER BY p.id: thứ tự khoá xác định → loại bỏ deadlock khi nhiều user cùng checkout.
  FOR v_item IN
    SELECT
      ci.quantity,
      p.id        AS product_id,
      p.name      AS product_name,
      p.price,
      p.stock,
      p.is_active
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = p_user_id
    ORDER BY p.id          -- deterministic lock order → no deadlock
    FOR UPDATE OF p
  LOOP
    -- 3a. Kiểm tra trạng thái sản phẩm
    IF NOT v_item.is_active THEN
      RAISE EXCEPTION 'Sản phẩm "%" đã ngừng kinh doanh.', v_item.product_name
        USING ERRCODE = 'P0002';
    END IF;

    -- 3b. Kiểm tra tồn kho
    IF v_item.quantity > v_item.stock THEN
      RAISE EXCEPTION 'Sản phẩm "%" không đủ tồn kho. Hiện còn % sản phẩm.',
        v_item.product_name, v_item.stock
        USING ERRCODE = 'P0003';
    END IF;

    -- 3c. Tích luỹ tổng tiền
    v_total := v_total + v_item.price * v_item.quantity;

    -- 3d. Chèn order_item ngay trong vòng lặp — trigger trg_order_items_decrease_stock
    --     sẽ tự giảm tồn kho sau mỗi INSERT.
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES (v_order_id, v_item.product_id, v_item.product_name, v_item.quantity, v_item.price);
  END LOOP;

  -- 4. Cập nhật total thực tế vào đơn hàng (thay cho placeholder 0 ở bước 2).
  UPDATE orders SET total = v_total WHERE id = v_order_id;

  -- 5. Xoá chỉ các sản phẩm đã đặt khỏi giỏ hàng
  --    (tránh xoá nhầm sản phẩm mới thêm song song ở tab khác)
  DELETE FROM cart_items
  WHERE user_id = p_user_id
    AND product_id IN (
      SELECT product_id
      FROM order_items
      WHERE order_id = v_order_id
    );

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;
