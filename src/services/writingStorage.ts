/**
 * English Teacher AI - Daily Writing Storage
 * Manages WritingTask, immutable WritingSubmission snapshots,
 * revision linkages, and recurring error taxonomy aggregation.
 */

import {
  WritingTask,
  WritingSubmission,
  RecurringErrorStat,
  CanonicalRuleId,
} from '../types';
import { isDemoModeActive } from './storage';

const WRITING_PREFIX = 'eta_writing_';
const DEMO_WRITING_PREFIX = 'eta_demo_writing_';

function getPrefix() {
  return isDemoModeActive() ? DEMO_WRITING_PREFIX : WRITING_PREFIX;
}

// Seed sample writing tasks and submissions for Demo Mode
function seedDemoWritingData() {
  if (typeof localStorage === 'undefined') return;
  const prefix = DEMO_WRITING_PREFIX;
  if (localStorage.getItem(prefix + 'seeded')) return;

  const sampleTasks: WritingTask[] = [
    {
      id: 'task_daily_routine',
      ownerId: 'usr_demo_01',
      title: 'Mening Kundalik Hayotim va Odatlarim',
      instructionUz:
        'Kundalik hayotingiz haqida 5–7 ta gap yozing. O‘zingiz haqingizda va oila a’zongiz yoki do‘stingiz haqida kamida 2 ta gap yozing. Present Simple zamonidagi fe’llarga va -s qo‘shimchasiga e’tibor bering.',
      promptEn: 'Describe your daily routine and what someone in your family does every day.',
      targetLevel: 'A2',
      targetGrammarPoints: [
        'Present Simple base verb (I/you/we/they)',
        'Third-person singular -s/-es (he/she/it)',
      ],
      suggestedVocabulary: [
        'wake up',
        'have breakfast',
        'start work',
        'cook dinner',
        'read a book',
      ],
      suggestedLength: 45,
      lengthUnit: 'words',
      requiredElements: [
        'O‘zingiz haqingizda kamida 2 ta gap',
        'Boshqa inson (he/she) haqida kamida 2 ta gap',
      ],
      optionalElements: ['Vaqt ifodalari (at 7:00, in the evening, every day)'],
      sourceReferences: [
        {
          sourceType: 'teacher_session',
          sourceId: 'sess_demo_present_simple',
          sourceTitle: 'Present Simple Oddiy Hozirgi Zamon Darsi',
        },
      ],
      supportLevel: 'learning_standard',
      createdAt: new Date().toISOString(),
      status: 'drafting',
      scaffolding: {
        suggestedPlan: [
          '1. Ertalab soat nechada uyg‘onasiz?',
          '2. Ish yoki o‘qishga qachon borasiz?',
          '3. Do‘stingiz yoki oila a’zongiz nima ish qiladi?',
          '4. Kechqurun nima bilan shug‘ullanasiz?',
        ],
        guidingQuestions: [
          'What time do you wake up every morning?',
          'What does your friend or brother do during the day?',
          'When do you have dinner?',
        ],
        starterPhrases: [
          'Every morning, I get up at...',
          'My brother works at a...',
          'In the evening, we usually...',
        ],
        sampleVocab: [
          { en: 'get up', uz: 'uyg‘onmoq / o‘rindan turmoq' },
          { en: 'leave home', uz: 'uydan chiqmoq' },
          { en: 'relax', uz: 'dam olmoq' },
        ],
      },
    },
    {
      id: 'task_directions_city',
      ownerId: 'usr_demo_01',
      title: 'Shaharda Yo‘l Ko‘rsatish va Joylar',
      instructionUz:
        'Listening darsidagi 3.23 trekka asoslanib, sayyohga shahar markazidagi biror joyga borish yo‘lini tushuntirib bering.',
      promptEn: 'Write 4-5 sentences giving directions to a famous spot in your city.',
      targetLevel: 'A2',
      targetGrammarPoints: ['Imperatives for directions', 'Prepositions of place'],
      suggestedVocabulary: ['turn left', 'go straight', 'opposite', 'next to'],
      suggestedLength: 35,
      lengthUnit: 'words',
      requiredElements: ["Kamida 2 ta yo'nalish ko'rsatmasi"],
      optionalElements: ["Joy nomi (museum, park, bank)"],
      sourceReferences: [
        {
          sourceType: 'listening',
          sourceId: 'aud_track_3_23',
          sourceTitle: 'Unit 3: Asking for Directions',
        },
      ],
      supportLevel: 'learning_standard',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      status: 'completed',
    },
  ];

  const sampleSubmission: WritingSubmission = {
    id: 'sub_demo_routine_v1',
    ownerId: 'usr_demo_01',
    taskId: 'task_daily_routine',
    originalText:
      'I wake up at seven oclock every morning. I eat eggs and drink tea. My brother go to university by bus. He study computer science. In the evening, we watch movies together.',
    wordCount: 31,
    sentenceCount: 5,
    revisionNumber: 1,
    contentHash: 'hash_sub_v1',
    targetGrammarSnapshot: ['Present Simple', 'thirdPersonSingular'],
    supportUsed: {
      hintsRevealed: false,
      modelAnswerViewed: false,
      scaffoldingOpened: true,
    },
    submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    feedbackStatus: 'reviewed',
    feedback: {
      feedbackVersion: 1,
      summaryUz:
        "Matningiz tushunarli va topshiriq maqsadiga mos yozilgan. Faqat uchinchi shaxs birlikda (he) fe'lga -s qo‘shilishida kichik grammatik xatolik kuzatildi.",
      overallAssessment: 'partially_achieved',
      strengths: [
        'O‘zingiz haqingizda I olmoshi bilan gaplar to‘g‘ri tuzilgan ("I wake up", "I eat").',
        'Fikrlar ketma-ketligi va so‘zlar tanlovi kundalik hayotga mos.',
      ],
      issues: [
        {
          issueId: 'iss_1',
          category: 'target_grammar',
          severity: 'error',
          originalSpan: 'My brother go',
          startOffset: 67,
          endOffset: 80,
          explanationUz:
            "My brother (he) uchinchi shaxs bo‘lgani sababli oddiy hozirgi zamonda fe'lga -es qo‘shiladi: \"goes\".",
          suggestedCorrection: 'My brother goes',
          targetRule: 'thirdPersonSingular',
          isTargetGrammar: true,
        },
        {
          issueId: 'iss_2',
          category: 'target_grammar',
          severity: 'error',
          originalSpan: 'He study',
          startOffset: 104,
          endOffset: 112,
          explanationUz:
            "\"study\" fe'li he olmoshi bilan \"studies\" ko‘rinishida yoziladi (y harfi i ga aylanadi va -es qo‘shiladi).",
          suggestedCorrection: 'He studies',
          targetRule: 'thirdPersonSingular',
          isTargetGrammar: true,
        },
      ],
      nextStepUz:
        "Uchinchi shaxs (he/she) bilan kelgan \"go\" va \"study\" fe'llarini tuzatib, matnni qayta tekshirishga yuboring.",
      fullExemplarCorrection:
        'I wake up at seven o\'clock every morning. I eat eggs and drink tea. My brother goes to university by bus. He studies computer science. In the evening, we watch movies together.',
      followUpTransferTask: {
        titleUz: 'Mustaqil transfer vazifasi',
        instructionUz: 'Do‘stingizning odatlari haqida 2 ta yangi gap yozing.',
        promptEn: 'Write 2 sentences about what your friend does every day.',
      },
      reviewedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
  };

  const sampleRecurringErrors: RecurringErrorStat[] = [
    {
      ruleId: 'thirdPersonSingular',
      ruleNameUz: "He/She/It fe'llariga -s/-es qo‘shish",
      occurrenceCount: 2,
      independentCorrectCount: 3,
      lastObservedDate: new Date().toISOString(),
      sampleExplanationsUz: [
        'My brother goes (My brother go emas)',
        'He studies (He study emas)',
      ],
    },
  ];

  localStorage.setItem(prefix + 'tasks', JSON.stringify(sampleTasks));
  localStorage.setItem(prefix + 'submissions', JSON.stringify([sampleSubmission]));
  localStorage.setItem(prefix + 'recurring_errors', JSON.stringify(sampleRecurringErrors));
  localStorage.setItem(prefix + 'seeded', 'true');
}

try {
  seedDemoWritingData();
} catch (e) {
  console.warn('Could not seed demo writing data', e);
}

const writingMemoryStore: Record<string, string> = {};

function safeWritingGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return writingMemoryStore[key] || null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWritingSet(key: string, val: string): void {
  if (typeof localStorage === 'undefined') {
    writingMemoryStore[key] = val;
    return;
  }
  try {
    localStorage.setItem(key, val);
  } catch {}
}

export function getWritingTasks(): WritingTask[] {
  const raw = safeWritingGet(getPrefix() + 'tasks');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getWritingTaskById(id: string): WritingTask | undefined {
  return getWritingTasks().find((t) => t.id === id);
}

export function saveWritingTask(task: WritingTask): void {
  const all = getWritingTasks();
  const idx = all.findIndex((t) => t.id === task.id);
  if (idx >= 0) {
    all[idx] = task;
  } else {
    all.push(task);
  }
  safeWritingSet(getPrefix() + 'tasks', JSON.stringify(all));
}

export function getWritingSubmissions(taskId?: string): WritingSubmission[] {
  const raw = safeWritingGet(getPrefix() + 'submissions');
  if (!raw) return [];
  try {
    const list: WritingSubmission[] = JSON.parse(raw);
    if (taskId) {
      return list.filter((s) => s.taskId === taskId);
    }
    return list;
  } catch {
    return [];
  }
}

export function getSubmissionById(id: string): WritingSubmission | undefined {
  return getWritingSubmissions().find((s) => s.id === id);
}

export function saveWritingSubmission(submission: WritingSubmission): void {
  const all = getWritingSubmissions();
  const idx = all.findIndex((s) => s.id === submission.id);
  if (idx >= 0) {
    all[idx] = submission;
  } else {
    all.push(submission);
  }
  safeWritingSet(getPrefix() + 'submissions', JSON.stringify(all));

  // If submission has reviewed feedback, update recurring error stats
  if (submission.feedback && submission.feedback.issues) {
    submission.feedback.issues.forEach((issue) => {
      recordRecurringError(
        issue.targetRule,
        issue.targetRule === 'thirdPersonSingular'
          ? "He/She/It fe'llariga -s/-es qo‘shish"
          : issue.targetRule,
        issue.explanationUz
      );
    });
  }
}

export function getRecurringErrors(): RecurringErrorStat[] {
  const raw = safeWritingGet(getPrefix() + 'recurring_errors');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordRecurringError(
  ruleId: CanonicalRuleId,
  ruleNameUz: string,
  explanationUz: string
): void {
  const all = getRecurringErrors();
  const idx = all.findIndex((r) => r.ruleId === ruleId);

  if (idx >= 0) {
    all[idx].occurrenceCount += 1;
    all[idx].lastObservedDate = new Date().toISOString();
    if (!all[idx].sampleExplanationsUz.includes(explanationUz)) {
      all[idx].sampleExplanationsUz.unshift(explanationUz);
      all[idx].sampleExplanationsUz = all[idx].sampleExplanationsUz.slice(0, 3);
    }
  } else {
    all.push({
      ruleId,
      ruleNameUz,
      occurrenceCount: 1,
      independentCorrectCount: 0,
      lastObservedDate: new Date().toISOString(),
      sampleExplanationsUz: [explanationUz],
    });
  }

  safeWritingSet(getPrefix() + 'recurring_errors', JSON.stringify(all));
}
