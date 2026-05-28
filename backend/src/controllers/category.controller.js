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

/**
 * POST /api/v1/categories
 * Yêu cầu: Admin
 */
export async function createCategory(req, res, next) {
  try {
    const { name, description } = req.body;
    const category = await categoryService.createCategory({ name, description });

    return successResponse(res, {
      statusCode: 201,
      message: 'Tạo danh mục mới thành công!',
      data: category,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/categories/:id
 * Yêu cầu: Admin
 */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await categoryService.updateCategory(id, { name, description });

    return successResponse(res, {
      statusCode: 200,
      message: 'Cập nhật danh mục thành công!',
      data: category,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/categories/:id
 * Yêu cầu: Admin
 */
export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    await categoryService.deleteCategory(id);

    return successResponse(res, {
      statusCode: 200,
      message: 'Xóa danh mục thành công!',
    });
  } catch (err) {
    next(err);
  }
}


