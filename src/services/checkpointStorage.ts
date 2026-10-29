/**
 * Checkpoint Storage Service (Part 3)
 * Manages unified learning checkpoints for book reading, exercises, audio, and teacher sessions.
 */

import { isDemoModeActive } from './storage';

export interface LearningCheckpoint {
  ownerId: string;
  bookId?: string;
  contentVersion?: number;
  unitId?: string;
  topicId?: string;
  pdfPageIndex?: number;
  printedPageLabel?: string;
  paragraphId?: string;
  exerciseId?: string;
  exerciseStep?: number;
  draftReference?: string;
  lastSubmissionId?: string;
  audioMappingId?: string;
  audioPositionSeconds?: number;
  teacherSessionId?: string;
  lessonPhase?: string;
  lastActivityAt: string;
  revision: number;
}

const CHECKPOINT_STORAGE_KEY = 'eta_learning_checkpoint_v1';
const DEMO_CHECKPOINT_STORAGE_KEY = 'eta_demo_learning_checkpoint_v1';

function getKey(): string {
  return isDemoModeActive() ? DEMO_CHECKPOINT_STORAGE_KEY : CHECKPOINT_STORAGE_KEY;
}

const checkpointMemoryStore: Record<string, LearningCheckpoint> = {};

export function getCheckpoint(ownerId: string): LearningCheckpoint | null {
  if (typeof localStorage === 'undefined') {
    return checkpointMemoryStore[ownerId] || null;
  }
  try {
    const raw = localStorage.getItem(`${getKey()}_${ownerId}`);
    if (!raw) return null;
    return JSON.parse(raw) as LearningCheckpoint;
  } catch {
    return null;
  }
}

export function saveCheckpoint(partial: Partial<LearningCheckpoint> & { ownerId: string }): LearningCheckpoint {
  const existing = getCheckpoint(partial.ownerId) || {
    ownerId: partial.ownerId,
    lastActivityAt: new Date().toISOString(),
    revision: 1,
  };

  const updated: LearningCheckpoint = {
    ...existing,
    ...partial,
    lastActivityAt: new Date().toISOString(),
    revision: (existing.revision || 1) + 1,
  };

  if (typeof localStorage === 'undefined') {
    checkpointMemoryStore[partial.ownerId] = updated;
    return updated;
  }

  try {
    localStorage.setItem(`${getKey()}_${partial.ownerId}`, JSON.stringify(updated));
  } catch {}

  return updated;
}
