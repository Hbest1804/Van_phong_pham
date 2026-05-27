import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';

const router = Router();

/**
 * GET /api/v1/products
 * Lấy danh sách sản phẩm với các bộ lọc tìm kiếm, danh mục, giá cả và phân trang
 */
router.get('/', productController.getProducts);

/**
 * GET /api/v1/products/:id
 * Lấy chi tiết một sản phẩm
 */
router.get('/:id', productController.getProductById);

export default router;
