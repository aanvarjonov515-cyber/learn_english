import React, { useState, useEffect } from 'react';
import {
  getAllEntries,
  getReviewStates,
} from '../../services/storage';
import {
  buildDailyReviewQueue,
  getDifficultWords,
  QueueItem,
  DifficultWordDiagnosis,
} from '../../services/scheduler';
import { ExerciseEngine } from '../practice/ExerciseEngine';
import {
  Repeat,
  Sparkles,
  AlertCircle,
  Play,
  Clock,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface SpacedRepetitionViewProps {
  ownerId: string;
}

export const SpacedRepetitionView: React.FC<SpacedRepetitionViewProps> = ({ ownerId }) => {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [difficultWords, setDifficultWords] = useState<DifficultWordDiagnosis[]>([]);
  const [sessionLimit, setSessionLimit] = useState<number | undefined>(10);

  // Active review practice session
  const [activeReviewSession, setActiveReviewSession] = useState<{
    title: string;
    items: QueueItem[];
  } | null>(null);

  const loadData = () => {
    const entries = getAllEntries();
    const states = getReviewStates();
    const queue = buildDailyReviewQueue(entries, states);
    const difficult = getDifficultWords(entries, states);

    setQueueItems(queue);
    setDifficultWords(difficult);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartQueuePractice = () => {
    const selected = sessionLimit ? queueItems.slice(0, sessionLimit) : queueItems;
    if (selected.length === 0) {
      alert("Hozirda takrorlash navbatida so'zlar yo'q!");
      return;
    }
    setActiveReviewSession({
      title: "Bugungi Spaced Repetition Takrorlashi",
      items: selected,
    });
  };

  const handleStartDifficultPractice = (diagnosis: DifficultWordDiagnosis) => {
    const item: QueueItem = {
      entry: diagnosis.entry,
      sense: diagnosis.sense,
      reviewState: diagnosis.reviewState,
      urgency: 'relearning',
      recommendedDimension: 'production',
      reasonText: diagnosis.diagnosis,
    };
    setActiveReviewSession({
      title: `Qiyin so'zni mustahkamlash: ${diagnosis.entry.surfaceForm}`,
      items: [item],
    });
  };

  if (activeReviewSession) {
    const entries = activeReviewSession.items.map((i) => i.entry);
    return (
      <ExerciseEngine
        ownerId={ownerId}
        entries={entries}
        sectionTitle={activeReviewSession.title}
        initialMode="small_groups"
        onExit={() => {
          setActiveReviewSession(null);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-textPrimary">
            Oraliqli Takrorlash (Spaced Repetition)
          </h2>
          <p className="text-xs text-textSecondary mt-0.5">
            "Bosqichli takrorlash v1" algoritmi bo'yicha mustaqil eslash vaqti kelgan so'zlar navbati.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-xl text-xs">
            <span className="text-textSecondary font-semibold px-2">Sessiya hajmi:</span>
            {[10, 20, 0].map((num) => (
              <button
                key={num}
                onClick={() => setSessionLimit(num === 0 ? undefined : num)}
                className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                  (num === 0 && sessionLimit === undefined) || sessionLimit === num
                    ? 'bg-teal-800 text-white shadow-2xs'
                    : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                {num === 0 ? 'Barchasi' : `${num} ta`}
              </button>
            ))}
          </div>

          <button
            onClick={handleStartQueuePractice}
            disabled={queueItems.length === 0}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-colors shadow-xs cursor-pointer ${
              queueItems.length === 0
                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                : 'bg-teal-800 hover:bg-teal-900'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Takrorlashni Boshlash ({sessionLimit ? Math.min(sessionLimit, queueItems.length) : queueItems.length})</span>
          </button>
        </div>
      </div>

      {/* Daily Queue Overview */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-teal-800 dark:text-teal-400" />
            <h3 className="font-serif font-bold text-base text-textPrimary">
              Bugungi Takrorlash Navbati
            </h3>
          </div>
          <span className="text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
            {queueItems.length} ta so'z kutmoqda
          </span>
        </div>

        {queueItems.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-textPrimary">
              Bugungi barcha takrorlashlar bajarilgan!
            </p>
            <p className="text-xs text-textSecondary max-w-sm mx-auto">
              Yangi so'zlarni "So'z yodlash" yoki "Kitob o'qish" bo'limidan o'rganishingiz mumkin.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {queueItems.map((item, idx) => (
              <div
                key={`${item.entry.id}_${item.sense.id}_${idx}`}
                className="p-3 rounded-xl border border-border bg-background flex items-center justify-between text-xs hover:border-teal-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-textSecondary font-mono text-right">{idx + 1}.</span>
                  <div>
                    <span className="font-serif font-bold text-textPrimary text-sm">
                      {item.entry.surfaceForm}
                    </span>
                    <span className="text-textSecondary ml-2">({item.sense.translationUz})</span>
                    <p className="text-[11px] text-textSecondary mt-0.5">{item.reasonText}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      item.urgency === 'overdue'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                        : item.urgency === 'relearning'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                        : 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                    }`}
                  >
                    {item.urgency === 'overdue'
                      ? "Muddati o'tgan"
                      : item.urgency === 'relearning'
                      ? 'Qayta mustahkamlash'
                      : 'Bugun'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Difficult Words List ("Ko'proq mashq kerak") */}
      {difficultWords.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-serif font-bold text-base text-textPrimary">
              Ko'proq Mashq Kerak Bo'lgan Qiyin So'zlar
            </h3>
          </div>

          <div className="space-y-3">
            {difficultWords.map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-base text-textPrimary">
                      {item.entry.surfaceForm}
                    </span>
                    <span className="text-textSecondary">({item.sense.translationUz})</span>
                  </div>
                  <p className="text-amber-900 dark:text-amber-200 text-[11px] font-medium">
                    Tashxis: {item.diagnosis}
                  </p>
                </div>

                <button
                  onClick={() => handleStartDifficultPractice(item)}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                >
                  {item.actionText}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
