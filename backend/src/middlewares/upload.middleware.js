import multer from 'multer';
import { AppError } from '../utils/AppError.js';

// Khởi tạo memory storage để lưu trữ tạm thời file dưới dạng Buffer trước khi tải lên Supabase
const storage = multer.memoryStorage();

// Bộ lọc định dạng file, chỉ cho phép file ảnh
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Định dạng file không hợp lệ. Chỉ chấp nhận các file hình ảnh!', 400), false);
  }
};

// Middleware tải ảnh lên (giới hạn dung lượng 5MB)
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});
