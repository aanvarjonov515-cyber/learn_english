/**
 * Integrated Daily Homework Storage Service (Stage 18)
 * Manages daily homework assignments, items, submissions, evaluation status routing,
 * Versioned resubmissions, deferrals, and login-time homework status updates.
 */

import {
  HomeworkAssignment,
  HomeworkAssignmentStatus,
  HomeworkItem,
  HomeworkSubmission,
  HomeworkEvaluationStatus,
  CanonicalRuleId,
} from '../types';
import { isDemoModeActive } from './storage';

const HW_PREFIX = 'eta_homework_';
const DEMO_HW_PREFIX = 'eta_demo_homework_';

function getPrefix(): string {
  return isDemoModeActive() ? DEMO_HW_PREFIX : HW_PREFIX;
}

const hwMemoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return hwMemoryStore[key] || null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, val: string): void {
  if (typeof localStorage === 'undefined') {
    hwMemoryStore[key] = val;
    return;
  }
  try {
    localStorage.setItem(key, val);
  } catch {}
}

function seedDemoHomework(): void {
  const prefixes = [HW_PREFIX, DEMO_HW_PREFIX];
  for (const prefix of prefixes) {
    if (safeGet(prefix + 'seeded')) continue;

    const sampleAssignment: HomeworkAssignment = {
      id: 'hw_demo_today',
      ownerId: 'usr_demo_01',
      title: 'Present Simple va Kunlik Muloqot Mashqlari',
      instruction: 'Bugungi darsda o‘rgangan do/does va uchinchi shaxs -s qo‘shimchalarini amalda qo‘llang.',
      learningObjectives: ['Present Simple affirmative -s/-es', 'Do vs Does in questions'],
      relatedEntityIds: ['unit_2', 'book_headway_elem_demo'],
      assignedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      timezoneAtAssignment: 'Asia/Tashkent',
      estimatedMinutes: 15,
      status: 'assigned',
      assignmentVersion: 1,
      items: [
        {
          id: 'hwi_1',
          assignmentId: 'hw_demo_today',
          type: 'grammar',
          instruction: 'Qavs ichidagi fe’lni to‘g‘ri shaklda yozing: "She ___ (work) in a hospital."',
          required: true,
          evaluationMethod: 'deterministic',
          status: 'pending',
          targetRule: 'thirdPersonSingular',
          questionData: {
            questionText: 'She ___ (work) in a hospital.',
            options: ['work', 'works', 'working'],
            correctAnswer: 'works',
          },
        },
        {
          id: 'hwi_2',
          assignmentId: 'hw_demo_today',
          type: 'grammar',
          instruction: 'To‘g‘ri so‘roq so‘zini tanlang: "___ he speak English?"',
          required: true,
          evaluationMethod: 'deterministic',
          status: 'pending',
          targetRule: 'doDoes',
          questionData: {
            questionText: '___ he speak English?',
            options: ['Do', 'Does', 'Is'],
            correctAnswer: 'Does',
          },
        },
        {
          id: 'hwi_3',
          assignmentId: 'hw_demo_today',
          type: 'writing',
          instruction: 'O‘zingizning kunlik rejangiz haqida Present Simple da 3 ta gap yozing.',
          required: false,
          evaluationMethod: 'ai_schema',
          status: 'pending',
          targetRule: 'thirdPersonSingular',
          questionData: {
            promptEn: 'Write 3 short sentences in Present Simple about your daily routine.',
          },
        },
      ],
    };

    safeSet(prefix + 'assignments', JSON.stringify([sampleAssignment]));
    safeSet(prefix + 'seeded', 'true');
  }
}

try {
  seedDemoHomework();
} catch {}

export function getAllHomeworkAssignments(): HomeworkAssignment[] {
  const raw = safeGet(getPrefix() + 'assignments');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getHomeworkAssignmentById(id: string): HomeworkAssignment | null {
  const all = getAllHomeworkAssignments();
  return all.find((a) => a.id === id) || null;
}

export function saveHomeworkAssignment(assignment: HomeworkAssignment): void {
  const all = getAllHomeworkAssignments();
  const idx = all.findIndex((a) => a.id === assignment.id);
  if (idx >= 0) {
    all[idx] = assignment;
  } else {
    all.unshift(assignment);
  }
  safeSet(getPrefix() + 'assignments', JSON.stringify(all));
}

export function updateHomeworkStatus(
  assignmentId: string,
  newStatus: HomeworkAssignmentStatus
): void {
  const assignment = getHomeworkAssignmentById(assignmentId);
  if (assignment) {
    assignment.status = newStatus;
    saveHomeworkAssignment(assignment);
  }
}

export function deferHomeworkAssignment(assignmentId: string, newDueDateISO: string): void {
  const assignment = getHomeworkAssignmentById(assignmentId);
  if (assignment) {
    assignment.dueAt = newDueDateISO;
    assignment.status = 'deferred';
    saveHomeworkAssignment(assignment);
  }
}

export function simplifyHomeworkAssignment(assignmentId: string): void {
  const assignment = getHomeworkAssignmentById(assignmentId);
  if (assignment) {
    // Keep only required items & halve estimated time
    assignment.items = assignment.items.filter((i) => i.required);
    assignment.estimatedMinutes = Math.max(5, Math.floor(assignment.estimatedMinutes / 2));
    assignment.assignmentVersion += 1;
    saveHomeworkAssignment(assignment);
  }
}

export function getAllSubmissions(): HomeworkSubmission[] {
  const raw = safeGet(getPrefix() + 'submissions');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function submitHomeworkItemAnswer(
  assignmentId: string,
  itemId: string,
  userAnswerText: string,
  idempotencyKey?: string
): HomeworkSubmission {
  const submissions = getAllSubmissions();
  const key = idempotencyKey || `sub_${assignmentId}_${itemId}_${Date.now()}`;

  // Check idempotency
  const existing = submissions.find((s) => s.idempotencyKey === key);
  if (existing) return existing;

  const assignment = getHomeworkAssignmentById(assignmentId);
  const item = assignment?.items.find((i) => i.id === itemId);

  const prevSubmissions = submissions.filter((s) => s.assignmentId === assignmentId && s.itemId === itemId);
  const newVersion = prevSubmissions.length + 1;

  let evaluationStatus: HomeworkEvaluationStatus = 'pending';
  let isCorrect = false;
  let feedbackSummary = '';

  if (item?.evaluationMethod === 'deterministic') {
    evaluationStatus = 'graded';
    const correctAns = item.questionData?.correctAnswer?.trim().toLowerCase();
    const userAns = userAnswerText.trim().toLowerCase();
    isCorrect = userAns === correctAns;

    if (isCorrect) {
      feedbackSummary = 'To‘g‘ri! Barakalla.';
    } else {
      feedbackSummary = `Xato. To‘g‘ri javob: "${item.questionData?.correctAnswer}".`;
    }
  } else {
    // For AI schema, set checking status
    evaluationStatus = 'checking';
    feedbackSummary = 'Ustoz javobingizni tahlil qilmoqda...';
  }

  const submission: HomeworkSubmission = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ownerId: 'usr_demo_01',
    assignmentId,
    itemId,
    submissionVersion: newVersion,
    responseReference: userAnswerText,
    submittedAt: new Date().toISOString(),
    evaluationStatus,
    feedbackSummaryUz: feedbackSummary,
    idempotencyKey: key,
  };

  submissions.unshift(submission);
  safeSet(getPrefix() + 'submissions', JSON.stringify(submissions));

  // Update item status
  if (assignment && item) {
    item.status = isCorrect ? 'completed' : item.evaluationMethod === 'deterministic' ? 'needs_revision' : 'pending';
    
    // Check if all items in assignment completed
    const allItemsCompleted = assignment.items.every((i) => i.status === 'completed');
    const anyNeedsRevision = assignment.items.some((i) => i.status === 'needs_revision');

    if (allItemsCompleted) {
      assignment.status = 'completed';
    } else if (anyNeedsRevision) {
      assignment.status = 'needsRevision';
    } else {
      assignment.status = 'inProgress';
    }
    saveHomeworkAssignment(assignment);
  }

  return submission;
}

export function checkDailyHomeworkOnLogin(): {
  activeHomeworksCount: number;
  dueTodayCount: number;
  noticeMessageUz: string;
} {
  const all = getAllHomeworkAssignments();
  const now = new Date();
  
  const active = all.filter((a) => a.status === 'assigned' || a.status === 'inProgress' || a.status === 'needsRevision');
  const dueToday = active.filter((a) => new Date(a.dueAt).getTime() <= now.getTime() + 86400000);

  return {
    activeHomeworksCount: active.length,
    dueTodayCount: dueToday.length,
    noticeMessageUz: 'Ilovaga kirganingizda vazifalar holati va natijalari yangilanadi.',
  };
}
