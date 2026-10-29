import React, { useState, useEffect } from 'react';
import { DailyStudyPlan, StudyPlanItem, UserSettings } from '../../types';
import { generateDailyStudyPlan } from '../../services/studyPlanStorage';
import { getTodayStudyStats } from '../../services/activityLogger';
import { saveUserSettings } from '../../services/storage';
import { NavRoute } from '../layout/Sidebar';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Flame,
  ArrowRight,
  Target,
  Repeat,
  BookOpen,
  Headphones,
  Compass,
  PenTool,
  Bot,
  Layers,
} from 'lucide-react';

interface DailyPlanViewProps {
  settings: UserSettings;
  onNavigate: (route: NavRoute, payload?: Record<string, any>) => void;
  onUpdateSettings?: (settings: UserSettings) => void;
}

export const DailyPlanView: React.FC<DailyPlanViewProps> = ({
  settings,
  onNavigate,
  onUpdateSettings,
}) => {
  const [plan, setPlan] = useState<DailyStudyPlan>(() => generateDailyStudyPlan());
  const [stats, setStats] = useState(() => getTodayStudyStats());

  useEffect(() => {
    setPlan(generateDailyStudyPlan());
    setStats(getTodayStudyStats());
  }, []);

  const handleTimeBudgetChange = (minutes: 10 | 20 | 30 | 45) => {
    const updatedSettings = { ...settings, dailyStudyMinutes: minutes };
    saveUserSettings(updatedSettings);
    if (onUpdateSettings) onUpdateSettings(updatedSettings);

    // Regenerate plan with new time budget
    const updatedPlan = generateDailyStudyPlan();
    setPlan(updatedPlan);
  };

  const getItemIcon = (type: StudyPlanItem['type']) => {
    switch (type) {
      case 'vocab_review':
        return <Repeat className="w-5 h-5 text-amber-400" />;
      case 'vocab_new':
        return <BookOpen className="w-5 h-5 text-emerald-400" />;
      case 'teacher_lesson':
        return <Bot className="w-5 h-5 text-indigo-400" />;
      case 'listening_exercise':
        return <Headphones className="w-5 h-5 text-sky-400" />;
      case 'grammar_practice':
        return <Compass className="w-5 h-5 text-purple-400" />;
      case 'writing_task':
      case 'writing_revision':
        return <PenTool className="w-5 h-5 text-rose-400" />;
      case 'reading_session':
      default:
        return <Layers className="w-5 h-5 text-teal-400" />;
    }
  };

  const handleItemAction = (item: StudyPlanItem) => {
    let route: NavRoute = 'home';
    switch (item.targetModule) {
      case 'vocabulary':
        route = item.type === 'vocab_review' ? 'spaced-repetition' : 'vocabulary';
        break;
      case 'reader':
        route = 'reader';
        break;
      case 'grammar':
        route = 'grammar';
        break;
      case 'writing':
        route = 'writing';
        break;
      case 'teacher':
        route = 'teacher';
        break;
    }
    onNavigate(route, item.deepLinkPayload);
  };

  const progressPercent = Math.min(
    100,
    Math.round((plan.completedMinutes / Math.max(1, plan.totalEstimatedMinutes)) * 100)
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-xl space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Kunlik Shaxsiy Reja
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
              <Flame className="w-3.5 h-3.5 fill-amber-400" /> {stats.currentStreakDays} kun ketma-ket
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-white">
            Bugungi Ta’lim Maqsadingiz
          </h2>
          <p className="text-xs text-slate-400">
            {plan.dateStr} holatiga ko‘ra moslashtirilgan deterministik mashqlar ketma-ketligi
          </p>
        </div>

        {/* Time Budget Selector */}
        <div className="flex flex-col items-start md:items-end gap-1.5">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" /> Kunlik Vaqt Ajratish (daqiqa):
          </span>
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {([10, 20, 30, 45] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleTimeBudgetChange(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                  settings.dailyStudyMinutes === m
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Bar & Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs">
        <div>
          <span className="text-slate-400 block mb-1">Dars Vaqti Bajarilishi:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-indigo-300">{plan.completedMinutes}</span>
            <span className="text-slate-500">/ {plan.totalEstimatedMinutes} daqiqa</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div>
          <span className="text-slate-400 block mb-1">Topshiriqlar Bajarilishi:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-400">
              {plan.items.filter((i) => i.isCompleted).length}
            </span>
            <span className="text-slate-500">/ {plan.items.length} ta topshiriq</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {plan.isAllCompleted ? '🎉 Barcha topshiriqlar bajarildi!' : 'Mashqlarni davom ettiring'}
          </p>
        </div>

        <div>
          <span className="text-slate-400 block mb-1">Bugungi Mashqlar Sayi:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-amber-400">{stats.todayEventsCount}</span>
            <span className="text-slate-500">ta faoliyat</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Avtomatik dalil bilan tasdiqlangan</p>
        </div>
      </div>

      {/* Actionable Study Plan Items List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-4 h-4 text-indigo-400" /> Rejalashtirilgan Bosqichlar
        </h3>

        <div className="space-y-2.5">
          {plan.items.map((item, idx) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                item.isCompleted
                  ? 'bg-slate-950/40 border-slate-800/80 opacity-80'
                  : 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800 hover:border-indigo-500/60'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl shrink-0 mt-0.5">
                  {getItemIcon(item.type)}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                    <h4 className="text-sm font-semibold text-slate-100 truncate">{item.titleUz}</h4>
                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[10px] text-slate-400 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-400" /> {item.estimatedMinutes}m
                    </span>
                    {item.isCompleted && (
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Bajarildi
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.descriptionUz}</p>
                </div>
              </div>

              <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0">
                <button
                  onClick={() => handleItemAction(item)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] ${
                    item.isCompleted
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                  }`}
                >
                  <span>{item.isCompleted ? 'Qayta Ko‘rish' : 'Boshlash'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
