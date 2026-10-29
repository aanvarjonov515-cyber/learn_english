import { DailyStudyPlan, StudyPlanItem, StudyPlanType } from '../types';
import { getTodayLocalDateStr, getActivityEvents } from './activityLogger';
import { getUserSettings, getAllEntries, getReviewStates } from './storage';
import { buildDailyReviewQueue } from './scheduler';
import { getAllTeacherSessions } from './teacherStorage';
import { getWritingTasks, getWritingSubmissions } from './writingStorage';
import { getGrammarBooks, getBookUnits } from './grammarStorage';

const PLAN_KEY = 'english_teacher_daily_plans_v1';

function safeGetStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', key, e);
  }
}

export function generateDailyStudyPlan(): DailyStudyPlan {
  const todayStr = getTodayLocalDateStr();
  const existingPlans = safeGetStorage<Record<string, DailyStudyPlan>>(PLAN_KEY, {});

  // Check if today's plan already exists
  if (existingPlans[todayStr]) {
    return updatePlanCompletion(existingPlans[todayStr]);
  }

  const settings = getUserSettings();
  const timeBudget = settings.dailyStudyMinutes || 20;

  const dueCards = buildDailyReviewQueue(getAllEntries(), getReviewStates());
  const teacherSessions = getAllTeacherSessions();
  const writingTasks = getWritingTasks();
  const writingSubmissions = getWritingSubmissions();
  const books = getGrammarBooks();
  const sampleBookId = books[0]?.id || 'book_headway_elem_demo';
  const units = getBookUnits(sampleBookId);
  const exercises = units.flatMap((u) => u.exercises || []);
  const activities = getActivityEvents().filter((e) => e.localDateAtOccurrence === todayStr);

  const items: StudyPlanItem[] = [];

  // 1. Spaced Repetition Due Words Review (Priority 1)
  if (dueCards.length > 0) {
    items.push({
      id: `plan_vocab_review_${todayStr}`,
      type: 'vocab_review',
      titleUz: `Lug‘at Takrorlash (${dueCards.length} ta so‘z)`,
      descriptionUz: 'Intervallar algoritmi bo‘yicha bugun takrorlanishi kerak bo‘lgan so‘zlar',
      estimatedMinutes: Math.min(10, Math.ceil(dueCards.length * 0.5)),
      priority: 1,
      targetModule: 'vocabulary',
      targetPath: '/repetition',
      isCompleted: activities.some((a) => a.eventType === 'vocab_reviewed'),
    });
  }

  // 2. Daily New Words Target (Priority 2)
  const newTarget = settings.dailyNewWordTarget || 10;
  items.push({
    id: `plan_vocab_new_${todayStr}`,
    type: 'vocab_new',
    titleUz: `Yangi So‘zlar O‘rganish (${newTarget} ta)`,
    descriptionUz: 'Lug‘at to‘plamlaridan bugungi maqsadli so‘zlarni yodlash',
    estimatedMinutes: 5,
    priority: 2,
    targetModule: 'vocabulary',
    targetPath: '/vocabulary',
    isCompleted: activities.some((a) => a.eventType === 'vocab_learned'),
  });

  // 3. AI Teacher Lesson (Priority 3)
  const lastSession = teacherSessions[0];
  const hasIncompleteTeacherSession = lastSession && lastSession.currentState !== 'completed';

  items.push({
    id: `plan_teacher_${todayStr}`,
    type: 'teacher_lesson',
    titleUz: hasIncompleteTeacherSession ? 'AI Teacher Darsini Davom Ettirish' : 'AI Teacher Bilan Interaktiv Dars',
    descriptionUz: 'O‘qituvchi bilan muloqot, grammatika va nutq mashqi',
    estimatedMinutes: timeBudget >= 30 ? 15 : 10,
    priority: 3,
    targetModule: 'teacher',
    targetPath: '/teacher',
    isCompleted: activities.some((a) => a.eventType === 'teacher_session_done'),
  });

  // 4. Grammar Exercise / Book Practice (Priority 4)
  const listeningOrGrammarEx = exercises.find((e) => !e.isSubmitted);
  if (listeningOrGrammarEx) {
    items.push({
      id: `plan_grammar_${todayStr}`,
      type: listeningOrGrammarEx.exerciseType === 'listening' ? 'listening_exercise' : 'grammar_practice',
      titleUz: listeningOrGrammarEx.exerciseType === 'listening' ? 'Listening Audio Mashqi' : 'Grammatika Mashqi',
      descriptionUz: `Topshiriq №${listeningOrGrammarEx.exerciseNumber} (${listeningOrGrammarEx.printedPageLabel}-bet)`,
      estimatedMinutes: 8,
      priority: 4,
      targetModule: 'grammar',
      targetPath: '/grammar',
      deepLinkPayload: { exerciseId: listeningOrGrammarEx.id, bookId: listeningOrGrammarEx.bookId },
      isCompleted: activities.some((a) => a.eventType === 'grammar_exercise_done' || a.eventType === 'listening_completed'),
    });
  }

  // 5. Daily Writing & Revision Task (Priority 5)
  const pendingWriting = writingTasks.find((t) => t.status === 'todo' || t.status === 'revision_needed' || t.status === 'drafting');
  if (pendingWriting) {
    items.push({
      id: `plan_writing_${todayStr}`,
      type: pendingWriting.status === 'revision_needed' ? 'writing_revision' : 'writing_task',
      titleUz: pendingWriting.title,
      descriptionUz: pendingWriting.instructionUz,
      estimatedMinutes: 10,
      priority: 5,
      targetModule: 'writing',
      targetPath: '/writing',
      deepLinkPayload: { taskId: pendingWriting.id },
      isCompleted: writingSubmissions.some((s) => s.taskId === pendingWriting.id && s.feedbackStatus === 'reviewed'),
    });
  }

  // 6. Reading Session (Priority 6)
  items.push({
    id: `plan_reading_${todayStr}`,
    type: 'reading_session',
    titleUz: 'Inglizcha Matn Mutolaasi',
    descriptionUz: 'Reader’da audio hamrohligida matn o‘qish va so‘zlarni belgilash',
    estimatedMinutes: 7,
    priority: 6,
    targetModule: 'reader',
    targetPath: '/reader',
    isCompleted: activities.some((a) => a.eventType === 'reader_read'),
  });

  // Sort by priority and cap by time budget
  items.sort((a, b) => a.priority - b.priority);

  let accumulatedTime = 0;
  const filteredItems: StudyPlanItem[] = [];

  for (const item of items) {
    if (accumulatedTime + item.estimatedMinutes <= timeBudget + 5) {
      filteredItems.push(item);
      accumulatedTime += item.estimatedMinutes;
    }
  }

  const completedMinutes = filteredItems
    .filter((i) => i.isCompleted)
    .reduce((acc, i) => acc + i.estimatedMinutes, 0);

  const newPlan: DailyStudyPlan = {
    dateStr: todayStr,
    timeBudgetMinutes: timeBudget as any,
    totalEstimatedMinutes: accumulatedTime,
    items: filteredItems,
    completedMinutes,
    isAllCompleted: filteredItems.every((i) => i.isCompleted),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  existingPlans[todayStr] = newPlan;
  safeSetStorage(PLAN_KEY, existingPlans);

  return newPlan;
}

export function updatePlanCompletion(plan: DailyStudyPlan): DailyStudyPlan {
  const todayStr = getTodayLocalDateStr();
  const activities = getActivityEvents().filter((e) => e.localDateAtOccurrence === todayStr);
  const writingSubmissions = getWritingSubmissions();

  let updated = false;
  const updatedItems = plan.items.map((item) => {
    let completed = item.isCompleted;

    if (item.type === 'vocab_review' && activities.some((a) => a.eventType === 'vocab_reviewed')) {
      completed = true;
    } else if (item.type === 'vocab_new' && activities.some((a) => a.eventType === 'vocab_learned')) {
      completed = true;
    } else if (item.type === 'teacher_lesson' && activities.some((a) => a.eventType === 'teacher_session_done')) {
      completed = true;
    } else if ((item.type === 'grammar_practice' || item.type === 'listening_exercise') && activities.some((a) => a.eventType === 'grammar_exercise_done' || a.eventType === 'listening_completed')) {
      completed = true;
    } else if ((item.type === 'writing_task' || item.type === 'writing_revision') && writingSubmissions.some((s) => s.feedbackStatus === 'reviewed')) {
      completed = true;
    } else if (item.type === 'reading_session' && activities.some((a) => a.eventType === 'reader_read')) {
      completed = true;
    }

    if (completed !== item.isCompleted) {
      updated = true;
    }
    return { ...item, isCompleted: completed };
  });

  const completedMinutes = updatedItems
    .filter((i) => i.isCompleted)
    .reduce((acc, i) => acc + i.estimatedMinutes, 0);

  const updatedPlan: DailyStudyPlan = {
    ...plan,
    items: updatedItems,
    completedMinutes,
    isAllCompleted: updatedItems.length > 0 && updatedItems.every((i) => i.isCompleted),
    updatedAt: updated ? new Date().toISOString() : plan.updatedAt,
  };

  if (updated) {
    const existingPlans = safeGetStorage<Record<string, DailyStudyPlan>>(PLAN_KEY, {});
    existingPlans[plan.dateStr] = updatedPlan;
    safeSetStorage(PLAN_KEY, existingPlans);
  }

  return updatedPlan;
}
