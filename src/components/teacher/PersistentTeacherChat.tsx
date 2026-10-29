import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  Send,
  Brain,
  Volume2,
  RefreshCw,
  XCircle,
  ChevronUp,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Conversation, PersistentChatMessage } from '../../types';
import {
  getAllConversations,
  getConversationById,
  createConversation,
  renameConversation,
  deleteConversation,
  getPaginatedMessages,
  addPersistentChatMessage,
  updatePersistentMessageStatus,
} from '../../services/persistentChatStorage';
import { getMemorySummaryForPrompt } from '../../services/learnerMemoryStorage';
import { LearnerMemoryModal } from './LearnerMemoryModal';
import { playbackController } from '../../services/audioEngine';

interface PersistentTeacherChatProps {
  initialLessonContext?: Conversation['lessonContext'];
}

export const PersistentTeacherChat: React.FC<PersistentTeacherChatProps> = ({
  initialLessonContext,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>(() => getAllConversations());
  const [activeConvId, setActiveConvId] = useState<string>(() => {
    const all = getAllConversations();
    if (all.length > 0) return all[0].id;
    const newC = createConversation('Asosiy Ustoz bilan suhbat', initialLessonContext);
    return newC.id;
  });

  const [messages, setMessages] = useState<PersistentChatMessage[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitleText, setNewTitleText] = useState('');
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  useEffect(() => {
    if (!activeConvId) return;
    loadMessages(activeConvId, 1);
  }, [activeConvId]);

  const loadMessages = (convId: string, pageNum: number) => {
    const res = getPaginatedMessages(convId, pageNum, 20);
    if (pageNum === 1) {
      setMessages(res.messages);
    } else {
      setMessages((prev) => [...res.messages, ...prev]);
    }
    setHasMore(res.hasMore);
    setPage(pageNum);

    if (pageNum === 1) {
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCreateNewConversation = () => {
    const newC = createConversation('Yangi suhbat', initialLessonContext);
    setConversations(getAllConversations());
    setActiveConvId(newC.id);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(id);
    const updated = getAllConversations();
    setConversations(updated);
    if (activeConvId === id) {
      if (updated.length > 0) {
        setActiveConvId(updated[0].id);
      } else {
        const fresh = createConversation('Asosiy Ustoz bilan suhbat', initialLessonContext);
        setConversations([fresh]);
        setActiveConvId(fresh.id);
      }
    }
  };

  const handleRenameConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleText.trim() || !activeConvId) return;
    renameConversation(activeConvId, newTitleText.trim());
    setConversations(getAllConversations());
    setIsEditingTitle(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText.trim();
    if (!text || isGenerating || !activeConvId) return;

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userMsg: PersistentChatMessage = {
      messageId: `msg_${Date.now()}_u`,
      conversationId: activeConvId,
      ownerId: 'usr_demo_01',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      status: 'sent',
      requestId,
    };

    addPersistentChatMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsGenerating(true);
    setTimeout(() => scrollToBottom(), 50);

    const controller = new AbortController();
    setAbortController(controller);

    // Placeholder AI message
    const aiMsgId = `msg_${Date.now()}_ai`;
    const aiPlaceholder: PersistentChatMessage = {
      messageId: aiMsgId,
      conversationId: activeConvId,
      ownerId: 'usr_demo_01',
      role: 'assistant',
      content: 'Javob tayyorlanmoqda...',
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, aiPlaceholder]);

    try {
      const memorySummary = getMemorySummaryForPrompt();
      const recentForContext = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat/persistent-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConvId,
          userMessage: text,
          recentMessages: recentForContext,
          learnerMemorySummary: memorySummary,
          lessonContext: activeConv?.lessonContext,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (data.success && data.data) {
        const finalAiMsg: PersistentChatMessage = {
          messageId: aiMsgId,
          conversationId: activeConvId,
          ownerId: 'usr_demo_01',
          role: 'assistant',
          content: data.data.teacherResponseUz,
          createdAt: new Date().toISOString(),
          status: 'sent',
          explanationMethodUsed: data.data.explanationMethodUsed,
          action: data.data.action,
        };
        addPersistentChatMessage(finalAiMsg);
        setMessages((prev) =>
          prev.map((m) => (m.messageId === aiMsgId ? finalAiMsg : m))
        );
      } else {
        throw new Error(data.error || 'Ustoz javob qaytarishda xatolik yuz berdi.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        updatePersistentMessageStatus(activeConvId, aiMsgId, 'error', 'Suhbat bekor qilindi.');
      } else {
        updatePersistentMessageStatus(
          activeConvId,
          aiMsgId,
          'error',
          `Xatolik: ${err.message || 'Server bilan bog‘lanib bo‘lmadi'}`
        );
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === aiMsgId ? { ...m, status: 'error', content: 'Javob olishda xatolik. Qayta urinib ko‘ring.' } : m
        )
      );
    } finally {
      setIsGenerating(false);
      setAbortController(null);
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const handleCancelGeneration = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleSpeakText = (text: string) => {
    playbackController.playTeacherVoice(text);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[500px] w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Sidebar - Conversation List */}
      <div className="w-72 bg-slate-50 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <button
            onClick={handleCreateNewConversation}
            className="w-full py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Yangi Suhbat
          </button>
          <button
            onClick={() => setIsMemoryModalOpen(true)}
            className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Brain className="w-4 h-4 text-teal-600 dark:text-teal-400" /> O‘quvchi Xotirasi
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveConvId(c.id)}
              className={`p-3 rounded-xl cursor-pointer transition-colors flex items-center justify-between group ${
                c.id === activeConvId
                  ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-900 dark:text-teal-200 border border-teal-200 dark:border-teal-800/50'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <MessageSquare className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
                <div className="overflow-hidden">
                  <span className="text-xs font-medium block truncate">{c.title}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                    {c.lastMessageSnippet || 'Xabarlar yo‘q'}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteConversation(c.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-opacity"
                title="Suhbatni o‘chirish"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              {isEditingTitle ? (
                <form onSubmit={handleRenameConversation} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTitleText}
                    onChange={(e) => setNewTitleText(e.target.value)}
                    className="px-2 py-1 text-xs border rounded-lg dark:bg-slate-800 dark:text-white"
                    autoFocus
                  />
                  <button type="submit" className="text-xs text-teal-600 font-medium">
                    Saqlash
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeConv?.title}
                  </h3>
                  <button
                    onClick={() => {
                      setNewTitleText(activeConv?.title || '');
                      setIsEditingTitle(true);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {activeConv?.lessonContext?.topicTitle && (
                <span className="text-[11px] text-teal-600 dark:text-teal-400 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {activeConv.lessonContext.topicTitle}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {hasMore && (
            <div className="text-center py-2">
              <button
                onClick={() => loadMessages(activeConvId, page + 1)}
                className="px-3 py-1.5 text-xs text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50 flex items-center gap-1 mx-auto"
              >
                <ChevronUp className="w-3.5 h-3.5" /> Oldingi xabarlarni yuklash
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-teal-500 opacity-50" />
              <p className="text-sm font-medium">Ustoz bilan muloqotni boshlang</p>
              <p className="text-xs">Savolingizni yoki tushunmagan grammatik qoidangizni yozing.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.messageId}
                className={`flex gap-3 max-w-2xl ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-teal-600 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Explanation method badge */}
                  {msg.explanationMethodUsed && (
                    <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 rounded-md">
                      Usul: {msg.explanationMethodUsed}
                    </span>
                  )}

                  {/* Message Footer Controls */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] opacity-80">
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                    {msg.role === 'assistant' && msg.status === 'sent' && (
                      <button
                        onClick={() => handleSpeakText(msg.content)}
                        className="p-1 hover:text-teal-600 dark:hover:text-teal-300 rounded"
                        title="Ovozlidirib eshitish"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {msg.status === 'error' && (
                      <button
                        onClick={() => handleSendMessage(messages[messages.length - 2]?.content)}
                        className="flex items-center gap-1 text-red-500 font-medium"
                      >
                        <RefreshCw className="w-3 h-3" /> Qayta urinish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ustozga savol bering (masalan: 'does bilan -s qoidasini tushunmadim')..."
              disabled={isGenerating}
              className="flex-1 p-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            />

            {isGenerating ? (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center transition-colors"
                title="Javobni bekor qilish"
              >
                <XCircle className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Learner Memory Modal */}
      <LearnerMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
      />
    </div>
  );
};
