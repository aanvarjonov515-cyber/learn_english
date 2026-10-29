import React, { useState, useEffect } from 'react';
import {
  WritingTask,
  WritingSubmission,
  WritingIssue,
  RecurringErrorStat,
  UserProfile,
} from '../../types';
import {
  getWritingTasks,
  getWritingTaskById,
  saveWritingTask,
  getWritingSubmissions,
  saveWritingSubmission,
  getRecurringErrors,
} from '../../services/writingStorage';
import {
  PenTool,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Send,
  Loader2,
  FileText,
  Eye,
  ListOrdered,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface WritingViewProps {
  ownerId: string;
  profile: UserProfile;
  onNavigate?: (route: any) => void;
}

type WritingTab =
  | 'today_task'
  | 'editor'
  | 'needs_revision'
  | 'history'
  | 'recurring_errors';

export const WritingView: React.FC<WritingViewProps> = ({
  ownerId,
  profile,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<WritingTab>('today_task');
  const [tasks, setTasks] = useState<WritingTask[]>([]);
  const [activeTask, setActiveTask] = useState<WritingTask | null>(null);
  const [submissions, setSubmissions] = useState<WritingSubmission[]>([]);
  const [recurringErrors, setRecurringErrors] = useState<RecurringErrorStat[]>([]);

  // Editor states
  const [draftText, setDraftText] = useState('');
  const [autosaveStatus, setAutosaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<WritingSubmission | null>(null);

  // Scaffolding / Support used
  const [showScaffolding, setShowScaffolding] = useState(false);
  const [scaffoldingOpened, setScaffoldingOpened] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [showFullModelAnswer, setShowFullModelAnswer] = useState(false);

  const loadData = () => {
    const allTasks = getWritingTasks();
    const allSubs = getWritingSubmissions();
    const allErrors = getRecurringErrors();

    setTasks(allTasks);
    setSubmissions(allSubs);
    setRecurringErrors(allErrors);

    if (allTasks.length > 0 && !activeTask) {
      setActiveTask(allTasks[0]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Word and sentence count
  const wordCount = draftText.trim()
    ? draftText.trim().split(/\s+/).length
    : 0;
  const sentenceCount = draftText.trim()
    ? draftText.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
    : 0;

  const handleStartTask = (task: WritingTask) => {
    setActiveTask(task);
    // Find latest draft for this task
    const taskSubs = getWritingSubmissions(task.id);
    const latest = taskSubs[taskSubs.length - 1];

    if (latest && latest.feedbackStatus === 'reviewed') {
      setActiveSubmission(latest);
      setDraftText(latest.originalText);
    } else if (latest) {
      setActiveSubmission(latest);
      setDraftText(latest.originalText);
    } else {
      setActiveSubmission(null);
      setDraftText('');
    }

    setActiveTab('editor');
  };

  const handleAutosave = () => {
    if (!activeTask || !draftText.trim()) return;
    setAutosaveStatus('saving');
    try {
      const existingSub = activeSubmission;
      const sub: WritingSubmission = {
        id: existingSub?.id || `sub_${activeTask.id}_${Date.now()}`,
        ownerId,
        taskId: activeTask.id,
        originalText: draftText,
        wordCount,
        sentenceCount,
        revisionNumber: existingSub ? existingSub.revisionNumber : 1,
        contentHash: `hash_${draftText.length}_${Date.now()}`,
        targetGrammarSnapshot: activeTask.targetGrammarPoints,
        supportUsed: {
          hintsRevealed: false,
          modelAnswerViewed: showFullModelAnswer,
          scaffoldingOpened,
        },
        submittedAt: new Date().toISOString(),
        feedbackStatus: 'draft',
      };
      saveWritingSubmission(sub);
      setActiveSubmission(sub);
      setAutosaveStatus('saved');
    } catch {
      setAutosaveStatus('error');
    }
  };

  const handleSubmitForReview = async () => {
    if (!activeTask || !draftText.trim() || isEvaluating) return;

    setIsEvaluating(true);
    setAutosaveStatus('saving');

    try {
      const res = await fetch('/api/writing/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: activeTask.title,
          instructionUz: activeTask.instructionUz,
          targetLevel: activeTask.targetLevel,
          targetGrammarPoints: activeTask.targetGrammarPoints,
          originalText: draftText,
          wordCount,
        }),
      });

      if (!res.ok) {
        throw new Error('Baholash serverida xatolik');
      }

      const json = await res.json();
      const feedback = json.data;

      const sub: WritingSubmission = {
        id: activeSubmission?.id || `sub_${activeTask.id}_${Date.now()}`,
        ownerId,
        taskId: activeTask.id,
        originalText: draftText,
        wordCount,
        sentenceCount,
        revisionNumber: (activeSubmission?.revisionNumber || 0) + 1,
        parentSubmissionId: activeSubmission?.id,
        contentHash: `hash_${draftText.length}`,
        targetGrammarSnapshot: activeTask.targetGrammarPoints,
        supportUsed: {
          hintsRevealed: showScaffolding,
          modelAnswerViewed: showFullModelAnswer,
          scaffoldingOpened,
        },
        submittedAt: new Date().toISOString(),
        feedbackStatus: 'reviewed',
        feedback: {
          ...feedback,
          feedbackVersion: 1,
          reviewedAt: new Date().toISOString(),
        },
      };

      saveWritingSubmission(sub);
      setActiveSubmission(sub);
      setAutosaveStatus('saved');
      loadData();
    } catch (err: any) {
      console.error('Submission review error', err);
      setAutosaveStatus('error');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleStartRevision = () => {
    if (!activeSubmission) return;
    // Prepare for revision v2+
    setActiveSubmission(null);
    setShowFullModelAnswer(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-br from-teal-900 to-teal-950 text-white rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-800/80 text-teal-200 text-xs font-semibold">
            <PenTool className="w-4 h-4" /> Daily Writing — Kunlik Yozish Tizimi
          </div>
          <h1 className="font-serif font-bold text-2xl">
            Inglizcha Fikringizni Yozish va O‘stirish
          </h1>
          <p className="text-teal-100/90 text-xs max-w-xl leading-relaxed">
            Har kuni o‘tilgan grammatika mavzusiga mos yozma topshiriq bajaring, xatolaringizni
            tushuning va matningizni qayta yozing.
          </p>
        </div>

        {activeTask && (
          <button
            onClick={() => handleStartTask(activeTask)}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> Yozishni Boshlash
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E2D9] pb-2 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveTab('today_task')}
          className={`px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'today_task'
              ? 'bg-teal-800 text-white font-semibold'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Bugungi Topshiriq
        </button>
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'editor'
              ? 'bg-teal-800 text-white font-semibold'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" /> Yozish Muhiti (Editor)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-teal-800 text-white font-semibold'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Oldingi Ishlar ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab('recurring_errors')}
          className={`px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'recurring_errors'
              ? 'bg-teal-800 text-white font-semibold'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Mening Takroriy Xatolarim ({recurringErrors.length})
        </button>
      </div>

      {/* Tab 1: Today's Task Card */}
      {activeTab === 'today_task' && activeTask && (
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                Daraja: {activeTask.targetLevel} • Maqsad: ~{activeTask.suggestedLength} so‘z
              </span>
              <h2 className="font-serif font-bold text-lg text-gray-900 mt-0.5">
                {activeTask.title}
              </h2>
            </div>
            <button
              onClick={() => handleStartTask(activeTask)}
              className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              Yozishga O‘tish <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <span className="font-semibold text-xs text-gray-600 uppercase tracking-wide">
              Topshiriq Ko‘rsatmasi:
            </span>
            <p className="text-sm font-serif text-gray-900 leading-relaxed bg-[#FAF9F5] p-4 rounded-xl border border-[#E5E2D9]">
              {activeTask.instructionUz}
            </p>
          </div>

          {activeTask.promptEn && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-950 font-serif italic">
              Prompt: "{activeTask.promptEn}"
            </div>
          )}

          {/* Grammar & Vocabulary targets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
              <span className="font-bold text-gray-700 uppercase text-[10px]">
                Maqsadli Grammatika:
              </span>
              <ul className="space-y-1 text-gray-800">
                {activeTask.targetGrammarPoints.map((pt, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
              <span className="font-bold text-gray-700 uppercase text-[10px]">
                Tavsiya Qilinadigan So‘zlar:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeTask.suggestedVocabulary.map((v, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-white border border-gray-300 text-gray-800 text-[11px]"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Writing Editor & Submission / Review */}
      {activeTab === 'editor' && activeTask && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Editor */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 bg-white border border-[#E5E2D9] rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-serif font-bold text-sm text-gray-900">
                    {activeTask.title}
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Maqsad: ~{activeTask.suggestedLength} so‘z • Hozirda: {wordCount} so‘z ({sentenceCount} gap)
                  </span>
                </div>

                <span className="text-[11px] text-gray-400 font-medium">
                  {autosaveStatus === 'saving' && 'Saqlanmoqda...'}
                  {autosaveStatus === 'saved' && 'Saqlandi ✓'}
                  {autosaveStatus === 'error' && 'Saqlanmadi'}
                </span>
              </div>

              {/* Textarea */}
              <textarea
                rows={9}
                value={draftText}
                onChange={(e) => {
                  setDraftText(e.target.value);
                  setAutosaveStatus('idle');
                }}
                placeholder="Ingliz tilidagi matningizni shu yerga yozing..."
                className="w-full p-4 bg-[#FAF9F5] border border-[#D5D1C6] rounded-xl text-sm font-serif text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-teal-700 leading-relaxed"
              />

              {/* Editor Bottom Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleAutosave}
                  className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs text-gray-700 hover:bg-gray-100 cursor-pointer font-medium"
                >
                  Qoralamani Saqlash
                </button>

                <button
                  type="button"
                  onClick={handleSubmitForReview}
                  disabled={!draftText.trim() || isEvaluating}
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI Tekshirmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Tekshirishga Yuborish</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Feedback Panel (When reviewed) */}
            {activeSubmission?.feedback && (
              <div className="p-5 bg-white border border-[#E5E2D9] rounded-2xl space-y-4 shadow-sm animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h3 className="font-serif font-bold text-sm text-gray-900">
                      AI Ustoz Bahosi va Tahlili (v{activeSubmission.revisionNumber})
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      activeSubmission.feedback.overallAssessment === 'goal_achieved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {activeSubmission.feedback.overallAssessment === 'goal_achieved'
                      ? 'Maqsad Bajarildi ✓'
                      : 'Qisman Bajarildi'}
                  </span>
                </div>

                {/* Summary */}
                <p className="text-xs text-gray-800 font-serif leading-relaxed bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E5E2D9]">
                  {activeSubmission.feedback.summaryUz}
                </p>

                {/* Strengths */}
                {activeSubmission.feedback.strengths.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-bold text-[10px] text-emerald-900 uppercase">
                      Yaxshi Chiqqan Jihatlar:
                    </span>
                    <ul className="space-y-1 text-xs text-gray-700">
                      {activeSubmission.feedback.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Issues (Categorized) */}
                {activeSubmission.feedback.issues.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10px] text-rose-900 uppercase">
                        Tuzatish Kerak Bo‘lgan O‘rinlar ({activeSubmission.feedback.issues.length} ta):
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAllIssues(!showAllIssues)}
                        className="text-[11px] text-teal-800 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        {showAllIssues ? 'Kamroq ko‘rsat' : 'Barcha izohlarni ko‘rish'}
                        {showAllIssues ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(showAllIssues
                        ? activeSubmission.feedback.issues
                        : activeSubmission.feedback.issues.slice(0, 2)
                      ).map((issue) => (
                        <div
                          key={issue.issueId}
                          className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-rose-900">
                              "{issue.originalSpan}"
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-rose-200 text-rose-950 font-semibold text-[10px]">
                              → {issue.suggestedCorrection}
                            </span>
                          </div>
                          <p className="text-gray-700">{issue.explanationUz}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Step */}
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-teal-900 uppercase text-[10px]">
                    Ustoz Tavsiyasi (Keyingi Qadam):
                  </span>
                  <p className="text-teal-950">{activeSubmission.feedback.nextStepUz}</p>
                </div>

                {/* Reveal Full Model Answer Option */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFullModelAnswer(!showFullModelAnswer);
                    }}
                    className="text-xs text-amber-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>
                      {showFullModelAnswer
                        ? 'Namunani yashirish'
                        : 'To‘liq namunani ko‘rsat'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartRevision}
                    className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> O‘zim Qayta Yozaman
                  </button>
                </div>

                {showFullModelAnswer && activeSubmission.feedback.fullExemplarCorrection && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs animate-in fade-in">
                    <span className="font-bold text-amber-950 text-[10px] uppercase block">
                      To‘liq Tuzatilgan Namuna:
                    </span>
                    <p className="font-serif text-gray-900 leading-relaxed italic">
                      "{activeSubmission.feedback.fullExemplarCorrection}"
                    </p>
                  </div>
                )}

                {/* Follow up transfer task */}
                {activeSubmission.feedback.followUpTransferTask && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-xs">
                    <span className="font-bold text-blue-900 uppercase text-[10px]">
                      Mustaqil Transfer Sinovi:
                    </span>
                    <p className="text-blue-950 font-medium">
                      {activeSubmission.feedback.followUpTransferTask.instructionUz}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Scaffolding, Plan & Task Help */}
          <div className="space-y-4">
            <div className="p-4 bg-white border border-[#E5E2D9] rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-800 uppercase flex items-center gap-1.5">
                  <ListOrdered className="w-4 h-4 text-teal-800" /> Yozish Yordamchisi
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowScaffolding(!showScaffolding);
                    setScaffoldingOpened(true);
                  }}
                  className="text-xs text-teal-800 font-semibold hover:underline cursor-pointer"
                >
                  {showScaffolding ? 'Yashirish' : 'Rejani ko‘rish'}
                </button>
              </div>

              {showScaffolding && activeTask.scaffolding && (
                <div className="space-y-3 text-xs pt-1 animate-in fade-in">
                  {/* Suggested Plan */}
                  {activeTask.scaffolding.suggestedPlan && (
                    <div className="space-y-1">
                      <span className="font-bold text-gray-600 uppercase text-[10px]">
                        Reja:
                      </span>
                      <ul className="space-y-1 text-gray-700">
                        {activeTask.scaffolding.suggestedPlan.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Starter Phrases */}
                  {activeTask.scaffolding.starterPhrases && (
                    <div className="space-y-1 pt-1 border-t border-gray-100">
                      <span className="font-bold text-gray-600 uppercase text-[10px]">
                        Boshlang‘ich jumlalar:
                      </span>
                      <div className="space-y-1">
                        {activeTask.scaffolding.starterPhrases.map((phrase, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setDraftText((prev) => prev + (prev ? ' ' : '') + phrase)}
                            className="block w-full text-left px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-950 font-serif text-[11px] cursor-pointer"
                          >
                            + "{phrase}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 space-y-4 shadow-xs">
          <h2 className="font-serif font-bold text-base text-gray-900">
            Mening Yozma Ishlarim Tarixi ({submissions.length})
          </h2>

          <div className="space-y-3">
            {submissions.map((sub) => {
              const task = tasks.find((t) => t.id === sub.taskId);
              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    if (task) {
                      setActiveTask(task);
                      setActiveSubmission(sub);
                      setDraftText(sub.originalText);
                      setActiveTab('editor');
                    }
                  }}
                  className="p-4 rounded-xl border border-gray-200 hover:border-teal-700 transition-all cursor-pointer space-y-2 bg-[#FAF9F5]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900">
                      {task?.title || 'Yozma Topsiriq'} (v{sub.revisionNumber})
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(sub.submittedAt).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 font-serif italic line-clamp-2">
                    "{sub.originalText}"
                  </p>
                  {sub.feedback && (
                    <div className="text-[11px] text-teal-800 font-medium">
                      Ustoz izohi: {sub.feedback.summaryUz}
                    </div>
                  )}
                </div>
              );
            })}

            {submissions.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-6">
                Hozircha topshirilgan ishlar yo‘q. Bugungi topshiriqdan boshlang!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Recurring Errors Profile */}
      {activeTab === 'recurring_errors' && (
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 space-y-4 shadow-xs">
          <h2 className="font-serif font-bold text-base text-gray-900">
            Mening Takroriy Grammatik Xatolarim ({recurringErrors.length})
          </h2>
          <p className="text-xs text-gray-600">
            Tizim har bir yozma ish va mashqda yo‘l qo‘yilgan xatolarni tahlil qilib, aynan qaysi
            qoidalar ustida ko‘proq ishlash kerakligini ko‘rsatadi.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {recurringErrors.map((err) => (
              <div
                key={err.ruleId}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-amber-950">
                    {err.ruleNameUz}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-bold">
                    {err.occurrenceCount} marta kuzatildi
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-700">
                  <span className="font-semibold text-[10px] text-gray-500 uppercase">
                    Misollar va izohlar:
                  </span>
                  {err.sampleExplanationsUz.map((exp, idx) => (
                    <p key={idx} className="italic text-gray-800">
                      • {exp}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {recurringErrors.length === 0 && (
              <p className="text-xs text-gray-500 col-span-2 text-center py-6">
                Hozircha takroriy xatolar aniqlanmadi.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
