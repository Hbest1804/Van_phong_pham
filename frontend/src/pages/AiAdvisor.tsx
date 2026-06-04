import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  Send,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  Menu,
  X,
  MessageSquare,
  ShoppingCart,
  Info,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { formatCurrency, cn } from '../lib/utils';
import { aiApi, ChatSession, ChatMessage } from '../lib/api';
import { Product } from '../types';

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

export function AiAdvisor() {
  const { user } = useAuth();
  const { products: allStoreProducts } = useStore();
  const { addItem } = useCart();
  const navigate = useNavigate();

  // State quản lý phiên và tin nhắn
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);

  // Ref theo dõi session hiện tại để tránh race condition khi chuyển phiên chat
  const activeSessionIdRef = useRef<string | null>(activeSessionId);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // States UI
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Refs cuộn trang
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 1. Khởi tạo Guest Session ID nếu chưa đăng nhập
  useEffect(() => {
    let id = localStorage.getItem('guest_chat_session_id');
    if (!id) {
      id = generateUUID();
      localStorage.setItem('guest_chat_session_id', id);
    }
    setGuestSessionId(id);
  }, []);

  // 2. Tải danh sách các cuộc hội thoại khi thông tin auth hoặc guest session sẵn sàng
  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await aiApi.getSessions();
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách cuộc hội thoại:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (!user && !guestSessionId) return;
    loadSessions();
  }, [user, guestSessionId]);

  // 3. Tải tin nhắn của phiên chat khi click chọn phiên
  useEffect(() => {
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
        } else {
          // Reset phiên chat nếu gặp lỗi truy cập (ví dụ: phiên đã bị xóa hoặc không có quyền)
          setActiveSessionId(null);
          setMessages([]);
        }
      } catch (err) {
        console.error('Lỗi tải tin nhắn:', err);
        // Reset phiên chat nếu gặp lỗi truy cập (ví dụ: phiên đã bị xóa hoặc không có quyền)
        setActiveSessionId(null);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [activeSessionId]);

  // 4. Tự động cuộn xuống cuối mỗi khi có tin nhắn mới hoặc đang gửi tin (chỉ cuộn container chat, tránh nhảy trang)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isSending]);

  // 5. Trích xuất thẻ sản phẩm được giới thiệu dựa trên ID UUID trong văn bản
  const getRecommendedProducts = (text: string): Product[] => {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const matchedIds = text.match(uuidRegex) || [];
    const uniqueIds = [...new Set(matchedIds)];
    
    // Đối chiếu với danh sách sản phẩm trong StoreContext
    return allStoreProducts.filter(p => uniqueIds.includes(p.id) && p.isActive);
  };

  // 6. Xử lý gửi tin nhắn tư vấn
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    // Tạo tin nhắn tạm của user trên giao diện ngay lập tức
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

        // Nếu là phiên chat mới và người dùng chưa chuyển sang phiên khác, cập nhật ID phiên đang hoạt động và load lại sidebar
        const isNewSession = !activeSessionId;
        if (isNewSession && !activeSessionIdRef.current) {
          setActiveSessionId(aiResponse.sessionId);
          activeSessionIdRef.current = aiResponse.sessionId;
          loadSessions();
        }

        // Cập nhật tin nhắn phản hồi của AI lên giao diện nếu người dùng vẫn ở đúng phiên chat này
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

        // Cập nhật thời gian update của session trong danh sách sessions cục bộ
        setSessions(prev =>
          prev.map(s =>
            s.id === aiResponse.sessionId
              ? { ...s, updatedAt: new Date().toISOString() }
              : s
          )
        );
      } else {
        // Xử lý lỗi trả về từ API (ví dụ: 403 / 404)
        const errMsg = res.message || 'Lỗi hệ thống. Vui lòng thử lại sau.';
        const isAuthError = errMsg.includes('không có quyền') || errMsg.includes('không tồn tại');
        
        if (isAuthError) {
          setActiveSessionId(null);
          activeSessionIdRef.current = null;
        }

        const errorMsg: ChatMessage = {
          id: generateUUID(),
          sessionId: activeSessionId || '',
          sender: 'ai',
          message: errMsg + (isAuthError ? ' Phiên trò chuyện đã được tự động đặt lại. Vui lòng thử gửi lại tin nhắn.' : ''),
          createdAt: new Date().toISOString(),
        };
        
        if (activeSessionId === activeSessionIdRef.current) {
          setMessages(prev => [...prev, errorMsg]);
        }
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn đến AI:', err);
      // Hiển thị tin nhắn lỗi từ hệ thống nếu người dùng vẫn đang ở đúng phiên chat này
      if (activeSessionId === activeSessionIdRef.current) {
        const errorMsg: ChatMessage = {
          id: generateUUID(),
          sessionId: activeSessionId || '',
          sender: 'ai',
          message: 'Xin lỗi, hệ thống AI tư vấn đang gặp sự cố kết nối. Vui lòng gửi lại câu hỏi hoặc tải lại trang.',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Hỗ trợ gửi tin bằng phím Enter (hoặc Shift+Enter xuống dòng)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 7. Xóa phiên hội thoại
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa cuộc hội thoại này?')) return;

    try {
      const res = await aiApi.deleteSession(sessionId);
      if (res.success) {
        // Loại bỏ session khỏi danh sách cục bộ
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        // Nếu đang chọn đúng session bị xóa, reset state
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Lỗi xóa hội thoại:', err);
    }
  };

  // 8. Định dạng hiển thị văn bản tin nhắn của AI (hỗ trợ markdown cơ bản và chống XSS)
  const renderMessageText = (text: string) => {
    // 0. Mã hóa các ký tự HTML đặc biệt để chống tấn công XSS
    let safeText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // 1. Ẩn mã ID sản phẩm dạng [ID: uuid] trong câu trả lời AI để tránh rối mắt (vì đã có card sản phẩm bên dưới)
    let cleanText = safeText.replace(/\[ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi, '');

    // 2. Định dạng chữ đậm **text**
    cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');

    // 3. Tách dòng và xử lý list bullet
    const lines = cleanText.split('\n');
    const processedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return `<li class="ml-5 list-disc my-1 text-slate-700">${trimmed.substring(2)}</li>`;
      }
      return line;
    });

    return processedLines.join('<br />');
  };

  // Lọc các session theo ô tìm kiếm
  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative flex h-[calc(100vh-140px)] min-h-[500px] w-full overflow-hidden rounded-2xl bg-white/40 border border-indigo-50/50 shadow-xl backdrop-blur-xl">
      
      {/* ── SIDEBAR LỊCH SỬ CHAT ── */}
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-indigo-100/50 bg-white/90 backdrop-blur-lg transition-transform duration-300 md:relative md:translate-x-0",
          showMobileSidebar ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header Sidebar */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-indigo-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-1.5">
            <MessageSquare className="w-5 h-5 text-violet-600" />
            Lịch sử tư vấn
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden rounded-full p-1.5"
            onClick={() => setShowMobileSidebar(false)}
          >
            <X className="w-4 h-4 text-slate-500" />
          </Button>
        </div>

        {/* Nút tạo cuộc hội thoại mới */}
        <div className="p-3">
          <Button
            onClick={() => {
              setActiveSessionId(null);
              setMessages([]);
              setShowMobileSidebar(false);
            }}
            className="w-full justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Cuộc hội thoại mới
          </Button>
        </div>

        {/* Ô Tìm kiếm phiên hội thoại */}
        <div className="px-3 pb-2">
          <input
            type="text"
            placeholder="Tìm kiếm phiên chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-1.5 text-xs outline-none focus:border-violet-300 focus:bg-white transition-all"
          />
        </div>

        {/* Danh sách các session */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4 scrollbar-thin">
          {isLoadingSessions ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              <span className="text-xs text-slate-400">Đang tải lịch sử...</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              {searchQuery ? 'Không tìm thấy cuộc hội thoại nào.' : 'Chưa có cuộc hội thoại nào.'}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setShowMobileSidebar(false);
                }}
                className={cn(
                  "group relative flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition-all hover:bg-violet-50/50",
                  activeSessionId === session.id
                    ? "bg-violet-50 text-violet-700 font-medium"
                    : "text-slate-600"
                )}
              >
                <div className="flex-1 overflow-hidden pr-6">
                  <p className="truncate text-xs leading-normal">{session.title}</p>
                  <span className="text-[10px] text-slate-400">
                    {new Date(session.updatedAt).toLocaleDateString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                  title="Xóa phiên"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Sidebar */}
        <div className="p-3 border-t border-indigo-50/50 bg-slate-50/50 text-[11px] text-slate-400">
          {user ? (
            <p className="truncate">Thành viên: <strong className="text-slate-700">{user.name}</strong></p>
          ) : (
            <p className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Đang dùng phiên Khách</p>
          )}
        </div>
      </aside>

      {/* Backdrop cho Mobile Sidebar */}
      {showMobileSidebar && (
        <div
          className="absolute inset-0 z-20 bg-slate-900/20 backdrop-blur-xs md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* ── KHU VỰC CHAT CHÍNH ── */}
      <section className="flex flex-1 flex-col bg-slate-50/30">
        
        {/* Header Chat */}
        <header className="flex h-16 items-center justify-between px-4 border-b border-indigo-100/30 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden rounded-full p-2"
              onClick={() => setShowMobileSidebar(true)}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </Button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-violet-600 transition-colors group"
            >
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Quay lại
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shadow-inner">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800">
                  {activeSessionId 
                    ? sessions.find(s => s.id === activeSessionId)?.title || "Cuộc trò chuyện"
                    : "Trợ lý AI Tư Vấn"}
                </h1>
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Sẵn sàng hỗ trợ
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200/50">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            <span>Mẹo: Hãy hỏi về các sản phẩm bạn cần!</span>
          </div>
        </header>

        {/* Nội dung tin nhắn */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin bg-slate-50/20"
        >
          {messages.length === 0 && !isSending && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center max-w-lg mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600 shadow-md mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Tôi có thể giúp gì cho bạn?</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Tôi là Trợ lý AI được đào tạo để giúp bạn chọn mua các sản phẩm văn phòng phẩm phù hợp (bút bi, giấy in, sổ tay, máy tính...). Bạn có thể đặt câu hỏi như:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {[
                  "Tôi muốn tìm mua một cuốn sổ tay bìa da tốt",
                  "Double A A4 giá bao nhiêu và còn hàng không?",
                  "Tư vấn máy tính khoa học cho học sinh cấp 3",
                  "Văn phòng cần bút bi viết trơn, giới thiệu giúp tôi"
                ].map((suggest, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputValue(suggest);
                    }}
                    className="text-left px-4 py-3 rounded-xl border border-indigo-100 bg-white/70 hover:bg-violet-50/50 hover:border-violet-200 text-xs font-medium text-slate-700 transition-all hover:scale-[1.01]"
                  >
                    {suggest}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Đang tải lịch sử trò chuyện...</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isAi = msg.sender === 'ai';
              const recommendedProducts = isAi ? getRecommendedProducts(msg.message) : [];

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex w-full items-start gap-3",
                    isAi ? "justify-start" : "justify-end"
                  )}
                >
                  {isAi && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex flex-col max-w-[85%] sm:max-w-[75%] gap-2">
                    {/* Chat Bubble */}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed",
                        isAi
                          ? "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                          : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-none shadow-indigo-100"
                      )}
                    >
                      {isAi ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: renderMessageText(msg.message) }}
                          className="prose prose-sm prose-slate"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      )}
                    </div>

                    {/* Rich Recommended Products Grid */}
                    {isAi && recommendedProducts.length > 0 && (
                      <div className="mt-2 space-y-2.5">
                        <p className="text-xs font-bold text-violet-700 flex items-center gap-1.5 ml-1">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Sản phẩm được AI gợi ý riêng cho bạn:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {recommendedProducts.map((p) => (
                            <div
                              key={p.id}
                              className="group flex flex-col justify-between overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xs transition-all duration-300 hover:shadow-md hover:border-violet-200"
                            >
                              <div className="flex p-3 gap-3">
                                {/* Thumbnail */}
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-50 border border-slate-100">
                                  <img
                                    src={p.image || '/placeholder.png'}
                                    alt={p.name}
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="truncate text-xs font-bold text-slate-800 mb-0.5 group-hover:text-violet-600 transition-colors">
                                    {p.name}
                                  </h4>
                                  <p className="text-xs font-bold text-violet-600 mb-1">
                                    {formatCurrency(p.price)}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        p.stock > 0 ? "bg-emerald-500" : "bg-red-500"
                                      )}
                                    />
                                    <span className="text-[10px] text-slate-400">
                                      {p.stock > 0 ? `Còn hàng (Tồn: ${p.stock})` : 'Hết hàng'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {/* Actions footer */}
                              <div className="grid grid-cols-2 border-t border-slate-50 bg-slate-50/50">
                                <Link
                                  to={`/product/${p.id}`}
                                  className="py-1.5 text-center text-[10px] font-semibold text-slate-500 hover:text-violet-600 hover:bg-slate-100 transition-colors border-r border-slate-100"
                                >
                                  Chi tiết
                                </Link>
                                <button
                                  onClick={() => addItem(p)}
                                  disabled={p.stock === 0}
                                  className="py-1.5 text-center text-[10px] font-semibold text-violet-600 hover:text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                                >
                                  Thêm vào giỏ
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isAi && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 font-bold text-xs shadow-inner">
                      {user ? user.name[0].toUpperCase() : 'G'}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Hiệu ứng gõ chữ của AI (Typing indicator) */}
          {isSending && (
            <div className="flex w-full items-start gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="flex flex-col gap-2 max-w-[75%]">
                <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-white border border-slate-100 shadow-sm flex items-center gap-1.5 h-10">
                  <span className="h-2 w-2 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Ô Nhập nội dung chát gửi đi */}
        <footer className="p-4 bg-white/80 backdrop-blur-md border-t border-indigo-100/30">
          <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi AI tư vấn sản phẩm..."
                rows={1}
                disabled={isSending}
                className="w-full min-h-[44px] max-h-[120px] rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-sm outline-none resize-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50 transition-all shadow-xs"
                style={{ height: 'auto' }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isSending}
                className="absolute right-2.5 bottom-2.5 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:hover:scale-100"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
          <div className="text-[10px] text-slate-400 text-center mt-2">
            AI có thể tham khảo từ kho và gợi ý các sản phẩm văn phòng phẩm đang bán chạy. Thông tin mang tính chất tham khảo.
          </div>
        </footer>

      </section>
    </div>
  );
}
