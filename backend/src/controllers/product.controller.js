import * as productService from '../services/product.service.js';
import { successResponse } from '../utils/response.js';

/**
 * GET /api/v1/products
 * Query: { page, limit, search, categoryId, maxPrice }
 */
export async function getProducts(req, res, next) {
  try {
    const { page, limit, search, categoryId, maxPrice } = req.query;

    const result = await productService.getProducts({
      page,
      limit,
      search,
      categoryId,
      maxPrice,
    });

    return successResponse(res, {
      statusCode: 200,
      message: 'Lấy danh sách sản phẩm thành công!',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/products/:id
 */
export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    return successResponse(res, {
      statusCode: 200,
      message: 'Lấy chi tiết sản phẩm thành công!',
      data: product,
    });
  } catch (err) {
    next(err);
  }
}
