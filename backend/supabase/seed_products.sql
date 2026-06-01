-- ============================================================
-- SEED_PRODUCTS.SQL — 8 sản phẩm mẫu (mỗi danh mục có đúng 1 sản phẩm)
-- ============================================================

-- Bảng danh mục sản phẩm (đảm bảo các danh mục tồn tại)
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

-- Thêm 8 sản phẩm mẫu tương ứng với 8 danh mục
INSERT INTO products (name, description, price, stock, category_id, image_url, is_active) VALUES
(
  'Bút bi Thiên Long TL-027', 
  'Bút bi phổ thông ngòi 0.5mm, viết trơn, ra mực đều, phù hợp cho học sinh và nhân viên văn phòng.', 
  4000, 
  350, 
  (SELECT id FROM categories WHERE name = 'Bút viết' LIMIT 1),
  'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?q=80&w=400',
  TRUE
),
(
  'Giấy in Double A A4 70gsm', 
  'Giấy in cao cấp Double A nhập khẩu Thái Lan, định lượng 70gsm dai mịn, không kẹt giấy, độ trắng cao.', 
  78000, 
  120, 
  (SELECT id FROM categories WHERE name = 'Giấy & Tập' LIMIT 1),
  'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=400',
  TRUE
),
(
  'Bìa còng 7cm Kokuyo A4', 
  'Bìa còng lưu trữ hồ sơ Kokuyo độ dày gáy 7cm, làm bằng các-tông bọc simili bền đẹp, còng inox chắc chắn.', 
  45000, 
  90, 
  (SELECT id FROM categories WHERE name = 'File & Kẹp hồ sơ' LIMIT 1),
  'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?q=80&w=400',
  TRUE
),
(
  'Băng keo trong 2 inch 100 yard', 
  'Băng dính bản lớn đóng thùng carton, độ bám dính siêu tốt, dai chắc không bị đứt quang giữa chừng.', 
  16000, 
  200, 
  (SELECT id FROM categories WHERE name = 'Băng keo & Keo' LIMIT 1),
  'https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?q=80&w=400',
  TRUE
),
(
  'Kéo văn phòng SDI 085', 
  'Kéo thép không gỉ SDI cán nhựa mềm êm tay, lưỡi kéo sắc bén giúp cắt giấy tờ nhanh chóng.', 
  22000, 
  80, 
  (SELECT id FROM categories WHERE name = 'Dụng cụ cắt' LIMIT 1),
  'https://images.unsplash.com/photo-1504198266287-1659872e6590?q=80&w=400',
  TRUE
),
(
  'Hộp mực máy in Canon Cartridge 325', 
  'Toner cartridge Canon 325 tương thích dòng máy in Canon LBP 6000 / 6030, cho bản in đậm nét sắc sảo.', 
  350000, 
  30, 
  (SELECT id FROM categories WHERE name = 'Mực in & Toner' LIMIT 1),
  'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?q=80&w=400',
  TRUE
),
(
  'Sổ tay da lò xo Deli A5', 
  'Sổ ghi chú bìa da PU cao cấp Deli kích thước A5, giấy viết láng mịn định lượng 80gsm chống lóa mắt.', 
  35000, 
  110, 
  (SELECT id FROM categories WHERE name = 'Sổ tay & Planner' LIMIT 1),
  'https://images.unsplash.com/photo-1531346878377-a5be20888e57?q=80&w=400',
  TRUE
),
(
  'Casio FX-570VN Plus 2nd Edition', 
  'Máy tính khoa học Casio FX-570VN Plus chính hãng cho học sinh sinh viên giải hệ phương trình phức tạp.', 
  450000, 
  40, 
  (SELECT id FROM categories WHERE name = 'Khác' LIMIT 1),
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=400',
  TRUE
)
ON CONFLICT DO NOTHING;
