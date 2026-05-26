/**
 * Tạo tài khoản admin mặc định từ biến môi trường.
 * Được gọi tự động khi server khởi động (server.js).
 *
 * Biến môi trường cần có trong .env:
 *   ADMIN_DEFAULT_EMAIL
 *   ADMIN_DEFAULT_PASSWORD
 *   ADMIN_DEFAULT_NAME     (tuỳ chọn)
 */

import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.js';

export async function seedAdmin() {
  const {
    ADMIN_DEFAULT_EMAIL,
    ADMIN_DEFAULT_PASSWORD,
    ADMIN_DEFAULT_NAME = 'Quản trị viên',
  } = process.env;

  if (!ADMIN_DEFAULT_EMAIL || !ADMIN_DEFAULT_PASSWORD) {
    console.warn('⚠️  Bỏ qua seed admin: Thiếu ADMIN_DEFAULT_EMAIL hoặc ADMIN_DEFAULT_PASSWORD trong .env');
    return;
  }

  const email = ADMIN_DEFAULT_EMAIL.toLowerCase().trim();

  // 1. Kiểm tra đã tồn tại chưa
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, email, role, status')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    // Luôn đồng bộ password_hash với ADMIN_DEFAULT_PASSWORD hiện tại trong .env
    const password_hash = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, 12);

    const updatePayload = { password_hash };
    if (existing.role !== 'admin') updatePayload.role = 'admin';
    if (existing.status !== 'active') updatePayload.status = 'active';

    const { error } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', existing.id);

    if (error) {
      console.error('❌  Không thể cập nhật admin:', error.message);
    } else {
      console.log(`✅  Admin đồng bộ: ${existing.email} — mật khẩu đã cập nhật theo .env`);
    }
    return;
  }

  // 2. Tạo mới
  const password_hash = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, 12);

  const { data: newAdmin, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      password_hash,
      name:   ADMIN_DEFAULT_NAME.trim(),
      role:   'admin',
      status: 'active',
    })
    .select('id, email, name, role, status')
    .single();

  if (insertError) {
    console.error('❌  Lỗi tạo tài khoản admin:', insertError.message);
    return;
  }

  console.log('🎉  Tạo tài khoản admin thành công!');
  console.log(`    Email : ${newAdmin.email}`);
  console.log(`    Tên   : ${newAdmin.name}`);
  console.log(`    Role  : ${newAdmin.role}`);
}
