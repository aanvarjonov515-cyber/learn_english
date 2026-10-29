import React, { useState, useEffect, useRef } from 'react';
import {
  TeacherSession,
  TeacherSessionState,
  TeacherChatMessage,
  LessonGoal,
  UserProfile,
  UserSettings,
} from '../../types';
import {
  getActiveTeacherSession,
  saveActiveTeacherSession,
  clearActiveTeacherSession,
  validateStateTransition,
} from '../../services/teacherStorage';
import { getUserSettings } from '../../services/storage';
import { playbackController } from '../../services/audioEngine';
import { MediaPanel } from '../media/MediaPanel';
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  BookOpen,
  Headphones,
  PenTool,
  Clock,
  Flag,
  ArrowRight,
  Pause,
  Play,
  Lightbulb,
  Mic,
} from 'lucide-react';

import { PersistentTeacherChat } from './PersistentTeacherChat';
import { HomeworkView } from './HomeworkView';
import { TeacherVoiceSettingsModal } from './TeacherVoiceSettingsModal';

interface TeacherViewProps {
  ownerId: string;
  profile: UserProfile;
  onNavigate?: (route: any) => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({
  ownerId,
  profile,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'interactive' | 'homework'>('chat');
  const [session, setSession] = useState<TeacherSession | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [activeAudioMsgId, setActiveAudioMsgId] = useState<string | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(true);
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load or restore active session on mount
  useEffect(() => {
    const active = getActiveTeacherSession();
    if (active) {
      setSession(active);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isLoading]);

  const handleStartSession = (
    entryPoint: TeacherSession['entryPoint'],
    topic = 'Present Simple (Oddiy Hozirgi Zamon)'
  ) => {
    const newSession: TeacherSession = {
      id: `sess_${Date.now()}`,
      ownerId,
      module: 'grammar',
      entryPoint,
      currentState: 'goalSetting',
      goals: [
        {
          id: 'g_1',
          titleUz: "I, you, we, they bilan fe'lning asosiy shaklini to‘g‘ri qo‘llash",
          targetGrammarPoint: 'base_verb',
          isAchieved: false,
          evidenceCount: 0,
        },
        {
          id: 'g_2',
          titleUz: "He, she, it (uchinchi shaxs) bilan fe'lga -s/-es qo‘shish",
          targetGrammarPoint: 'third_person_s',
          isAchieved: false,
          evidenceCount: 0,
        },
      ],
      durationMinutes: 20,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedBookId: 'book_headway_elem_demo',
      relatedPageNumber: 7,
      relatedUnitId: 'unit_2',
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          sender: 'teacher',
          text: `Assalomu alaykum, ${profile.displayName || 'do‘stim'}! Bugungi individual darsimizga xush kelibsiz. Men sizning AI yordamchi ustozingizman.\n\nBugungi maqsadimiz: Present Simple zamonida fe'llarni to‘g‘ri qo‘llash va uchinchi shaxsda (he/she/it) -s qo‘shimchasini adashtirmaslik.\n\nKeling, darsni boshlash uchun qisqa diagnostik savoldan boshlaymiz:\n"He ___ (work) in a bank every day." — bo‘sh joyga qaysi shakl mos keladi?`,
          timestamp: new Date().toISOString(),
          action: {
            type: 'askQuestion',
            titleUz: "Tezkor savol: To‘g‘ri fe'lni tanlang",
            payload: {
              questionText: 'He ___ (work) in a bank every day.',
              options: ['work', 'works', 'working'],
              correctAnswer: 'works',
              targetGrammar: 'thirdPersonSingular',
            },
          },
        },
      ],
      consecutiveCorrect: 0,
      consecutiveErrors: 0,
      revision: 1,
    };

    setSession(newSession);
    saveActiveTeacherSession(newSession);
  };

  const handleSendTurn = async (
    userMsg: string,
    actionTag?: 'asked_simpler' | 'asked_example' | 'asked_quiz' | 'revealed_answer'
  ) => {
    if (!session || !userMsg.trim() || isLoading) return;

    const userMessageObj: TeacherChatMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: userMsg.trim(),
      timestamp: new Date().toISOString(),
      userHelpTag: actionTag,
    };

    const updatedSessionMessages = [...session.messages, userMessageObj];
    const interimSession: TeacherSession = {
      ...session,
      messages: updatedSessionMessages,
    };
    setSession(interimSession);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/teacher/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionState: session.currentState,
          userMessage: userMsg.trim(),
          context: {
            userLevel: profile.estimatedLevel || 'A2',
            topicTitle: 'Present Simple',
            goals: session.goals.map((g) => g.titleUz),
            bookTitle: 'Headway Elementary',
            printedPageLabel: '3',
            pageTextSnippet: 'Unit 2: A Good Job. Sarah is an architect...',
            consecutiveErrors: session.consecutiveErrors,
            userActionTag: actionTag,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('AI Teacher bilan bog‘lanishda xatolik');
      }

      const json = await res.json();
      const output = json.data;

      // Validate state transition
      let nextState = session.currentState;
      if (output.suggestedNextState && validateStateTransition(session.currentState, output.suggestedNextState as TeacherSessionState)) {
        nextState = output.suggestedNextState as TeacherSessionState;
      }

      // Adaptive counters
      let consecCorr = session.consecutiveCorrect;
      let consecErr = session.consecutiveErrors;

      if (output.isCorrect === true) {
        consecCorr += 1;
        consecErr = 0;
      } else if (output.isCorrect === false) {
        consecErr += 1;
        consecCorr = 0;
      }

      const teacherMsgObj: TeacherChatMessage = {
        id: `msg_t_${Date.now()}`,
        sender: 'teacher',
        text: output.teacherTextUz,
        timestamp: new Date().toISOString(),
        action: output.action,
      };

      const finalSession: TeacherSession = {
        ...session,
        currentState: nextState,
        messages: [...updatedSessionMessages, teacherMsgObj],
        consecutiveCorrect: consecCorr,
        consecutiveErrors: consecErr,
        sessionSummary: output.sessionSummary || session.sessionSummary,
      };

      setSession(finalSession);
      saveActiveTeacherSession(finalSession);

      // Speak response if voice toggle is on
      if (isVoiceActive) {
        handlePlayMessageVoice(teacherMsgObj.id, output.teacherTextUz);
      }
    } catch (err: any) {
      console.error('Teacher turn error', err);
      // Fallback response
      const fallbackMsg: TeacherChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'teacher',
        text: "Kechirasiz, tarmoqda uzilish bo‘ldi. Iltimos, qayta urinib ko‘ring yoki soddaroq savol bering.",
        timestamp: new Date().toISOString(),
      };
      const fbSession = {
        ...session,
        messages: [...updatedSessionMessages, fallbackMsg],
      };
      setSession(fbSession);
      saveActiveTeacherSession(fbSession);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayMessageVoice = (msgId: string, text: string) => {
    if (activeAudioMsgId === msgId) {
      playbackController.stopTeacherVoice();
      setActiveAudioMsgId(null);
    } else {
      setActiveAudioMsgId(msgId);
      playbackController.playTeacherVoice(text, () => {
        setActiveAudioMsgId(null);
      });
    }
  };

  const handleActionOptionSelect = (optionText: string) => {
    handleSendTurn(optionText);
  };

  const handleCompleteSession = () => {
    if (!session) return;
    const completedSession: TeacherSession = {
      ...session,
      currentState: 'completed',
      completedAt: new Date().toISOString(),
      sessionSummary: session.sessionSummary || {
        topicsCovered: ['Present Simple: Affirmative with -s/-es'],
        exercisesCompleted: 3,
        independentSuccesses: session.consecutiveCorrect,
        repeatedMistakes: ["He/She/It fe'llariga -s qo‘shish"],
        hintsUsedCount: 1,
        nextRecommendationUz:
          'Bugungi mavzu bo‘yicha Daily Writing bo‘limida 5 ta gapdan iborat kundalik hayot matnini yozish tavsiya etiladi.',
        evidenceIds: [],
      },
    };
    setSession(completedSession);
    saveActiveTeacherSession(completedSession);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Teacher Module Sub-Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'chat'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Bot className="w-4 h-4" /> Erkin Ustoz Chati (Persistent Chat)
        </button>
        <button
          onClick={() => setActiveTab('interactive')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'interactive'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Interaktiv Dars (Interactive Lesson)
        </button>
        <button
          onClick={() => setActiveTab('homework')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'homework'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> Uy Vazifalari (Homework)
        </button>

        <button
          onClick={() => setShowVoiceModal(true)}
          className="ml-auto px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface border border-border text-textPrimary hover:bg-surface-muted transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Ustoz Ovozi ({settings.teacherVoiceId || 'Kore'})
        </button>
      </div>

      {activeTab === 'chat' && <PersistentTeacherChat />}
      {activeTab === 'homework' && <HomeworkView />}

      {activeTab === 'interactive' && (!session || session.currentState === 'completed') && (
        <div className="max-w-4xl mx-auto space-y-6">
        {/* Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-teal-900 to-teal-950 text-white rounded-3xl shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-800/80 text-teal-200 text-xs font-semibold">
              <Bot className="w-4 h-4" /> AI Teacher Individual Dars Tizimi
            </div>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl">
              Salom, {profile.displayName || 'O‘quvchi'}! Bugun nima o‘rganamiz?
            </h1>
            <p className="text-teal-100/90 text-sm max-w-xl leading-relaxed">
              AI Teacher darslikdagi mavzular, so‘z boyligingiz va oldingi mashq natijalaringizga
              tayangan holda individual dars olib boradi.
            </p>
          </div>
        </div>

        {/* Previous summary if completed */}
        {session?.currentState === 'completed' && session.sessionSummary && (
          <div className="p-5 bg-white border border-[#E5E2D9] rounded-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" /> Yakunlangan Dars Xulosasi
              </h3>
              <span className="text-xs text-gray-500">
                {new Date(session.completedAt || '').toLocaleDateString('uz-UZ')}
              </span>
            </div>
            <p className="text-xs text-gray-700">
              <span className="font-semibold">O‘tilgan mavzu:</span>{' '}
              {session.sessionSummary.topicsCovered.join(', ')}
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Ustoz tavsiyasi:</span>{' '}
              {session.sessionSummary.nextRecommendationUz}
            </p>
            <div className="pt-2 flex gap-2">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('writing')}
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" /> Writing Topshirig‘ini Boshlash
                </button>
              )}
            </div>
          </div>
        )}

        {/* 6 Lesson Entry Points */}
        <div className="space-y-3">
          <h2 className="font-serif font-bold text-lg text-gray-900">
            Dars Boshlash Yo‘nalishini Tanlang:
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <button
              onClick={() => handleStartSession('today_lesson')}
              className="p-5 rounded-2xl bg-white border border-[#E5E2D9] hover:border-teal-700 hover:shadow-md transition-all text-left space-y-2 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-gray-900">
                Bugungi Darsni Boshlash
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Rejadagi navbatdagi mavzu (Present Simple zamoni va kundalik fe'llar).
              </p>
            </button>

            <button
              onClick={() => handleStartSession('continue_book')}
              className="p-5 rounded-2xl bg-white border border-[#E5E2D9] hover:border-teal-700 hover:shadow-md transition-all text-left space-y-2 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-gray-900">
                Kitobdan Davom Etish
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Headway Elementary: Unit 2 (3-betdagi Sarah kasbi va kundalik hayoti).
              </p>
            </button>

            <button
              onClick={() => handleStartSession('continue_listening')}
              className="p-5 rounded-2xl bg-white border border-[#E5E2D9] hover:border-teal-700 hover:shadow-md transition-all text-left space-y-2 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Headphones className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-gray-900">
                Listeningni Davom Ettirish
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Track 3.23: Shaharda yo‘l so‘rash va yo‘nalish ko‘rsatish dialogi.
              </p>
            </button>

            <button
              onClick={() => handleStartSession('yesterday_mistakes')}
              className="p-5 rounded-2xl bg-white border border-[#E5E2D9] hover:border-teal-700 hover:shadow-md transition-all text-left space-y-2 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-gray-900">
                Kecha Qilgan Xatolarimni Ko‘rish
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                He/she/it bilan -s qo‘shishda yo‘l qo‘yilgan noaniqliklarni qayta tahlil qilish.
              </p>
            </button>

            <button
              onClick={() => handleStartSession('study_topic')}
              className="p-5 rounded-2xl bg-white border border-[#E5E2D9] hover:border-teal-700 hover:shadow-md transition-all text-left space-y-2 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-gray-900">
                Aynan Shu Qoidani O‘rganish
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Qisqa tushuntirish, misollar va sinov savollari orqali mustahkamlash.
              </p>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Active Interactive Lesson Session View (Two-Column Desktop Layout) */}
      {activeTab === 'interactive' && session && session.currentState !== 'completed' && (
        <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-8rem)] space-y-3">
          {/* Session Top Bar */}
          <div className="p-3.5 bg-surface border border-border rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm text-textPrimary">
                    AI Teacher Individual Darsi
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 text-[10px] font-bold uppercase">
                    {session.currentState}
                  </span>
                </div>
                <p className="text-xs text-textSecondary flex items-center gap-2">
                  <span>Mavzu: Present Simple</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {session.durationMinutes} daqiqa
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsVoiceActive(!isVoiceActive)}
                className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isVoiceActive
                    ? 'bg-teal-50 dark:bg-teal-950 border-teal-600 text-teal-900 dark:text-teal-200 font-semibold'
                    : 'bg-surface border-border text-textSecondary hover:bg-elevated'
                }`}
                title="Ovozli o‘qishni yoqish / o‘chirish"
              >
                {isVoiceActive ? <Volume2 className="w-4 h-4 text-teal-800 dark:text-teal-400" /> : <VolumeX className="w-4 h-4 text-textSecondary" />}
                <span className="hidden sm:inline">Ovoz: {isVoiceActive ? 'Yoqilgan' : 'O‘chiq'}</span>
              </button>

              <button
                type="button"
                onClick={handleCompleteSession}
                className="px-3 py-1.5 bg-elevated hover:bg-elevated/80 text-textSecondary rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" /> Darsni Yakunlash
              </button>
            </div>
          </div>

          {/* Two Column Layout: Left (~65%) Chat & Actions, Right (~35%) Avatar & Goals */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT COLUMN: Chat & Exercise Area (~65% -> col-span-8) */}
            <div className="lg:col-span-8 flex flex-col min-h-0 bg-surface border border-border rounded-2xl p-4 space-y-3 shadow-xs">
              {/* Chat & Lesson Dialogue Area */}
              <div className="flex-1 min-h-0 bg-background border border-border rounded-xl p-4 overflow-y-auto space-y-4">
                {session.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
                        msg.sender === 'user'
                          ? 'bg-teal-800 text-white rounded-br-xs font-medium'
                          : 'bg-surface border border-border text-textPrimary rounded-bl-xs font-serif text-[13px]'
                      }`}
                    >
                      {/* Speaker Header for Teacher */}
                      {msg.sender === 'teacher' && (
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border">
                          <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-bold font-sans text-xs">
                            <Bot className="w-3.5 h-3.5" />
                            <span>AI Teacher</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlayMessageVoice(msg.id, msg.text)}
                            className="p-1 text-textSecondary hover:text-teal-800 dark:hover:text-teal-300 cursor-pointer"
                            title="Javobni tinglash"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="whitespace-pre-line">{msg.text}</div>

                      {/* Structured Action */}
                      {msg.action && (
                        <div className="p-3 bg-surface border border-teal-200 dark:border-teal-800 rounded-xl space-y-2 font-sans text-xs mt-2">
                          <span className="font-bold text-teal-800 dark:text-teal-300 block">
                            {msg.action.titleUz}
                          </span>

                          {msg.action.payload.options && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {msg.action.payload.options.map((opt: string) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleActionOptionSelect(opt)}
                                  disabled={isLoading}
                                  className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950 border border-teal-300 dark:border-teal-700 hover:bg-teal-800 hover:text-white rounded-lg text-teal-950 dark:text-teal-100 font-semibold cursor-pointer transition-colors"
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {msg.action.type === 'prepareListeningExercise' && onNavigate && (
                            <button
                              type="button"
                              onClick={() => onNavigate('grammar')}
                              className="px-3.5 py-1.5 bg-teal-800 text-white font-semibold rounded-lg flex items-center gap-1.5 hover:bg-teal-900 cursor-pointer"
                            >
                              <Headphones className="w-3.5 h-3.5" /> Listening Mashqini Ochish
                            </button>
                          )}

                          {msg.action.type === 'proposeWritingTask' && onNavigate && (
                            <button
                              type="button"
                              onClick={() => onNavigate('writing')}
                              className="px-3.5 py-1.5 bg-teal-800 text-white font-semibold rounded-lg flex items-center gap-1.5 hover:bg-teal-900 cursor-pointer"
                            >
                              <PenTool className="w-3.5 h-3.5" /> Writing Vazifasiga O‘tish
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-textSecondary mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 p-3 text-xs text-textSecondary font-serif">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-800" />
                    <span>AI Teacher o‘ylamoqda va javob yozmoqda...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Action Assistance Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs shrink-0">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendTurn('Bu qoidani yaxshi tushunmadim, iltimos boshqacharoq tushuntiring.', 'asked_simpler')}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border text-textSecondary hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950 cursor-pointer"
                >
                  💡 Tushunmadim
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendTurn('Soddaroq qilib ayting.', 'asked_simpler')}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border text-textSecondary hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950 cursor-pointer"
                >
                  📉 Soddaroq ayt
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendTurn('Menga yana boshqa misol keltiring.', 'asked_example')}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border text-textSecondary hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950 cursor-pointer"
                >
                  ✨ Boshqa misol
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendTurn('Yangi mashq yoki savol bering.', 'asked_quiz')}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border text-textSecondary hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950 cursor-pointer"
                >
                  🎯 Mashq ber
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendTurn('To‘g‘ri javobni ko‘rsating va tushuntirib bering.', 'revealed_answer')}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 cursor-pointer font-medium"
                >
                  🔑 Javobni ko‘rsat
                </button>
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendTurn(inputText);
                }}
                className="flex items-center gap-2 p-2 bg-surface border border-border rounded-xl shadow-xs shrink-0"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Javobingizni yoki savolingizni yozing..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 text-xs bg-transparent focus:outline-hidden text-textPrimary font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="p-2.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* RIGHT COLUMN: Avatar & Lesson Goals Accordion (~35% -> col-span-4) */}
            <div className="lg:col-span-4 flex flex-col min-h-0 space-y-3 overflow-y-auto">
              {/* Media / Avatar Panel */}
              <div className="bg-surface border border-border rounded-2xl p-3 shadow-xs shrink-0">
                <MediaPanel
                  avatarState={
                    isLoading
                      ? 'thinking'
                      : isVoiceActive
                      ? 'speaking'
                      : session.currentState === 'explaining'
                      ? 'explaining'
                      : 'idle'
                  }
                  isPlaying={isVoiceActive}
                  currentSubtitles={
                    session.messages.length > 0
                      ? session.messages[session.messages.length - 1].text
                      : ''
                  }
                />
              </div>

              {/* Lesson Goals Accordion */}
              {session.goals.length > 0 && (
                <div className="bg-surface border border-border rounded-2xl p-4 space-y-3 shadow-xs">
                  <div
                    onClick={() => setGoalsOpen(!goalsOpen)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span className="font-serif font-bold text-xs text-textPrimary">
                        Dars maqsadlari · {session.goals.length} ta
                      </span>
                    </div>
                    <span className="text-xs text-textSecondary">{goalsOpen ? '▲ Yopish' : '▼ Ochish'}</span>
                  </div>
                  {goalsOpen && (
                    <div className="space-y-2.5 pt-2.5 border-t border-border">
                      {session.goals.map((g) => (
                        <div key={g.id} className="flex items-start gap-2 text-xs text-textSecondary">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              g.isAchieved ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                          <span className={`leading-relaxed ${g.isAchieved ? 'line-through opacity-75' : ''}`}>
                            {g.titleUz}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showVoiceModal && (
        <TeacherVoiceSettingsModal
          settings={settings}
          onUpdate={setSettings}
          onClose={() => setShowVoiceModal(false)}
        />
      )}
    </div>
  );
};
