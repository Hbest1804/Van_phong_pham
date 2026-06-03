import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

/**
 * Trích xuất từ khóa tìm kiếm từ văn bản tiếng Việt
 * Loại bỏ các từ dừng (stop words) phổ biến
 * 
 * @param {string} text 
 * @returns {string[]}
 */
function extractKeywords(text) {
  if (!text) return [];
  const normalized = text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
    .trim();
  
  const words = normalized.split(/\s+/);
  
  const stopWords = new Set([
    'tôi', 'em', 'mình', 'chúng', 'ta', 'bạn', 'quý', 'khách', 'anh', 'chị',
    'muốn', 'cần', 'tìm', 'mua', 'xem', 'hỏi', 'tư', 'vấn', 'giới', 'thiệu',
    'có', 'không', 'nào', 'gì', 'đâu', 'ở', 'tại', 'của', 'cho', 'một', 'những',
    'cái', 'chiếc', 'cuốn', 'quyển', 'tờ', 'hộp', 'bộ', 'loại', 'mẫu',
    'và', 'hoặc', 'nhưng', 'thì', 'là', 'để', 'như', 'với', 'trong', 'ngoài',
    'này', 'kia', 'đó', 'ấy', 'nào', 'sao', 'thế',
    'shop', 'cửa', 'hàng', 'tiệm', 'vpp', 'văn', 'phòng', 'phẩm',
    'bán', 'cung', 'cấp', 'hiện', 'đang', 'được', 'lắm', 'nhỉ', 'nhé', 'nha', 'ạ'
  ]);

  const keywords = words
    .map(w => w.trim())
    .filter(w => w.length > 1 && !stopWords.has(w));
  
  return [...new Set(keywords)];
}

/**
 * Gửi câu hỏi tư vấn sản phẩm đến AI (Gemini)
 * 
 * @param {string|null} userId - ID của user nếu đã đăng nhập, null nếu là guest
 * @param {string|null} guestSessionId - UUID của guest session nếu chưa đăng nhập, null nếu là user
 * @param {string|null} sessionId - ID của phiên chat hiện tại (nếu có)
 * @param {string} message - Nội dung tin nhắn của người dùng
 */
export async function chatWithAI(userId, guestSessionId, sessionId, message) {
  if (!message || message.trim() === '') {
    throw new AppError('Tin nhắn không được để trống.', 400);
  }

  let activeSessionId = sessionId;
  let sessionTitle = 'Cuộc trò chuyện mới';

  // 1. Tạo mới hoặc xác minh phiên chat
  if (!activeSessionId) {
    // Tạo tiêu đề từ tin nhắn đầu tiên (giới hạn 40 ký tự)
    const cleanMsg = message.trim();
    sessionTitle = cleanMsg.substring(0, 40) + (cleanMsg.length > 40 ? '...' : '');

    const insertData = {
      title: sessionTitle,
      user_id: userId || null,
      guest_session_id: guestSessionId || null,
    };

    const { data: newSession, error: createError } = await supabaseAdmin
      .from('chat_sessions')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error('[ai.service] Lỗi tạo phiên chat:', createError.message);
      throw new AppError('Không thể khởi tạo phiên trò chuyện. Vui lòng thử lại.', 500);
    }

    activeSessionId = newSession.id;
  } else {
    // Xác minh quyền sở hữu phiên chat hiện tại
    const { data: existingSession, error: checkError } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', activeSessionId)
      .maybeSingle();

    if (checkError) {
      console.error('[ai.service] Lỗi xác minh phiên chat:', checkError.message);
      throw new AppError('Lỗi kiểm tra phiên trò chuyện.', 500);
    }

    if (!existingSession) {
      throw new AppError('Phiên trò chuyện không tồn tại.', 404);
    }

    // Kiểm tra tính hợp lệ của quyền sở hữu
    if (userId) {
      if (existingSession.user_id !== userId) {
        throw new AppError('Bạn không có quyền truy cập phiên trò chuyện này.', 403);
      }
    } else {
      if (existingSession.guest_session_id !== guestSessionId || existingSession.user_id !== null) {
        throw new AppError('Bạn không có quyền truy cập phiên trò chuyện này.', 403);
      }
    }

    sessionTitle = existingSession.title;
  }

  // 2. Lưu tin nhắn của người dùng vào cơ sở dữ liệu
  const { error: saveUserMsgError } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      session_id: activeSessionId,
      sender: 'user',
      message: message.trim(),
    });

  if (saveUserMsgError) {
    console.error('[ai.service] Lỗi lưu tin nhắn user:', saveUserMsgError.message);
    throw new AppError('Lỗi lưu lịch sử tin nhắn.', 500);
  }

  // 3. Lấy lịch sử hội thoại trong phiên (giới hạn 30 tin nhắn gần nhất để tránh quá tải context)
  const { data: history, error: historyError } = await supabaseAdmin
    .from('chat_messages')
    .select('sender, message, created_at')
    .eq('session_id', activeSessionId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (historyError) {
    console.error('[ai.service] Lỗi lấy lịch sử chat:', historyError.message);
    throw new AppError('Lỗi tải lịch sử trò chuyện.', 500);
  }

  // Đảo ngược lại mảng để có thứ tự thời gian tăng dần trước khi gửi tới Gemini
  if (history) {
    history.reverse();
  }

  // 4. Trích xuất từ khóa từ tin nhắn hiện tại và tin nhắn của người dùng trong lịch sử để làm context phù hợp
  const userMessages = history
    .filter(h => h.sender === 'user')
    .map(h => h.message)
    .join(' ');
  const combinedText = `${userMessages} ${message}`;
  const keywords = extractKeywords(combinedText);

  let productsQuery = supabaseAdmin
    .from('products')
    .select('id, name, description, price, stock, categories(name)')
    .eq('is_active', true);

  if (keywords.length > 0) {
    const orConditions = keywords.flatMap(kw => [
      `name.ilike.%${kw}%`,
      `description.ilike.%${kw}%`
    ]).join(',');
    productsQuery = productsQuery.or(orConditions);
  }

  let { data: products, error: productsError } = await productsQuery.limit(15);

  if (productsError) {
    console.error('[ai.service] Lỗi lấy sản phẩm làm context:', productsError.message);
    throw new AppError('Lỗi tải danh mục sản phẩm của cửa hàng.', 500);
  }

  // Nếu không có từ khóa hoặc không tìm thấy sản phẩm khớp từ khóa, lấy top 15 sản phẩm mới nhất làm context nền
  if (!products || products.length === 0) {
    const { data: fallbackProducts, error: fallbackError } = await supabaseAdmin
      .from('products')
      .select('id, name, description, price, stock, categories(name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(15);

    if (!fallbackError && fallbackProducts) {
      products = fallbackProducts;
    } else {
      products = [];
    }
  }

  // Định dạng danh sách sản phẩm gửi tới LLM
  const productsContextText = products.map(p => {
    const categoryName = p.categories?.name || 'Khác';
    return `- ${p.name} (Mã sản phẩm: ${p.id}): ${p.description || 'Không có mô tả'}. Giá bán: ${Number(p.price).toLocaleString('vi-VN')} VNĐ. Danh mục: ${categoryName}. Tồn kho: ${p.stock} cái.`;
  }).join('\n');

  // 5. Chuẩn bị system instruction và nội dung hội thoại
  const systemInstruction = `Bạn là Trợ lý Tư vấn Sản phẩm Văn phòng Phẩm chuyên nghiệp, thông minh và cực kỳ thân thiện của cửa hàng "Thiên đường văn phòng phẩm".
Nhiệm vụ của bạn là lắng nghe nhu cầu của khách hàng, giải đáp thắc mắc và tư vấn, gợi ý sản phẩm phù hợp từ kho hàng có sẵn.

Dưới đây là danh sách sản phẩm văn phòng phẩm hiện có trong cửa hàng:
${productsContextText}

Quy tắc ứng xử và tư vấn:
1. Luôn phản hồi lịch sự, thân thiện, súc tích và sử dụng tiếng Việt tự nhiên.
2. Dựa vào câu hỏi/yêu cầu của khách hàng, hãy gợi ý một hoặc vài sản phẩm phù hợp nhất từ danh sách trên.
3. Khi giới thiệu bất kỳ sản phẩm nào có trong danh sách trên, bạn BẮT BUỘC phải viết kèm chính xác mã sản phẩm đó ở dạng [ID: <mã sản phẩm>] ngay sau tên sản phẩm để hệ thống tự động hiển thị thẻ sản phẩm tương tác cho khách hàng.
   Ví dụ: "Tôi khuyên bạn nên chọn Bút bi Thiên Long TL-027 [ID: 6d5e1b10-...] để viết trơn tru hơn" hoặc "Bạn có thể tham khảo Giấy in Double A A4 70gsm [ID: ...]".
4. Bạn chỉ được tư vấn và cung cấp mã ID của các sản phẩm có thực sự trong danh sách trên. Không bao giờ tự bịa ra mã ID hoặc tự bịa ra sản phẩm khác.
5. Nếu khách hàng hỏi về các sản phẩm cửa hàng không bán (không có trong danh sách trên), hãy lịch sự nói rằng cửa hàng hiện chưa có mặt hàng này và gợi ý họ tham khảo các sản phẩm tương tự có sẵn (nếu có).
6. Khuyên khách hàng thêm sản phẩm vào giỏ hàng hoặc xem chi tiết sản phẩm nếu họ thấy ưng ý.
7. Giải thích rõ vì sao sản phẩm đó phù hợp với nhu cầu của họ (ví dụ: định lượng giấy, tính năng máy tính, công dụng bìa còng).
`;

  // Định dạng lại lịch sử chat theo định dạng của Gemini API (đảm bảo luân phiên user và model)
  const contents = [];
  for (const msg of history) {
    const role = msg.sender === 'user' ? 'user' : 'model';
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += '\n' + msg.message;
    } else {
      contents.push({
        role,
        parts: [{ text: msg.message }]
      });
    }
  }

  // 6. Gọi Gemini API
  let aiResponseText = '';
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai.service] Gemini API Error Response:', errorText);
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const resJson = await response.json();
    aiResponseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponseText) {
      throw new Error('Gemini API returned empty text');
    }
  } catch (err) {
    console.error('[ai.service] Lỗi gọi Gemini API:', err.message);
    throw new AppError('Hệ thống AI đang bận hoặc gặp sự cố kết nối. Vui lòng thử lại sau ít phút.', 500);
  }

  // 7. Lưu phản hồi của AI vào cơ sở dữ liệu
  const { error: saveAiMsgError } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      session_id: activeSessionId,
      sender: 'ai',
      message: aiResponseText,
    });

  if (saveAiMsgError) {
    console.error('[ai.service] Lỗi lưu phản hồi AI:', saveAiMsgError.message);
  }

  // Cập nhật updated_at của phiên chat để đẩy lên trên đầu danh sách lịch sử
  await supabaseAdmin
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', activeSessionId);

  // 8. Trích xuất mã sản phẩm (UUID) từ câu trả lời của AI để gửi kèm thông tin chi tiết sản phẩm cho frontend
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig;
  const matchedIds = aiResponseText.match(uuidRegex) || [];
  const uniqueRecommendedIds = [...new Set(matchedIds)];

  let recommendedProducts = [];
  if (uniqueRecommendedIds.length > 0) {
    const { data: dbProducts, error: fetchRecError } = await supabaseAdmin
      .from('products')
      .select('*')
      .in('id', uniqueRecommendedIds)
      .eq('is_active', true);

    if (!fetchRecError && dbProducts) {
      recommendedProducts = dbProducts.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: Number(p.price),
        stock: p.stock,
        categoryId: p.category_id,
        image: p.image_url || '',
        isActive: p.is_active,
      }));
    }
  }

  return {
    response: aiResponseText,
    sessionId: activeSessionId,
    sessionTitle,
    recommendedProducts,
  };
}

/**
 * Lấy danh sách các phiên trò chuyện của người dùng/guest
 * 
 * @param {string|null} userId 
 * @param {string|null} guestSessionId 
 */
export async function getSessions(userId, guestSessionId) {
  let dbQuery = supabaseAdmin
    .from('chat_sessions')
    .select('*')
    .order('updated_at', { ascending: false });

  if (userId) {
    dbQuery = dbQuery.eq('user_id', userId);
  } else {
    dbQuery = dbQuery.eq('guest_session_id', guestSessionId).is('user_id', null);
  }

  const { data: sessions, error } = await dbQuery;

  if (error) {
    console.error('[ai.service] Lỗi lấy danh sách phiên chat:', error.message);
    throw new AppError('Không thể lấy danh sách cuộc hội thoại.', 500);
  }

  return sessions.map(s => ({
    id: s.id,
    title: s.title,
    userId: s.user_id,
    guestSessionId: s.guest_session_id,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));
}

/**
 * Lấy tất cả tin nhắn trong một phiên trò chuyện (sau khi đã check quyền)
 * 
 * @param {string|null} userId 
 * @param {string|null} guestSessionId 
 * @param {string} sessionId 
 */
export async function getSessionMessages(userId, guestSessionId, sessionId) {
  // 1. Xác minh quyền sở hữu
  const { data: session, error: checkError } = await supabaseAdmin
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (checkError) {
    console.error('[ai.service] Lỗi tìm phiên chat:', checkError.message);
    throw new AppError('Lỗi kiểm tra phiên trò chuyện.', 500);
  }

  if (!session) {
    throw new AppError('Phiên trò chuyện không tồn tại.', 404);
  }

  if (userId) {
    if (session.user_id !== userId) {
      throw new AppError('Bạn không có quyền truy cập cuộc trò chuyện này.', 403);
    }
  } else {
    if (session.guest_session_id !== guestSessionId || session.user_id !== null) {
      throw new AppError('Bạn không có quyền truy cập cuộc trò chuyện này.', 403);
    }
  }

  // 2. Lấy tin nhắn
  const { data: messages, error: msgsError } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (msgsError) {
    console.error('[ai.service] Lỗi lấy tin nhắn:', msgsError.message);
    throw new AppError('Không thể tải lịch sử tin nhắn.', 500);
  }

  return messages.map(m => ({
    id: m.id,
    sessionId: m.session_id,
    sender: m.sender,
    message: m.message,
    createdAt: m.created_at,
  }));
}

/**
 * Xóa một phiên trò chuyện (và cascade xóa toàn bộ tin nhắn bên trong)
 * 
 * @param {string|null} userId 
 * @param {string|null} guestSessionId 
 * @param {string} sessionId 
 */
export async function deleteSession(userId, guestSessionId, sessionId) {
  // 1. Xác minh quyền sở hữu
  const { data: session, error: checkError } = await supabaseAdmin
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (checkError) {
    console.error('[ai.service] Lỗi tìm phiên chat trước khi xóa:', checkError.message);
    throw new AppError('Lỗi kiểm tra phiên trò chuyện.', 500);
  }

  if (!session) {
    throw new AppError('Phiên trò chuyện không tồn tại.', 404);
  }

  if (userId) {
    if (session.user_id !== userId) {
      throw new AppError('Bạn không có quyền xóa cuộc trò chuyện này.', 403);
    }
  } else {
    if (session.guest_session_id !== guestSessionId || session.user_id !== null) {
      throw new AppError('Bạn không có quyền xóa cuộc trò chuyện này.', 403);
    }
  }

  // 2. Tiến hành xóa
  const { error: deleteError } = await supabaseAdmin
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (deleteError) {
    console.error('[ai.service] Lỗi xóa phiên chat:', deleteError.message);
    throw new AppError('Không thể xóa cuộc trò chuyện.', 500);
  }

  return true;
}

/**
 * Tìm kiếm sản phẩm bằng ngôn ngữ tự nhiên thông qua AI
 * 
 * @param {string} query - Câu lệnh tìm kiếm bằng tiếng Việt tự nhiên
 */
export async function searchProductsWithAI(query) {
  if (!query || query.trim() === '') {
    throw new AppError('Từ khóa tìm kiếm không được để trống.', 400);
  }

  // 1. Lấy các sản phẩm liên quan dựa trên từ khóa từ câu lệnh tìm kiếm (tối đa 20 sản phẩm ứng viên)
  const keywords = extractKeywords(query);

  let productsQuery = supabaseAdmin
    .from('products')
    .select('id, name, description, price, stock, categories(name)')
    .eq('is_active', true);

  if (keywords.length > 0) {
    const orConditions = keywords.flatMap(kw => [
      `name.ilike.%${kw}%`,
      `description.ilike.%${kw}%`
    ]).join(',');
    productsQuery = productsQuery.or(orConditions);
  }

  const { data: products, error: productsError } = await productsQuery.limit(20);

  if (productsError) {
    console.error('[ai.service] Lỗi lấy sản phẩm làm ngữ cảnh tìm kiếm:', productsError.message);
    throw new AppError('Lỗi tải dữ liệu sản phẩm.', 500);
  }

  // Nếu không tìm thấy ứng viên nào phù hợp, trả về mảng rỗng ngay lập tức (tiết kiệm token và thời gian gọi Gemini)
  if (!products || products.length === 0) {
    return [];
  }

  // Định dạng rút gọn tối ưu hóa số lượng token gửi đi
  const productsContext = products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    price: Number(p.price),
    category: p.categories?.name || 'Khác',
  }));

  // 2. Chuẩn bị Prompt hướng dẫn AI tìm kiếm ngữ nghĩa
  const systemInstruction = `Bạn là một công cụ tìm kiếm sản phẩm thông minh (Semantic Search) cho cửa hàng văn phòng phẩm.
Nhiệm vụ của bạn là đọc yêu cầu tìm kiếm bằng ngôn ngữ tự nhiên của khách hàng, đối chiếu phân tích ngữ nghĩa và chọn ra các sản phẩm phù hợp nhất trong danh sách cửa hàng dưới đây.

Danh sách sản phẩm cửa hàng:
${JSON.stringify(productsContext)}

Quy tắc tìm kiếm và định dạng phản hồi:
1. Phân tích kỹ yêu cầu của khách hàng (ví dụ: tìm giấy dày, bút bi viết trơn, máy tính cho học sinh cấp 3, sổ bìa da lò xo...).
2. Chỉ trả về một JSON Array chứa danh sách các chuỗi ID sản phẩm phù hợp nhất, sắp xếp theo mức độ phù hợp giảm dần.
   Ví dụ: ["6d5e1b10-...", "983991ce-..."]
3. Nếu không tìm thấy sản phẩm nào phù hợp trong danh sách, hãy trả về mảng rỗng: []
4. Tuyệt đối KHÔNG viết thêm bất kỳ từ ngữ giải thích nào khác, không dùng định dạng markdown block \`\`\`json ... \`\`\`. Chỉ trả về chuỗi JSON thô chứa mảng các ID.
`;

  // 3. Gọi Gemini API
  let matchedIds = [];
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `Tìm kiếm các sản phẩm phù hợp với yêu cầu: "${query.trim()}"` }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.1, // hạ nhiệt độ tối đa để tránh sáng tạo lệch ID
          responseMimeType: "application/json" // Yêu cầu Gemini trả về JSON chuẩn
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai.service] Lỗi gọi Gemini API (Tìm kiếm):', errorText);
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const resJson = await response.json();
    const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (aiText) {
      try {
        // Parse mảng ID từ phản hồi của AI
        const parsed = JSON.parse(aiText.trim());
        if (Array.isArray(parsed)) {
          // Lọc các UUID hợp lệ để tránh lỗi cú pháp Supabase/PostgreSQL (lỗi 500)
          matchedIds = parsed.filter(id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
        }
      } catch (parseErr) {
        // Fallback: sử dụng regex để trích xuất UUID nếu AI vi phạm định dạng JSON
        console.warn('[ai.service] Lỗi parse JSON tìm kiếm, chạy regex fallback:', parseErr.message);
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig;
        matchedIds = aiText.match(uuidRegex) || [];
      }
    }
  } catch (err) {
    console.error('[ai.service] Lỗi kết nối AI khi tìm kiếm:', err.message);
    throw new AppError('Hệ thống tìm kiếm thông minh đang bận. Vui lòng thử lại sau.', 500);
  }

  // 4. Truy vấn thông tin chi tiết của các sản phẩm được tìm thấy
  let matchedProducts = [];
  if (matchedIds.length > 0) {
    const { data: dbProducts, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('*')
      .in('id', matchedIds)
      .eq('is_active', true);

    if (!fetchError && dbProducts) {
      // Sắp xếp các sản phẩm đúng thứ tự độ phù hợp do AI trả về
      matchedProducts = dbProducts
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          stock: p.stock,
          categoryId: p.category_id,
          image: p.image_url || '',
          isActive: p.is_active,
        }))
        .sort((a, b) => matchedIds.indexOf(a.id) - matchedIds.indexOf(b.id));
    }
  }

  return matchedProducts;
}

