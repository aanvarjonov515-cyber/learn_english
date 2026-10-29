import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Send,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Info,
  RotateCcw,
} from 'lucide-react';
import {
  HomeworkAssignment,
  HomeworkAssignmentStatus,
  HomeworkItem,
  HomeworkSubmission,
} from '../../types';
import {
  getAllHomeworkAssignments,
  submitHomeworkItemAnswer,
  deferHomeworkAssignment,
  simplifyHomeworkAssignment,
  checkDailyHomeworkOnLogin,
} from '../../services/homeworkStorage';

export const HomeworkView: React.FC = () => {
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>(() =>
    getAllHomeworkAssignments()
  );
  const [activeTab, setActiveTab] = useState<HomeworkAssignmentStatus | 'all'>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<HomeworkAssignment | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [loginNotice] = useState(() => checkDailyHomeworkOnLogin());

  const refreshAssignments = () => {
    setAssignments(getAllHomeworkAssignments());
  };

  const filteredAssignments = assignments.filter((a) => {
    if (activeTab === 'all') return true;
    return a.status === activeTab;
  });

  const handleAnswerChange = (itemId: string, text: string) => {
    setUserAnswers((prev) => ({ ...prev, [itemId]: text }));
  };

  const handleSubmitItem = (assignmentId: string, itemId: string) => {
    const answer = userAnswers[itemId];
    if (!answer?.trim()) return;

    submitHomeworkItemAnswer(assignmentId, itemId, answer);
    refreshAssignments();

    // Refresh selected assignment
    const updated = getAllHomeworkAssignments().find((a) => a.id === assignmentId);
    if (updated) setSelectedAssignment(updated);
  };

  const handleDefer = (assignmentId: string) => {
    const nextWeek = new Date(Date.now() + 86400000 * 3).toISOString();
    deferHomeworkAssignment(assignmentId, nextWeek);
    refreshAssignments();
    setSelectedAssignment(null);
  };

  const handleSimplify = (assignmentId: string) => {
    simplifyHomeworkAssignment(assignmentId);
    refreshAssignments();
    const updated = getAllHomeworkAssignments().find((a) => a.id === assignmentId);
    if (updated) setSelectedAssignment(updated);
  };

  const getStatusBadge = (status: HomeworkAssignmentStatus) => {
    switch (status) {
      case 'assigned':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 flex items-center gap-1"><Clock className="w-3 h-3" /> Biriktirilgan</span>;
      case 'inProgress':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-1"><Clock className="w-3 h-3" /> Bajarilmoqda</span>;
      case 'checking':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Tekshirilmoqda</span>;
      case 'needsRevision':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Tuzatish kerak</span>;
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Bajarilgan</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Uy Vazifalari (Homework System)</h1>
            <p className="text-teal-100 text-xs mt-1">
              Ustoz tomonidan berilgan topshiriqlarni bajaring, tekshirtiring va qayta mashq qiling.
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs bg-white/20 px-3 py-1.5 rounded-full font-medium backdrop-blur-xs">
              Faol vazifalar: {loginNotice.activeHomeworksCount} ta
            </span>
          </div>
        </div>

        {/* Notice Info */}
        <div className="mt-4 pt-3 border-t border-white/20 text-xs text-teal-100 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{loginNotice.noticeMessageUz}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { key: 'all', label: 'Barchasi' },
          { key: 'assigned', label: 'Biriktirilgan' },
          { key: 'inProgress', label: 'Bajarilmoqda' },
          { key: 'needsRevision', label: 'Tuzatish kerak' },
          { key: 'completed', label: 'Bajarilgan' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAssignments.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Vazifalar topilmadi</p>
            <p className="text-xs text-slate-400 mt-1">Hozircha ushbu kategoriyada topshiriq yo‘q.</p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-teal-300 dark:hover:border-teal-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {assignment.title}
                  </h3>
                  {getStatusBadge(assignment.status)}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {assignment.instruction}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> ~{assignment.estimatedMinutes} daqiqa
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Muddat: {new Date(assignment.dueAt).toLocaleDateString('uz-UZ')}
                  </span>
                </div>

                {/* Items Status Summary */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Topshiriq elementlari ({assignment.items.length} ta):
                  </span>
                  <div className="space-y-1">
                    {assignment.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40"
                      >
                        <span className="truncate max-w-[240px] text-slate-800 dark:text-slate-200">
                          {item.instruction}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : item.status === 'needs_revision'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700/60 mt-4">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDefer(assignment.id)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                  >
                    Muddatni surish
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => handleSimplify(assignment.id)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                  >
                    Yengillashtirish
                  </button>
                </div>

                <button
                  onClick={() => setSelectedAssignment(assignment)}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  Bajarish <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detailed Assignment Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedAssignment.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedAssignment.instruction}
                </p>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="px-3 py-1 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg"
              >
                Yopish
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {selectedAssignment.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase">
                      [{item.type}]
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {item.instruction}
                  </p>

                  {/* Options if choice */}
                  {item.questionData?.options && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.questionData.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAnswerChange(item.id, opt)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            userAnswers[item.id] === opt
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Text Input if writing or open */}
                  {(!item.questionData?.options || item.type === 'writing') && (
                    <textarea
                      value={userAnswers[item.id] || ''}
                      onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                      placeholder="Javobingizni yozing..."
                      rows={2}
                      className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    />
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleSubmitItem(selectedAssignment.id, item.id)}
                      disabled={!userAnswers[item.id]?.trim()}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" /> Javobni yuborish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
