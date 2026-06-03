import * as aiService from '../services/ai.service.js';
import { successResponse } from '../utils/response.js';

/**
 * Gửi tin nhắn chat đến AI tư vấn
 */
export async function chat(req, res, next) {
  try {
    const { id: userId, guestSessionId } = req.user;
    const { sessionId, message } = req.body;

    const result = await aiService.chatWithAI(userId, guestSessionId, sessionId, message);

    return successResponse(res, {
      statusCode: 200,
      message: 'Nhận phản hồi từ AI thành công.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách các cuộc trò chuyện của người dùng/guest
 */
export async function getSessions(req, res, next) {
  try {
    const { id: userId, guestSessionId } = req.user;

    const result = await aiService.getSessions(userId, guestSessionId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Lấy danh sách cuộc hội thoại thành công.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy lịch sử tin nhắn của một cuộc hội thoại
 */
export async function getSessionMessages(req, res, next) {
  try {
    const { id: userId, guestSessionId } = req.user;
    const { session_id: sessionId } = req.params;

    const result = await aiService.getSessionMessages(userId, guestSessionId, sessionId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Tải lịch sử tin nhắn thành công.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa một cuộc hội thoại
 */
export async function deleteSession(req, res, next) {
  try {
    const { id: userId, guestSessionId } = req.user;
    const { session_id: sessionId } = req.params;

    await aiService.deleteSession(userId, guestSessionId, sessionId);

    return successResponse(res, {
      statusCode: 200,
      message: 'Xóa cuộc hội thoại thành công.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Tìm kiếm sản phẩm thông minh bằng AI
 */
export async function search(req, res, next) {
  try {
    const queryStr = req.query.q || req.query.query;

    const result = await aiService.searchProductsWithAI(queryStr);

    return successResponse(res, {
      statusCode: 200,
      message: 'Tìm kiếm sản phẩm thông minh thành công.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

