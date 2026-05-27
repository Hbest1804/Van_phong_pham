import * as categoryService from '../services/category.service.js';
import { successResponse } from '../utils/response.js';

/**
 * GET /api/v1/categories
 */
export async function getCategories(req, res, next) {
  try {
    const categories = await categoryService.getCategories();
    return successResponse(res, {
      statusCode: 200,
      message: 'Lấy danh sách danh mục thành công!',
      data: categories,
    });
  } catch (err) {
    next(err);
  }
}
