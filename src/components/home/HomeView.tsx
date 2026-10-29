import React, { useMemo } from 'react';
import { NavRoute } from '../layout/Sidebar';
import { DailyPlanView } from '../dashboard/DailyPlanView';
import {
  UserProfile,
  UserSettings,
} from '../../types';
import {
  getCollections,
  getSections,
  getReadingDocuments,
  getAllAttempts,
  getReviewStates,
  getAllEntries,
} from '../../services/storage';
import { buildDailyReviewQueue } from '../../services/scheduler';
import {
  BookOpen,
  Repeat,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Play,
  CheckCircle2,
  Headphones,
  Compass,
  PenTool,
  Bot,
} from 'lucide-react';

interface HomeViewProps {
  profile: UserProfile;
  settings: UserSettings;
  onNavigate: (route: NavRoute) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ profile, settings, onNavigate }) => {
  const collections = getCollections();
  const documents = getReadingDocuments();
  const reviewStates = getReviewStates();
  const entries = getAllEntries();
  const attempts = getAllAttempts();

  // Spaced repetition queue
  const dailyQueue = useMemo(() => {
    return buildDailyReviewQueue(entries, reviewStates);
  }, [entries, reviewStates]);

  // Last opened document
  const latestDoc = documents[0] || null;

  // Active today attempts
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayAttempts = attempts.filter((a) => a.createdAt.startsWith(todayDateStr));
  const todayUniqueWords = new Set(todayAttempts.map((a) => a.entryId)).size;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. DAILY STUDY PLAN DASHBOARD */}
      <DailyPlanView settings={settings} onNavigate={onNavigate} />

      {/* 2. CORE ACTION BLOCKS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* BLOCK: SO'ZLARNI O'RGANISH */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-base text-gray-900">
                  So'zlarni O'rganish
                </h3>
              </div>
              <span className="text-xs font-semibold text-gray-400">
                {collections.length} ta to'plam
              </span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              O'z so'zlaringizni kiriting, AI Teacher bilan o'zbekcha tarjimasi va misollarini tayyorlang hamda 40 talik bo'limlarda o'rganing.
            </p>

            {collections.length > 0 ? (
              <div className="p-3 bg-[#FAF9F5] border border-gray-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  Mavjud to'plam:
                </span>
                <p className="text-xs font-bold text-gray-900">{collections[0].title}</p>
                <p className="text-[11px] text-gray-500">{collections[0].entryCount} ta so'z mavjud</p>
              </div>
            ) : (
              <div className="p-3 bg-[#FAF9F5] border border-dashed border-gray-300 rounded-xl text-xs text-gray-500">
                Hozircha to'plamlar yo'q. Yangi so'zlar kiritish orqali boshlang.
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('vocabulary')}
              className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>So'z Yodlashga O'tish</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BLOCK: OXIRGI O'QILGAN MATN */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-base text-gray-900">
                  Kitob va Matn Mutolaasi
                </h3>
              </div>
              {latestDoc && (
                <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                  CEFR {latestDoc.estimatedLevel || 'A2'}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Matndagi istalgan so'zni bosib kontekstual tarjimasini ko'rish va yodlashga saqlash imkoniyati.
            </p>

            {latestDoc ? (
              <div className="p-3 bg-[#FAF9F5] border border-gray-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  Tavsiya etilgan hikoya:
                </span>
                <p className="text-xs font-bold text-gray-900">{latestDoc.title}</p>
                <p className="text-[11px] text-gray-500">{latestDoc.wordCount} ta so'z</p>
              </div>
            ) : (
              <div className="p-3 bg-[#FAF9F5] border border-dashed border-gray-300 rounded-xl text-xs text-gray-500">
                Matnlar kutubxonasi bo'sh. Birinchi matnni yuklang.
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('reader')}
              className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Mutolaani Boshlash</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. UPCOMING MODULES INFORMATIVE CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-base text-gray-900">
            Kelgusi Bosqich Bo'limlari
          </h3>
          <span className="text-xs text-gray-400">Bosqichma-bosqich qo'shilmoqda</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Listening */}
          <div
            onClick={() => onNavigate('listening')}
            className="p-4 rounded-xl bg-white border border-[#E5E2D9] space-y-1.5 hover:border-teal-700 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <Headphones className="w-5 h-5 text-teal-800" />
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.2 rounded">
                Faol
              </span>
            </div>
            <h4 className="font-bold text-gray-900">Listening Hub</h4>
            <p className="text-gray-500 text-[11px]">Audio yuklash, A–B takrorlash va diktant.</p>
          </div>

          {/* Grammar */}
          <div
            onClick={() => onNavigate('grammar')}
            className="p-4 rounded-xl bg-white border border-[#E5E2D9] space-y-1.5 hover:border-teal-700 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <Compass className="w-5 h-5 text-teal-800" />
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.2 rounded">
                Faol
              </span>
            </div>
            <h4 className="font-bold text-gray-900">Grammatika Kitoblari</h4>
            <p className="text-gray-500 text-[11px]">PDF darslik, sahifali izoh va AI Teacher.</p>
          </div>

          {/* Writing */}
          <div
            onClick={() => onNavigate('writing')}
            className="p-4 rounded-xl bg-white border border-[#E5E2D9] space-y-1.5 hover:border-teal-700 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <PenTool className="w-5 h-5 text-teal-800" />
              <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-1.5 py-0.2 rounded">
                9-bosqich
              </span>
            </div>
            <h4 className="font-bold text-gray-900">Daily Writing</h4>
            <p className="text-gray-500 text-[11px]">O'tilgan so'zlar bilan kundalik insho yozish.</p>
          </div>

          {/* Teacher */}
          <div
            onClick={() => onNavigate('teacher')}
            className="p-4 rounded-xl bg-white border border-[#E5E2D9] space-y-1.5 hover:border-teal-700 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <Bot className="w-5 h-5 text-teal-800" />
              <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-1.5 py-0.2 rounded">
                10-bosqich
              </span>
            </div>
            <h4 className="font-bold text-gray-900">AI Avatar Teacher</h4>
            <p className="text-gray-500 text-[11px]">Jonli o'qituvchi bilan interaktiv darslar.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
