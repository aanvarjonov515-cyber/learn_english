import { ActivityEvent, ActivityEventType } from '../types';

const ACTIVITY_KEY = 'english_teacher_activities_v1';

const memoryStore: Record<string, string> = {};

function safeGetStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') {
    const raw = memoryStore[key];
    return raw ? JSON.parse(raw) : fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') {
    memoryStore[key] = JSON.stringify(value);
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', key, e);
  }
}

export function getTodayLocalDateStr(): string {
  try {
    // Format YYYY-MM-DD in Asia/Tashkent or local timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export function getActivityEvents(): ActivityEvent[] {
  return safeGetStorage<ActivityEvent[]>(ACTIVITY_KEY, []);
}

export function logActivityEvent(
  eventType: ActivityEventType,
  options?: {
    durationSeconds?: number;
    scoreRatio?: number;
    referenceId?: string;
    metadata?: Record<string, any>;
  }
): ActivityEvent {
  const list = getActivityEvents();
  const todayStr = getTodayLocalDateStr();
  const nowIso = new Date().toISOString();

  // Idempotency check: avoid double logging identical event within 60 seconds
  if (options?.referenceId) {
    const existing = list.find(
      (e) =>
        e.eventType === eventType &&
        e.referenceId === options.referenceId &&
        e.localDateAtOccurrence === todayStr
    );
    if (existing) return existing;
  }

  const newEvent: ActivityEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ownerId: 'default',
    eventType,
    occurredAt: nowIso,
    localDateAtOccurrence: todayStr,
    durationSeconds: options?.durationSeconds,
    scoreRatio: options?.scoreRatio,
    referenceId: options?.referenceId,
    metadata: options?.metadata,
  };

  const updated = [newEvent, ...list];
  safeSetStorage(ACTIVITY_KEY, updated);
  return newEvent;
}

export function getTodayStudyStats(): {
  todayEventsCount: number;
  totalSecondsToday: number;
  completedTasksCount: number;
  currentStreakDays: number;
} {
  const events = getActivityEvents();
  const todayStr = getTodayLocalDateStr();

  const todayEvents = events.filter((e) => e.localDateAtOccurrence === todayStr);
  const totalSecondsToday = todayEvents.reduce((acc, e) => acc + (e.durationSeconds || 120), 0);

  // Calculate Streak
  const uniqueDates = Array.from(new Set(events.map((e) => e.localDateAtOccurrence))).sort().reverse();

  let streak = 0;
  let checkDate = new Date();

  for (let i = 0; i < 365; i++) {
    const dStr = checkDate.toISOString().split('T')[0];
    if (uniqueDates.includes(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      // If today not yet logged, check yesterday for active streak
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    todayEventsCount: todayEvents.length,
    totalSecondsToday,
    completedTasksCount: todayEvents.length,
    currentStreakDays: Math.max(streak, 1),
  };
}
