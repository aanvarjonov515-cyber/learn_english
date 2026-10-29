/**
 * Learner Memory Storage Service (Stage 17)
 * Stores user preferences, verified learning goals, exercise-proven evidence,
 * and teacher hypotheses with full user review/edit/delete capabilities.
 */

import { LearnerMemoryItem, LearnerMemorySource, LearnerMemoryCategory } from '../types';
import { isDemoModeActive } from './storage';

const MEMORY_PREFIX = 'eta_learner_memory_';
const DEMO_MEMORY_PREFIX = 'eta_demo_learner_memory_';

function getPrefix(): string {
  return isDemoModeActive() ? DEMO_MEMORY_PREFIX : MEMORY_PREFIX;
}

const inMemoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return inMemoryStore[key] || null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, val: string): void {
  if (typeof localStorage === 'undefined') {
    inMemoryStore[key] = val;
    return;
  }
  try {
    localStorage.setItem(key, val);
  } catch {}
}

function seedDemoLearnerMemory(): void {
  const prefixes = [MEMORY_PREFIX, DEMO_MEMORY_PREFIX];
  for (const prefix of prefixes) {
    if (safeGet(prefix + 'seeded')) continue;

    const sampleItems: LearnerMemoryItem[] = [
      {
        id: 'mem_1',
        ownerId: 'usr_demo_01',
        summary: 'Kunlik 20 daqiqa o‘quv vaqt byudjeti va B1 darajaga erishish maqsadi',
        source: 'user_statement',
        category: 'preference',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'mem_2',
        ownerId: 'usr_demo_01',
        summary: 'Present Simple third-person -s/es va do/does farqini mustaqil tushuna oladi',
        source: 'exercise_evidence',
        category: 'exercise_evidence',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'mem_3',
        ownerId: 'usr_demo_01',
        summary: 'Lug‘at so‘zlarini gap ichida kontekstda o‘rganishni afzal ko‘radi',
        source: 'teacher_hypothesis',
        category: 'teacher_hypothesis',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ];

    safeSet(prefix + 'items', JSON.stringify(sampleItems));
    safeSet(prefix + 'seeded', 'true');
  }
}

try {
  seedDemoLearnerMemory();
} catch {}

export function getLearnerMemoryItems(): LearnerMemoryItem[] {
  const raw = safeGet(getPrefix() + 'items');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLearnerMemoryItem(
  item: Omit<LearnerMemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'> & {
    id?: string;
    ownerId?: string;
  }
): LearnerMemoryItem {
  const items = getLearnerMemoryItems();
  const now = new Date().toISOString();
  
  if (item.id) {
    const idx = items.findIndex((m) => m.id === item.id);
    if (idx >= 0) {
      items[idx] = {
        ...items[idx],
        ...item,
        updatedAt: now,
      };
      safeSet(getPrefix() + 'items', JSON.stringify(items));
      return items[idx];
    }
  }

  const newItem: LearnerMemoryItem = {
    id: item.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ownerId: item.ownerId || 'usr_demo_01',
    summary: item.summary,
    source: item.source,
    category: item.category,
    relatedEntityId: item.relatedEntityId,
    attemptId: item.attemptId,
    createdAt: now,
    updatedAt: now,
    expiresAt: item.expiresAt,
  };

  items.unshift(newItem);
  safeSet(getPrefix() + 'items', JSON.stringify(items));
  return newItem;
}

export function deleteLearnerMemoryItem(id: string): void {
  const items = getLearnerMemoryItems().filter((m) => m.id !== id);
  safeSet(getPrefix() + 'items', JSON.stringify(items));
}

export function getMemorySummaryForPrompt(): string {
  const items = getLearnerMemoryItems();
  if (items.length === 0) return 'No saved memory records.';
  
  return items
    .map((i) => `• [${i.category.toUpperCase()} / ${i.source}]: ${i.summary}`)
    .join('\n');
}
