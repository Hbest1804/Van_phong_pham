import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

/**
 * GET /api/v1/categories
 * Lấy danh sách toàn bộ danh mục sản phẩm
 */
router.get('/', categoryController.getCategories);

export default router;
