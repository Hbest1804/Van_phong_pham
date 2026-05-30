import * as statisticsService from '../services/statistics.service.js';
import { successResponse } from '../utils/response.js';

/**
 * GET /api/v1/admin/statistics/overview
 * Lấy số liệu tổng quan cho dashboard Admin.
 *
 * 🔒 Yêu cầu: authenticate + authorize('admin')
 */
export async function getDashboardOverview(req, res, next) {
  try {
    const overview = await statisticsService.getDashboardOverview();

    return successResponse(res, {
      statusCode: 200,
      message:    'Lấy số liệu tổng quan thành công.',
      data:       overview,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/statistics/revenue
 * Lấy dữ liệu doanh thu theo khoảng thời gian.
 *
 * Query params: from, to, groupBy ('month' | 'day')
 * 🔒 Yêu cầu: authenticate + authorize('admin')
 */
export async function getRevenueByPeriod(req, res, next) {
  try {
    const result = await statisticsService.getRevenueByPeriod(req.query);

    return successResponse(res, {
      statusCode: 200,
      message:    'Lấy dữ liệu doanh thu thành công.',
      data:       result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/statistics/top-products
 * Lấy danh sách sản phẩm có doanh số cao nhất.
 *
 * Query params: limit, from, to, sortBy ('quantity' | 'revenue')
 * 🔒 Yêu cầu: authenticate + authorize('admin')
 */
export async function getTopProducts(req, res, next) {
  try {
    const result = await statisticsService.getTopProducts(req.query);

    return successResponse(res, {
      statusCode: 200,
      message:    'Lấy top sản phẩm bán chạy thành công.',
      data:       result,
    });
  } catch (err) {
    next(err);
  }
}
