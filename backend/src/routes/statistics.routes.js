import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as statisticsController from '../controllers/statistics.controller.js';

const router = Router();

// ── Áp dụng authenticate + authorize('admin') cho toàn bộ router ─────────────
router.use(authenticate, authorize('admin'));

// ── Validation rules ──────────────────────────────────────────────────────────

const revenueQueryRules = [
  query('from')
    .optional()
    .isISO8601().withMessage("'from' phải là định dạng ngày ISO 8601 (VD: 2025-01-01)."),

  query('to')
    .optional()
    .isISO8601().withMessage("'to' phải là định dạng ngày ISO 8601 (VD: 2025-12-31)."),

  query('groupBy')
    .optional()
    .isIn(['month', 'day']).withMessage("groupBy chỉ chấp nhận 'month' hoặc 'day'."),
];

const topProductsQueryRules = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('limit phải là số nguyên từ 1 đến 50.'),

  query('from')
    .optional()
    .isISO8601().withMessage("'from' phải là định dạng ngày ISO 8601 (VD: 2025-01-01)."),

  query('to')
    .optional()
    .isISO8601().withMessage("'to' phải là định dạng ngày ISO 8601 (VD: 2025-12-31)."),

  query('sortBy')
    .optional()
    .isIn(['quantity', 'revenue']).withMessage("sortBy chỉ chấp nhận 'quantity' hoặc 'revenue'."),
];

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/statistics/overview
 * Lấy số liệu tổng quan cho dashboard Admin.
 *
 * Response: { summary, currentMonth, previousMonth, ordersByStatus, topProducts }
 */
router.get('/overview', statisticsController.getDashboardOverview);

/**
 * GET /api/v1/admin/statistics/revenue
 * Lấy dữ liệu doanh thu theo khoảng thời gian.
 *
 * Query: from?, to?, groupBy? ('month'|'day')
 * Response: { period, groupBy, data: [{ label, revenue, orders }], summary }
 */
router.get('/revenue', revenueQueryRules, validate, statisticsController.getRevenueByPeriod);

/**
 * GET /api/v1/admin/statistics/top-products
 * Lấy danh sách sản phẩm có doanh số cao nhất.
 *
 * Query: limit?, from?, to?, sortBy? ('quantity'|'revenue')
 * Response: { period, sortBy, limit, products: [{ rank, productId, productName, unitPrice, totalQuantity, totalRevenue }], summary }
 */
router.get('/top-products', topProductsQueryRules, validate, statisticsController.getTopProducts);

export default router;
