import React, { useMemo } from 'react';
import {
  getAllEntries,
  getReviewStates,
  getAllAttempts,
} from '../../services/storage';
import { getDifficultWords } from '../../services/scheduler';
import {
  BarChart3,
  Trophy,
  Clock,
  Target,
  Repeat,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const entries = getAllEntries();
  const reviewStates = getReviewStates();
  const attempts = getAllAttempts();
  const difficultWords = useMemo(() => getDifficultWords(entries, reviewStates), [entries, reviewStates]);

  // Attempts analytics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttempts = attempts.filter((a) => a.createdAt.startsWith(todayStr));
  const uniqueTodayWords = new Set(todayAttempts.map((a) => a.entryId)).size;

  const totalValidAttempts = attempts.filter((a) => a.exerciseType !== 'intro');
  const independentCorrectAttempts = totalValidAttempts.filter((a) => a.isCorrect && !a.hintUsed);
  const assistedAttempts = totalValidAttempts.filter((a) => a.hintUsed);

  const productionAttempts = attempts.filter((a) => a.exerciseType === 'production_free');
  const productionSuccessRate =
    productionAttempts.length > 0
      ? Math.round(
          (productionAttempts.filter((a) => a.isCorrect && !a.hintUsed).length /
            productionAttempts.length) *
            100
        )
      : null;

  const recognitionAttempts = attempts.filter(
    (a) => a.exerciseType === 'choice_meaning' || a.exerciseType === 'audio_to_word'
  );
  const recognitionSuccessRate =
    recognitionAttempts.length > 0
      ? Math.round(
          (recognitionAttempts.filter((a) => a.isCorrect).length /
            recognitionAttempts.length) *
            100
        )
      : null;

  // 7-day forecast schedule
  const next7DaysSchedule = useMemo(() => {
    const days: { label: string; dateStr: string; count: number }[] = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Bugun' : i === 1 ? 'Ertaga' : d.toLocaleDateString('uz-UZ', { weekday: 'short' });

      // Count due review states for this date
      const count = reviewStates.filter((r) => {
        const recDue = r.recognition.dueAt.split('T')[0];
        const prodDue = r.production.dueAt.split('T')[0];
        return recDue === dateStr || prodDue === dateStr;
      }).length;

      days.push({
        label: `${dayName} (${d.getDate()}-${d.toLocaleDateString('uz-UZ', { month: 'short' })})`,
        dateStr,
        count,
      });
    }

    return days;
  }, [reviewStates]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-textPrimary">
          O'quv Natijalari va Xotira Tahlili
        </h2>
        <p className="text-xs text-textSecondary mt-0.5">
          Haqiqiy bajarilgan mashqlar, Spaced Repetition oraliqlari va faol o'rganish ko'rsatkichlari.
        </p>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-textSecondary uppercase flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Bugungi So'zlar
          </span>
          <p className="text-2xl font-bold text-textPrimary">{uniqueTodayWords} ta</p>
          <span className="text-[10px] text-textSecondary">mashq qilingan noyob so'z</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-textSecondary uppercase flex items-center gap-1">
            <Repeat className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Jami Takrorlashlar
          </span>
          <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{reviewStates.length} ta</p>
          <span className="text-[10px] text-textSecondary">rejalashtirilgan xotira yozuvi</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-textSecondary uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Mustaqil To'g'ri
          </span>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {independentCorrectAttempts.length} ta
          </p>
          <span className="text-[10px] text-textSecondary">yordamsiz eslangan javob</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-textSecondary uppercase flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Yordam Ishlatilgan
          </span>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{assistedAttempts.length} ta</p>
          <span className="text-[10px] text-textSecondary">maslahat yoki javob ko'rilgan</span>
        </div>
      </div>

      {/* Recognition vs Production Retention */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xs space-y-4">
        <h3 className="font-serif font-bold text-base text-textPrimary">
          Tanish (Recognition) va Mustaqil Yozish (Production) Tahlili
        </h3>
        <p className="text-xs text-textSecondary">
          So'zni variantlar ichidan tanish bilan uni o'zbekcha ma'nodan yoddan inglizcha yozish turli xotira darajasini talab qiladi.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Recognition Progress */}
          <div className="p-4 rounded-xl bg-background border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-textPrimary">Tanish Muvaffaqiyati</span>
              <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
                {recognitionSuccessRate !== null ? `${recognitionSuccessRate}%` : "Ma'lumot kam"}
              </span>
            </div>
            <div className="w-full bg-surface-muted h-2 rounded-full overflow-hidden">
              <div
                className="bg-teal-600 dark:bg-teal-500 h-full"
                style={{ width: `${recognitionSuccessRate || 0}%` }}
              />
            </div>
            <p className="text-[11px] text-textSecondary">
              Inglizcha so'zdan ma'noni va audioni tanish urinishlari asosida.
            </p>
          </div>

          {/* Production Progress */}
          <div className="p-4 rounded-xl bg-background border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-textPrimary">Mustaqil Yozish Muvaffaqiyati</span>
              <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                {productionSuccessRate !== null ? `${productionSuccessRate}%` : "Ma'lumot kam"}
              </span>
            </div>
            <div className="w-full bg-surface-muted h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-600 dark:bg-amber-500 h-full"
                style={{ width: `${productionSuccessRate || 0}%` }}
              />
            </div>
            <p className="text-[11px] text-textSecondary">
              O'zbekcha tarjimadan inglizchasini yordamsiz to'liq yozish asosida.
            </p>
          </div>
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h3 className="font-serif font-bold text-base text-textPrimary">
            Keyingi 7 Kunlik Takrorlash Rejasi
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-center text-xs">
          {next7DaysSchedule.map((day, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border transition-colors ${
                idx === 0
                  ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 font-semibold'
                  : 'border-border bg-background'
              }`}
            >
              <span className="block text-[11px] text-textSecondary">{day.label}</span>
              <span className="block text-lg font-bold text-textPrimary mt-1">
                {day.count} ta
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
