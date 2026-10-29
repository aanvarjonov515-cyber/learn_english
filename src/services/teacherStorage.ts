/**
 * English Teacher AI - Teacher Session Storage & State Machine
 * Manages active interactive lesson sessions, deterministic state transitions,
 * adaptive scaffolding rules, and session summaries with evidence tracking.
 */

import {
  TeacherSession,
  TeacherSessionState,
  TeacherChatMessage,
  LessonGoal,
} from '../types';
import { isDemoModeActive } from './storage';

const TEACHER_PREFIX = 'eta_teacher_';
const DEMO_TEACHER_PREFIX = 'eta_demo_teacher_';

function getPrefix() {
  return isDemoModeActive() ? DEMO_TEACHER_PREFIX : TEACHER_PREFIX;
}

// Valid state machine transitions
const ALLOWED_TRANSITIONS: Record<TeacherSessionState, TeacherSessionState[]> = {
  preparing: ['goalSetting', 'explaining', 'paused'],
  goalSetting: ['explaining', 'demonstrating', 'guidedPractice', 'paused'],
  explaining: ['demonstrating', 'guidedPractice', 'checkingUnderstanding', 'paused'],
  demonstrating: ['guidedPractice', 'independentPractice', 'explaining', 'paused'],
  guidedPractice: ['independentPractice', 'checkingUnderstanding', 'explaining', 'paused'],
  independentPractice: ['checkingUnderstanding', 'reviewing', 'guidedPractice', 'paused'],
  checkingUnderstanding: ['reviewing', 'summarizing', 'guidedPractice', 'paused'],
  reviewing: ['summarizing', 'independentPractice', 'completed', 'paused'],
  summarizing: ['completed', 'reviewing'],
  paused: [
    'preparing',
    'goalSetting',
    'explaining',
    'demonstrating',
    'guidedPractice',
    'independentPractice',
    'checkingUnderstanding',
    'reviewing',
    'summarizing',
    'completed',
  ],
  completed: ['preparing'], // can restart or review
};

export function validateStateTransition(
  current: TeacherSessionState,
  next: TeacherSessionState
): boolean {
  if (current === next) return true;
  const allowed = ALLOWED_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

// Seed sample Teacher session for Demo Mode
function seedDemoTeacherSession() {
  if (typeof localStorage === 'undefined') return;
  const prefix = DEMO_TEACHER_PREFIX;
  if (localStorage.getItem(prefix + 'seeded')) return;

  const sampleGoals: LessonGoal[] = [
    {
      id: 'goal_1',
      titleUz: "Present Simple'da I, you, we, they bilan fe'lning asosiy shaklini ishlatish",
      targetGrammarPoint: 'base_verb',
      isAchieved: true,
      evidenceCount: 2,
    },
    {
      id: 'goal_2',
      titleUz: "He, she, it uchun fe'lga -s yoki -es qo‘shimchasini to‘g‘ri qo‘shish",
      targetGrammarPoint: 'third_person_s',
      isAchieved: false,
      evidenceCount: 1,
    },
  ];

  const sampleMessages: TeacherChatMessage[] = [
    {
      id: 'msg_1',
      sender: 'teacher',
      text: "Assalomu alaykum! Bugungi darsimizda Present Simple (Oddiy hozirgi zamon) qoidalarini va he/she/it bilan fe'lga qo‘shiladigan -s qo‘shimchasini birgalikda o‘rganamiz. Tayyormisiz?",
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
    {
      id: 'msg_2',
      sender: 'user',
      text: "Ha, tayyorman ustoz! Boshladik.",
      timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
    },
    {
      id: 'msg_3',
      sender: 'teacher',
      text: "Ajoyib! Qoidani eslaymiz:\n• I, you, we, they olmoshlari bilan fe'l o‘zgarmaydi: \"I work every day.\"\n• Ammo he, she, it (uchinchi shaxs birlik) bilan fe'lga doimo -s yoki -es qo‘shiladi: \"He works in a hospital.\"\n\nKeling, sinab ko‘ramiz. Ushbu gapdagi bo‘sh joyni to‘ldiring:\n\"She ___ (speak) English very well.\"",
      timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      action: {
        type: 'askQuestion',
        titleUz: "Savol: To‘g‘ri fe'l shaklini tanlang",
        payload: {
          questionText: 'She ___ (speak) English very well.',
          options: ['speak', 'speaks', 'speaking'],
          correctAnswer: 'speaks',
          targetGrammar: 'thirdPersonSingular',
        },
      },
    },
  ];

  const sampleSession: TeacherSession = {
    id: 'sess_demo_present_simple',
    ownerId: 'usr_demo_01',
    module: 'grammar',
    entryPoint: 'today_lesson',
    currentState: 'guidedPractice',
    goals: sampleGoals,
    durationMinutes: 20,
    startedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
    relatedBookId: 'book_headway_elem_demo',
    relatedPageNumber: 7,
    relatedUnitId: 'unit_2',
    messages: sampleMessages,
    consecutiveCorrect: 1,
    consecutiveErrors: 0,
    revision: 1,
  };

  localStorage.setItem(prefix + 'active_session', JSON.stringify(sampleSession));
  localStorage.setItem(prefix + 'sessions', JSON.stringify([sampleSession]));
  localStorage.setItem(prefix + 'seeded', 'true');
}

try {
  seedDemoTeacherSession();
} catch (e) {
  console.warn('Could not seed demo teacher session', e);
}

const teacherMemoryStore: Record<string, string> = {};

function safeTeacherGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return teacherMemoryStore[key] || null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeTeacherSet(key: string, val: string): void {
  if (typeof localStorage === 'undefined') {
    teacherMemoryStore[key] = val;
    return;
  }
  try {
    localStorage.setItem(key, val);
  } catch {}
}

function safeTeacherRemove(key: string): void {
  if (typeof localStorage === 'undefined') {
    delete teacherMemoryStore[key];
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function getActiveTeacherSession(): TeacherSession | null {
  const raw = safeTeacherGet(getPrefix() + 'active_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveActiveTeacherSession(session: TeacherSession): void {
  const updated: TeacherSession = {
    ...session,
    updatedAt: new Date().toISOString(),
    revision: (session.revision || 1) + 1,
  };

  safeTeacherSet(getPrefix() + 'active_session', JSON.stringify(updated));

  // Also update list
  const allRaw = safeTeacherGet(getPrefix() + 'sessions');
  const all: TeacherSession[] = allRaw ? JSON.parse(allRaw) : [];
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  safeTeacherSet(getPrefix() + 'sessions', JSON.stringify(all));
}

export function clearActiveTeacherSession(): void {
  safeTeacherRemove(getPrefix() + 'active_session');
}

export function getAllTeacherSessions(): TeacherSession[] {
  const raw = safeTeacherGet(getPrefix() + 'sessions');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
