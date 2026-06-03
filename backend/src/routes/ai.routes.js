import { Router } from 'express';
import { authenticateUserOrGuest } from '../middlewares/auth.middleware.js';
import * as aiController from '../controllers/ai.controller.js';

const router = Router();

// Áp dụng middleware authenticateUserOrGuest cho tất cả các tuyến đường AI
router.use(authenticateUserOrGuest);

/**
 * POST /api/v1/ai/chat
 * Gửi tin nhắn đến AI tư vấn sản phẩm
 */
router.post('/chat', aiController.chat);

/**
 * GET /api/v1/ai/search
 * Tìm kiếm sản phẩm thông minh bằng ngôn ngữ tự nhiên thông qua AI
 */
router.get('/search', aiController.search);

/**
 * GET /api/v1/ai/sessions
 * Lấy lịch sử các cuộc hội thoại
 */
router.get('/sessions', aiController.getSessions);

/**
 * GET /api/v1/ai/sessions/:session_id
 * Lấy danh sách tin nhắn trong một cuộc hội thoại
 */
router.get('/sessions/:session_id', aiController.getSessionMessages);

/**
 * DELETE /api/v1/ai/sessions/:session_id
 * Xóa một cuộc hội thoại và lịch sử tin nhắn của nó
 */
router.delete('/sessions/:session_id', aiController.deleteSession);

export default router;
