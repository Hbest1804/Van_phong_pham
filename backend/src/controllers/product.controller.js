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

/**
 * POST /api/v1/products
 * Yêu cầu: Admin
 */
export async function createProduct(req, res, next) {
  try {
    const { name, description, price, stock, categoryId, imageUrl } = req.body;

    const product = await productService.createProduct({
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      categoryId,
      imageUrl,
    });

    return successResponse(res, {
      statusCode: 201,
      message: 'Tạo sản phẩm thành công!',
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/products/:id
 * Yêu cầu: Admin
 */
export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, price, stock, categoryId, imageUrl, isActive } = req.body;

    const product = await productService.updateProduct(id, {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: Number(price) }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(categoryId !== undefined && { categoryId }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    });

    return successResponse(res, {
      statusCode: 200,
      message: 'Cập nhật sản phẩm thành công!',
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/products/:id
 * Yêu cầu: Admin
 */
export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id);

    return successResponse(res, {
      statusCode: 200,
      message: 'Xóa sản phẩm thành công!',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/products/upload
 * Yêu cầu: Admin
 */
export async function uploadImage(req, res, next) {
  try {
    const imageUrl = await productService.uploadProductImage(req.file);

    return successResponse(res, {
      statusCode: 200,
      message: 'Tải ảnh lên Supabase Storage thành công!',
      data: { imageUrl },
    });
  } catch (err) {
    next(err);
  }
}

