import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { Link } from 'react-router-dom';
import {
  Send,
  Sparkles,
  X,
  ShoppingCart,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../../lib/utils';
import { aiApi, ChatMessage } from '../../lib/api';
import { Product } from '../../types';

// Helper tạo UUID ngẫu nhiên cho phiên khách
const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function FloatingAiChat() {
  const { user } = useAuth();
  const { products: allStoreProducts } = useStore();
  const { addItem } = useCart();

  // State đóng/mở khung chat
  const [isOpen, setIsOpen] = useState(false);

  // State hội thoại
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return sessionStorage.getItem('floating_chat_session_id');
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);

  // Ref theo dõi session hiện tại để tránh race condition
  const activeSessionIdRef = useRef<string | null>(activeSessionId);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 1. Khởi tạo Guest Session ID nếu chưa có
  useEffect(() => {
    let id = localStorage.getItem('guest_chat_session_id');
    if (!id) {
      id = generateUUID();
      localStorage.setItem('guest_chat_session_id', id);
    }
    setGuestSessionId(id);
  }, []);

  // 2. Lưu activeSessionId vào sessionStorage khi thay đổi
  useEffect(() => {
    if (activeSessionId) {
      sessionStorage.setItem('floating_chat_session_id', activeSessionId);
    } else {
      sessionStorage.removeItem('floating_chat_session_id');
    }
  }, [activeSessionId]);

  // 3. Tải tin nhắn khi mở khung chat hoặc đổi session
  useEffect(() => {
    if (!isOpen) return;
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const res = await aiApi.getSessionMessages(activeSessionId);
        if (res.success && res.data) {
          setMessages(res.data);
        }
      } catch (err) {
        console.error('Lỗi tải tin nhắn (Floating Chat):', err);
        // Reset phiên chat nếu gặp lỗi truy cập (ví dụ: phiên đã bị xóa hoặc không có quyền)
        setActiveSessionId(null);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [isOpen, activeSessionId]);

  // 4. Cuộn xuống cuối (chỉ cuộn container tin nhắn)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isSending]);

  // 5. Trích xuất sản phẩm gợi ý
  const getRecommendedProducts = (text: string): Product[] => {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const matchedIds = text.match(uuidRegex) || [];
    const uniqueIds = [...new Set(matchedIds)];
    return allStoreProducts.filter(p => uniqueIds.includes(p.id) && p.isActive);
  };

  // 6. Gửi tin nhắn
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    // Thêm tin nhắn user tạm thời
    const tempUserMsg: ChatMessage = {
      id: generateUUID(),
      sessionId: activeSessionId || '',
      sender: 'user',
      message: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await aiApi.chat(messageText, activeSessionId || undefined);
      if (res.success && res.data) {
        const aiResponse = res.data;

        const isNewSession = !activeSessionId;
        if (isNewSession && !activeSessionIdRef.current) {
          setActiveSessionId(aiResponse.sessionId);
          activeSessionIdRef.current = aiResponse.sessionId;
        }

        const tempAiMsg: ChatMessage = {
          id: generateUUID(),
          sessionId: aiResponse.sessionId,
          sender: 'ai',
          message: aiResponse.response,
          createdAt: new Date().toISOString(),
        };

        if (aiResponse.sessionId === activeSessionIdRef.current) {
          setMessages(prev => [...prev, tempAiMsg]);
        }
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn (Floating Chat):', err);
      if (activeSessionId === activeSessionIdRef.current) {
        const errorMsg: ChatMessage = {
          id: generateUUID(),
          sessionId: activeSessionId || '',
          sender: 'ai',
          message: 'Lỗi kết nối với AI. Vui lòng thử lại.',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 7. Render nội dung markdown đơn giản (chống XSS)
  const renderMessageText = (text: string) => {
    // 0. Mã hóa các ký tự HTML đặc biệt để chống tấn công XSS
    let safeText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    let cleanText = safeText.replace(/\[ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi, '');
    cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    const lines = cleanText.split('\n');
    const processedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return `<li class="ml-4 list-disc my-0.5 text-slate-700 text-xs">${trimmed.substring(2)}</li>`;
      }
      return line;
    });
    return processedLines.join('<br />');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* ── KHUNG CHAT MINI (TOGGLE) ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mb-4 flex w-[350px] sm:w-[370px] h-[480px] flex-col overflow-hidden rounded-2xl border border-indigo-50/50 bg-white/95 shadow-2xl backdrop-blur-md"
          >
            {/* Header Khung Chat */}
            <div className="flex h-14 items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold leading-normal">Trợ lý ảo VPP AI</h3>
                  <p className="text-[9px] text-emerald-300 font-medium flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-emerald-400 animate-ping" />
                    Đang trực tuyến
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thân Khung Chat (Tin nhắn) */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto bg-slate-50/50 p-3 space-y-4 scrollbar-none"
            >
              {messages.length === 0 && !isSending && (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-3 shadow-inner">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Tôi có thể giúp gì cho bạn?</h4>
                  <p className="text-[11px] text-slate-400 mb-4 max-w-[200px]">
                    Đặt câu hỏi để tìm kiếm các sản phẩm văn phòng phẩm phù hợp trong cửa hàng.
                  </p>
                  <div className="flex flex-col gap-1.5 w-full">
                    {[
                      "Tôi muốn mua bút viết trơn",
                      " Double A A4 giá thế nào?",
                      "Gợi ý sổ tay da và máy tính Deli"
                    ].map((suggest, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputValue(suggest)}
                        className="text-left text-[10px] px-3 py-2 border border-slate-100 bg-white hover:bg-violet-50/30 text-slate-600 rounded-lg transition-colors"
                      >
                        {suggest}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLoadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                  <span className="text-[10px] text-slate-400">Đang tải lịch sử...</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAi = msg.sender === 'ai';
                  const recommendedProducts = isAi ? getRecommendedProducts(msg.message) : [];

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex w-full items-start gap-2",
                        isAi ? "justify-start" : "justify-end"
                      )}
                    >
                      {isAi && (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      )}
                      
                      <div className="flex flex-col max-w-[80%] gap-1.5">
                        {/* Bubble */}
                        <div
                          className={cn(
                            "rounded-xl px-3 py-2 text-[11px] leading-relaxed shadow-xs",
                            isAi
                              ? "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                              : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-none"
                          )}
                        >
                          {isAi ? (
                            <div dangerouslySetInnerHTML={{ __html: renderMessageText(msg.message) }} />
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                          )}
                        </div>

                        {/* Compact Recommended Products list */}
                        {isAi && recommendedProducts.length > 0 && (
                          <div className="mt-1 space-y-1.5">
                            {recommendedProducts.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2 shadow-xs gap-2"
                              >
                                <img
                                  src={p.image || '/placeholder.png'}
                                  alt={p.name}
                                  className="h-10 w-10 shrink-0 object-cover rounded border border-slate-100"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-[10px] font-bold text-slate-700">{p.name}</p>
                                  <p className="text-[10px] font-semibold text-violet-600">{formatCurrency(p.price)}</p>
                                </div>
                                <button
                                  onClick={() => addItem(p)}
                                  disabled={p.stock === 0}
                                  className="rounded bg-violet-50 hover:bg-violet-100 text-violet-600 p-1.5 transition-colors disabled:opacity-50 disabled:bg-transparent"
                                  title="Thêm vào giỏ"
                                >
                                  <ShoppingCart className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isSending && (
                <div className="flex w-full items-start gap-2 justify-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="rounded-xl rounded-tl-none px-3 py-2 bg-white border border-slate-100 shadow-sm flex items-center gap-1 h-7">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Nhập liệu Khung Chat */}
            <form
              onSubmit={handleSendMessage}
              className="flex h-14 items-center gap-2 border-t border-indigo-50/50 bg-white px-3"
            >
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi AI..."
                rows={1}
                disabled={isSending}
                className="flex-1 rounded-xl border border-slate-100 bg-slate-50/50 py-2 px-3 text-xs outline-none resize-none max-h-9 focus:border-violet-400 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isSending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BONG BÓNG CHAT CHÍNH (GIỐNG ZALO) ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 shadow-xl border-2 border-white transition-transform hover:scale-105 active:scale-95"
      >
        <Sparkles className="w-6 h-6 text-white group-hover:animate-pulse" />
      </button>

    </div>
  );
}
