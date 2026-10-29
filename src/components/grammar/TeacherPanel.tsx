import React, { useState } from 'react';
import { BookPage, GrammarBook } from '../../types';
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  X,
} from 'lucide-react';

interface TeacherPanelProps {
  book: GrammarBook;
  currentPage: BookPage;
  onClose?: () => void;
}

interface TeacherResponse {
  keyRuleUz: string;
  explanationUz: string;
  examples: { en: string; uz: string }[];
  checkQuestion?: string;
}

export const TeacherPanel: React.FC<TeacherPanelProps> = ({
  book,
  currentPage,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [response, setResponse] = useState<TeacherResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAskTeacher = async (promptType: any, customQuestion?: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/grammar/teacher-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: book.title,
          printedPageLabel: currentPage.printedPageLabel,
          pageText: currentPage.extractedText || "Sahifa matni kiritilmagan",
          promptType,
          userQuestion: customQuestion || userQuery,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "AI Teacher javob berishda xatolik yuz berdi.");
      }

      const json = await res.json();
      if (json.data) {
        setResponse(json.data);
      }
    } catch (err: any) {
      console.error('Teacher panel error', err);
      setError(err.message || 'Xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || loading) return;
    handleAskTeacher('explain_sentence', userQuery.trim());
    setUserQuery('');
  };

  return (
    <div className="bg-[#FAF9F5] border border-[#E5E2D9] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-gray-900">
              AI Teacher Yordamchisi
            </h3>
            <span className="text-[11px] text-teal-800 font-medium">
              PDF: {currentPage.pdfPageIndex}-sahifa / Kitob: {currentPage.printedPageLabel}
            </span>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Tezkor Savollar:
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleAskTeacher('explain_page')}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-800 hover:border-teal-700 hover:bg-teal-50 cursor-pointer disabled:opacity-50"
          >
            📖 Shu sahifani tushuntir
          </button>
          <button
            type="button"
            onClick={() => handleAskTeacher('simplify_rule')}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-800 hover:border-teal-700 hover:bg-teal-50 cursor-pointer disabled:opacity-50"
          >
            💡 Qoidani soddaroq ayt
          </button>
          <button
            type="button"
            onClick={() => handleAskTeacher('give_examples')}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-800 hover:border-teal-700 hover:bg-teal-50 cursor-pointer disabled:opacity-50"
          >
            ✨ Yana misollar ber
          </button>
          <button
            type="button"
            onClick={() => handleAskTeacher('ask_quiz')}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-800 hover:border-teal-700 hover:bg-teal-50 cursor-pointer disabled:opacity-50"
          >
            ❓ Menga savol ber
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-8 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-teal-800 mx-auto" />
          <p className="text-xs text-gray-500">AI Teacher sahifani tahlil qilmoqda...</p>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Response Box */}
      {!loading && response && (
        <div className="p-4 rounded-xl bg-white border border-[#E5E2D9] space-y-3.5 text-xs text-gray-800 animate-in fade-in duration-200">
          {/* Key Rule */}
          <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-100 space-y-1">
            <span className="font-bold text-[11px] text-teal-900 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Asosiy Qoida:
            </span>
            <p className="font-semibold text-gray-900">{response.keyRuleUz}</p>
          </div>

          {/* Explanation */}
          <div className="space-y-1">
            <span className="font-bold text-[11px] text-gray-600 uppercase tracking-wider">
              Tushuntirish:
            </span>
            <p className="leading-relaxed text-gray-800">{response.explanationUz}</p>
          </div>

          {/* Examples */}
          {response.examples && response.examples.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="font-bold text-[11px] text-gray-600 uppercase tracking-wider">
                Misollar:
              </span>
              <div className="space-y-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-serif">
                {response.examples.map((ex, i) => (
                  <div key={i} className="text-xs">
                    <p className="font-medium text-gray-900">"{ex.en}"</p>
                    <p className="text-gray-500 font-sans text-[11px]">"{ex.uz}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checking Quiz Question */}
          {response.checkQuestion && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
              <span className="font-bold text-[11px] text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" /> Tekshiruvchi Savol:
              </span>
              <p className="text-amber-950 font-medium">{response.checkQuestion}</p>
            </div>
          )}
        </div>
      )}

      {/* Custom Question Form */}
      <form onSubmit={handleSendCustom} className="pt-2 border-t border-[#E5E2D9]">
        <div className="flex gap-2">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Istalgan gap yoki qoidani so‘rang..."
            className="flex-1 px-3 py-2 bg-white border border-[#D5D1C6] rounded-xl text-xs text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
          />
          <button
            type="submit"
            disabled={!userQuery.trim() || loading}
            className="p-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl cursor-pointer disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
