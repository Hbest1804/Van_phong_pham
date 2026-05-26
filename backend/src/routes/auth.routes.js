import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.middleware.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// ── Validation rules ─────────────────────────────────────────────────────────

const registerRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email không được để trống.')
    .isEmail().withMessage('Email không đúng định dạng.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Mật khẩu không được để trống.')
    .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự.')
    .matches(/[A-Z]/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa.')
    .matches(/[0-9]/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ số.'),

  body('name')
    .trim()
    .notEmpty().withMessage('Họ tên không được để trống.')
    .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2 đến 100 ký tự.'),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^(0[3|5|7|8|9])+([0-9]{8})$/).withMessage('Số điện thoại không hợp lệ (phải là số VN 10 chữ số).'),

  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Địa chỉ tối đa 500 ký tự.'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Tạo tài khoản người dùng mới
 */
router.post('/register', registerRules, validate, authController.register);

// ─────────────────────────────────────────────────────────────────────────────

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email không được để trống.')
    .isEmail().withMessage('Email không đúng định dạng.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Mật khẩu không được để trống.'),
];

/**
 * POST /api/v1/auth/login
 * Đăng nhập bằng email và mật khẩu
 */
router.post('/login', loginRules, validate, authController.login);

export default router;
