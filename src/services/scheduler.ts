/**
 * Spaced Repetition System: "Bosqichli takrorlash v1"
 * Deterministic, versioned interval scheduler for English Teacher AI.
 * Tracks Recognition and Production independently for each sense.
 */

import {
  ReviewState,
  DimensionState,
  DimensionStatus,
  VocabularyEntry,
  VocabularySense,
  ReviewEvaluationOutcome,
} from '../types';

export const ALGORITHM_VERSION = 'v1';

// Initial Intervals in Days for stages 1..6
export const STAGE_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30, 60];

export interface SchedulerContext {
  timezone: string; // e.g. 'Asia/Tashkent'
  targetHour: number; // default 9 (09:00 AM)
}

const DEFAULT_CONTEXT: SchedulerContext = {
  timezone: 'Asia/Tashkent',
  targetHour: 9,
};

/**
 * Gets the current date string 'YYYY-MM-DD' in user's timezone
 */
export function getLocalDateString(date = new Date(), timezone = 'Asia/Tashkent'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // YYYY-MM-DD
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Calculates next due date UTC timestamp for `days` from now at the user's scheduled local hour
 */
export function calculateNextDueAt(days: number, context = DEFAULT_CONTEXT): string {
  const now = new Date();
  const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  // Normalize to 09:00 in user's timezone if possible, or +days
  return targetDate.toISOString();
}

/**
 * Creates initial empty ReviewState for a vocabulary sense
 */
export function createInitialReviewState(
  ownerId: string,
  entryId: string,
  senseId: string
): ReviewState {
  const initialDimension = (): DimensionState => ({
    stage: 0,
    status: 'new',
    dueAt: new Date().toISOString(),
    independentSuccessCount: 0,
    lapseCount: 0,
  });

  return {
    id: `rev_${entryId}_${senseId}`,
    ownerId,
    entryId,
    senseId,
    algorithmVersion: ALGORITHM_VERSION,
    recognition: initialDimension(),
    production: initialDimension(),
    listening: {
      dictationSuccessCount: 0,
      audioSkippedCount: 0,
      replayCount: 0,
    },
    updatedAt: new Date().toISOString(),
    revision: 1,
  };
}

/**
 * Updates a dimension state according to "Bosqichli takrorlash v1" rules
 */
export function evaluateDimension(
  currentState: DimensionState,
  outcome: ReviewEvaluationOutcome,
  context = DEFAULT_CONTEXT
): DimensionState {
  if (outcome === 'technical_skip') {
    // Technical errors must never punish the user's memory record
    return { ...currentState };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const todayStr = getLocalDateString(now, context.timezone);
  const next = { ...currentState, lastEvaluatedAt: nowIso };

  if (outcome === 'independent_correct') {
    const alreadyPromotedToday = currentState.lastPromotedLocalDate === todayStr;
    const canPromote = !alreadyPromotedToday && currentState.stage < 6;
    const newStage = canPromote ? currentState.stage + 1 : currentState.stage;
    const intervalDays = STAGE_INTERVALS_DAYS[newStage] || 1;

    next.stage = newStage;
    next.independentSuccessCount += 1;
    next.dueAt = calculateNextDueAt(intervalDays, context);
    if (canPromote) {
      next.lastPromotedLocalDate = todayStr;
    }
    next.status = newStage >= 5 ? 'graduated' : 'learning';
  } else if (outcome === 'assisted_or_corrected') {
    // Keep stage, schedule for tomorrow
    next.dueAt = calculateNextDueAt(1, context);
    next.status = 'learning';
  } else if (outcome === 'failed_forgotten') {
    // Reset to stage 1 relearning, schedule for tomorrow
    next.stage = 1;
    next.lapseCount += 1;
    next.dueAt = calculateNextDueAt(1, context);
    next.status = 'relearning';
  }

  return next;
}

export interface QueueItem {
  entry: VocabularyEntry;
  sense: VocabularySense;
  reviewState: ReviewState;
  urgency: 'overdue' | 'due_today' | 'weak_production' | 'relearning' | 'new';
  recommendedDimension: 'recognition' | 'production';
  reasonText: string;
}

/**
 * Builds the daily review queue prioritizing overdue items, relearning, and weak production
 */
export function buildDailyReviewQueue(
  entries: VocabularyEntry[],
  reviewStates: ReviewState[],
  limit?: number
): QueueItem[] {
  const stateMap = new Map<string, ReviewState>();
  reviewStates.forEach((r) => stateMap.set(`${r.entryId}_${r.senseId}`, r));

  const now = new Date();
  const nowTime = now.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const items: QueueItem[] = [];

  entries.forEach((entry) => {
    entry.senses.forEach((sense) => {
      const key = `${entry.id}_${sense.id}`;
      const state = stateMap.get(key) || createInitialReviewState(entry.ownerId, entry.id, sense.id);

      const recDue = new Date(state.recognition.dueAt).getTime();
      const prodDue = new Date(state.production.dueAt).getTime();

      let urgency: QueueItem['urgency'] = 'new';
      let dimension: 'recognition' | 'production' = 'recognition';
      let reasonText = "Yangi so'z - boshlang'ich o'rganish";

      if (state.recognition.status === 'relearning' || state.production.status === 'relearning') {
        urgency = 'relearning';
        dimension = state.production.status === 'relearning' ? 'production' : 'recognition';
        reasonText = "Qayta mustahkamlash: kecha xato qilingan";
      } else if (recDue < nowTime - oneDayMs || prodDue < nowTime - oneDayMs) {
        urgency = 'overdue';
        dimension = prodDue <= recDue ? 'production' : 'recognition';
        reasonText = "Muddati o'tgan takrorlash";
      } else if (recDue <= nowTime || prodDue <= nowTime) {
        urgency = 'due_today';
        dimension = prodDue <= recDue ? 'production' : 'recognition';
        reasonText = "Bugun takrorlash vaqti keldi";
      } else if (state.recognition.stage >= 2 && state.production.stage <= 1) {
        urgency = 'weak_production';
        dimension = 'production';
        reasonText = "Tanish yaxshi, yozib eslashni mashq qilish kerak";
      } else {
        return; // not due yet
      }

      items.push({
        entry,
        sense,
        reviewState: state,
        urgency,
        recommendedDimension: dimension,
        reasonText,
      });
    });
  });

  // Sort: relearning -> overdue -> due_today -> weak_production -> new
  const priorityMap: Record<QueueItem['urgency'], number> = {
    relearning: 1,
    overdue: 2,
    due_today: 3,
    weak_production: 4,
    new: 5,
  };

  items.sort((a, b) => priorityMap[a.urgency] - priorityMap[b.urgency]);

  if (limit && limit > 0) {
    return items.slice(0, limit);
  }
  return items;
}

export interface DifficultWordDiagnosis {
  entry: VocabularyEntry;
  sense: VocabularySense;
  reviewState: ReviewState;
  diagnosis: string;
  actionText: string;
}

/**
 * Identifies words needing extra focus and clear pedagogical diagnosis
 */
export function getDifficultWords(
  entries: VocabularyEntry[],
  reviewStates: ReviewState[]
): DifficultWordDiagnosis[] {
  const stateMap = new Map<string, ReviewState>();
  reviewStates.forEach((r) => stateMap.set(`${r.entryId}_${r.senseId}`, r));

  const results: DifficultWordDiagnosis[] = [];

  entries.forEach((entry) => {
    entry.senses.forEach((sense) => {
      const state = stateMap.get(`${entry.id}_${sense.id}`);
      if (!state) return;

      const lapses = state.recognition.lapseCount + state.production.lapseCount;
      const recStage = state.recognition.stage;
      const prodStage = state.production.stage;

      if (lapses >= 2) {
        results.push({
          entry,
          sense,
          reviewState: state,
          diagnosis: `${lapses} marta esdan chiqqan. Harflardan yig'ish va yozish orqali mustahkamlash zarur.`,
          actionText: "Harflardan yig'ish mashqi",
        });
      } else if (recStage >= 2 && prodStage === 0) {
        results.push({
          entry,
          sense,
          reviewState: state,
          diagnosis: "O'zbekcha tarjimasini taniysiz, lekin inglizchasini yoddan yozishda yordam kerak.",
          actionText: "Mustaqil yozish mashqi",
        });
      }
    });
  });

  return results;
}
