/**
 * Storage Service for English Teacher AI
 * Manages user profile, settings, collections, sections, entries, review states, and documents.
 * Ensures strict separation between Demo Mode and Real User data.
 */

import {
  UserProfile,
  UserSettings,
  VocabularyCollection,
  VocabularySection,
  VocabularyEntry,
  ReviewState,
  ReadingDocument,
  ExerciseAttempt,
  SaveState,
} from '../types';

const REAL_STORAGE_PREFIX = 'eta_user_';
const DEMO_STORAGE_PREFIX = 'eta_demo_';
const DEMO_MODE_FLAG = 'eta_demo_mode_active';

type StorageListener = (state: SaveState) => void;
const saveListeners: Set<StorageListener> = new Set();

export function onSaveStateChange(listener: StorageListener) {
  saveListeners.add(listener);
  return () => {
    saveListeners.delete(listener);
  };
}

function notifySaveState(state: SaveState) {
  saveListeners.forEach((fn) => fn(state));
}

export function isDemoModeActive(): boolean {
  try {
    return localStorage.getItem(DEMO_MODE_FLAG) === 'true';
  } catch {
    return false;
  }
}

export function setDemoModeActive(active: boolean) {
  try {
    localStorage.setItem(DEMO_MODE_FLAG, active ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to set demo mode flag', e);
  }
}

function getPrefix(): string {
  return isDemoModeActive() ? DEMO_STORAGE_PREFIX : REAL_STORAGE_PREFIX;
}

// Default settings
export const DEFAULT_SETTINGS: UserSettings = {
  dailyStudyMinutes: 20,
  dailyNewWordTarget: 10,
  preferredAccent: 'us',
  readerFontSize: 'base',
  readerTheme: 'warm',
  reduceMotion: false,
  autoPlayMappedAudio: false,
  teacherVoiceProvider: 'gemini_tts',
  teacherVoiceId: 'Kore',
  teacherVoiceGender: 'female',
  teacherSpeechRate: 1.0,
  teacherAutoSpeak: true,
};

export const DEFAULT_PROFILE: UserProfile = {
  id: 'usr_real_01',
  displayName: "O'quvchi",
  nativeLanguage: 'uz',
  estimatedLevel: 'A2',
  timezone: 'Asia/Tashkent',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isOnboarded: false,
};

export const DEMO_PROFILE: UserProfile = {
  id: 'usr_demo_01',
  displayName: 'Namuna Foydalanuvchi',
  nativeLanguage: 'uz',
  estimatedLevel: 'B1',
  timezone: 'Asia/Tashkent',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isOnboarded: true,
};

// Seed sample data for Demo mode
function seedDemoData() {
  if (typeof localStorage === 'undefined') return;
  const prefix = DEMO_STORAGE_PREFIX;
  if (localStorage.getItem(prefix + 'seeded')) return;

  const collectionId = 'col_demo_40_essential';
  const sectionId = 'sec_demo_01';

  const sampleEntries: VocabularyEntry[] = [
    {
      id: 'entry_demo_01',
      ownerId: 'usr_demo_01',
      collectionId,
      surfaceForm: 'look after',
      lemma: 'look after',
      partOfSpeech: 'phrasal verb',
      senses: [
        {
          id: 'sn_01',
          translationUz: "g'amxo'rlik qilmoq, qarab turmoq",
          definitionEn: 'to take care of someone or something',
          exampleEn: 'She looks after her younger brother on weekends.',
          exampleUz: "U dam olish kunlari ukasiga g'amxo'rlik qiladi.",
          verificationStatus: 'user_reviewed',
        },
      ],
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    },
    {
      id: 'entry_demo_02',
      ownerId: 'usr_demo_01',
      collectionId,
      surfaceForm: 'bank',
      lemma: 'bank',
      partOfSpeech: 'noun',
      senses: [
        {
          id: 'sn_02_1',
          translationUz: "daryo qirg'og'i",
          definitionEn: 'the land alongside or sloping down to a river or lake',
          exampleEn: 'We sat on the grassy bank of the river and had lunch.',
          exampleUz: "Biz daryoning maysazor qirg'og'ida o'tirib tushlik qildik.",
          context: 'nature, river',
          verificationStatus: 'user_reviewed',
        },
        {
          id: 'sn_02_2',
          translationUz: 'bank (moliya muassasasi)',
          definitionEn: 'a financial establishment that uses money deposited by customers',
          exampleEn: 'I need to go to the bank to deposit this check.',
          exampleUz: "Ushbu chekni topshirish uchun bankka borishim kerak.",
          context: 'finance',
          verificationStatus: 'user_reviewed',
        },
      ],
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    },
    {
      id: 'entry_demo_03',
      ownerId: 'usr_demo_01',
      collectionId,
      surfaceForm: 'take a break',
      lemma: 'take a break',
      partOfSpeech: 'idiom / phrase',
      senses: [
        {
          id: 'sn_03',
          translationUz: "tanaffus qilmoq, dam olmoq",
          definitionEn: 'to pause or stop an activity temporarily',
          exampleEn: "You have been studying for four hours; take a break!",
          exampleUz: "To'rt soatdan beri dars qilyapsiz, biroz dam oling!",
          verificationStatus: 'user_reviewed',
        },
      ],
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    },
    {
      id: 'entry_demo_04',
      ownerId: 'usr_demo_01',
      collectionId,
      surfaceForm: 'curious',
      lemma: 'curious',
      partOfSpeech: 'adjective',
      senses: [
        {
          id: 'sn_04',
          translationUz: "qiziquvchan, bilishga intiluvchan",
          definitionEn: 'eager to know or learn something',
          exampleEn: 'Babies are naturally curious about everything around them.',
          exampleUz: "Kichik bolalar atrofidagi hamma narsaga tabiiy qiziquvchan bo'ladi.",
          verificationStatus: 'user_reviewed',
        },
      ],
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    },
    {
      id: 'entry_demo_05',
      ownerId: 'usr_demo_01',
      collectionId,
      surfaceForm: 'improve',
      lemma: 'improve',
      partOfSpeech: 'verb',
      senses: [
        {
          id: 'sn_05',
          translationUz: "yaxshilamoq, rivojlantirmoq",
          definitionEn: 'make or become better',
          exampleEn: 'Daily reading will significantly improve your vocabulary.',
          exampleUz: "Har kungi mutolaa so'z boyligingizni sezilarli yaxshilaydi.",
          verificationStatus: 'user_reviewed',
        },
      ],
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    },
    {
      id: 'entry_demo_06',
      ownerId: 'usr_demo_01',
      collectionId,
      surfaceForm: 'opportunity',
      lemma: 'opportunity',
      partOfSpeech: 'noun',
      senses: [
        {
          id: 'sn_06',
          translationUz: "imkoniyat, qulay fursat",
          definitionEn: 'a set of circumstances that makes it possible to do something',
          exampleEn: 'Studying abroad is a great opportunity to learn a language.',
          exampleUz: "Chet elda o'qish til o'rganish uchun ajoyib imkoniyatdir.",
          verificationStatus: 'user_reviewed',
        },
      ],
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  ];

  const sampleCollection: VocabularyCollection = {
    id: collectionId,
    ownerId: 'usr_demo_01',
    title: 'Kundalik Zarur So’zlar (Namuna)',
    description: 'Eng faol ishlatiladigan iboralar va ko’p ma’noli so’zlar to’plami.',
    sectionSize: 40,
    entryCount: sampleEntries.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleSection: VocabularySection = {
    id: sectionId,
    ownerId: 'usr_demo_01',
    collectionId,
    title: '1-Bo’lim: Boshlang’ich Zarur So’zlar',
    position: 1,
    entryIds: sampleEntries.map((e) => e.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleDoc: ReadingDocument = {
    id: 'doc_demo_01',
    ownerId: 'usr_demo_01',
    title: 'The River Bank and the City Traveler',
    author: 'English Teacher AI Stories',
    estimatedLevel: 'A2',
    notes: 'Ushbu hikoyada bank so’zining turli kontekstdagi ma’nolari va iboralar berilgan.',
    text: `Anvar arrived in the quiet valley just as the morning sun broke through the clouds. He was tired after a long journey from Tashkent, and decided to take a break near the stream.

He sat on the grassy bank of the river, watching the silver fish glide beneath the clear water. The gentle breeze felt refreshing. Beside him, an elderly local shepherd was watching his sheep. The shepherd smiled and offered him warm bread and tea.

"Young man, you must look after your health before working too hard," the shepherd said gently. Anvar smiled back. He explained that he worked at a major commercial bank in the city center, where every minute was strictly counted.

Here by the river bank, however, time seemed to stand still. He realized that life was not just about deadlines, but about noticing the world around you and seizing every quiet opportunity to learn.`,
    wordCount: 148,
    contentVersion: 1,
    processingStatus: 'ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(prefix + 'collections', JSON.stringify([sampleCollection]));
  localStorage.setItem(prefix + 'sections', JSON.stringify([sampleSection]));
  localStorage.setItem(prefix + 'entries', JSON.stringify(sampleEntries));
  localStorage.setItem(prefix + 'documents', JSON.stringify([sampleDoc]));
  localStorage.setItem(prefix + 'seeded', 'true');
}

// Initial seed execution
try {
  seedDemoData();
} catch (e) {
  console.warn('LocalStorage error while seeding demo data', e);
}

const memoryStorageMap: Record<string, string> = {};

function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof localStorage === 'undefined') {
    const raw = memoryStorageMap[getPrefix() + key];
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  }
  try {
    const raw = localStorage.getItem(getPrefix() + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): boolean {
  notifySaveState('saving');
  if (typeof localStorage === 'undefined') {
    memoryStorageMap[getPrefix() + key] = JSON.stringify(value);
    notifySaveState('saved');
    return true;
  }
  try {
    localStorage.setItem(getPrefix() + key, JSON.stringify(value));
    setTimeout(() => notifySaveState('saved'), 150);
    setTimeout(() => notifySaveState('idle'), 2500);
    return true;
  } catch (err) {
    console.error(`Error writing ${key} to storage`, err);
    notifySaveState('error');
    return false;
  }
}

// User Profile & Settings
export function getUserProfile(): UserProfile {
  if (isDemoModeActive()) {
    return DEMO_PROFILE;
  }
  return getStorageItem<UserProfile>('profile', DEFAULT_PROFILE);
}

export function saveUserProfile(profile: UserProfile): boolean {
  if (isDemoModeActive()) return true;
  profile.updatedAt = new Date().toISOString();
  return setStorageItem<UserProfile>('profile', profile);
}

export function getUserSettings(): UserSettings {
  return getStorageItem<UserSettings>('settings', DEFAULT_SETTINGS);
}

export function saveUserSettings(settings: UserSettings): boolean {
  return setStorageItem<UserSettings>('settings', settings);
}

// Vocabulary Collections & Sections
export function getCollections(): VocabularyCollection[] {
  return getStorageItem<VocabularyCollection[]>('collections', []);
}

export function saveCollection(collection: VocabularyCollection): boolean {
  const current = getCollections();
  const idx = current.findIndex((c) => c.id === collection.id);
  collection.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    current[idx] = collection;
  } else {
    current.push(collection);
  }
  return setStorageItem('collections', current);
}

export function deleteCollection(id: string): boolean {
  const current = getCollections().filter((c) => c.id !== id);
  // Also clean up sections and entries
  const sections = getSections(id);
  const sectionIds = new Set(sections.map((s) => s.id));
  const remainingSections = getAllSections().filter((s) => !sectionIds.has(s.id));
  const remainingEntries = getAllEntries().filter((e) => e.collectionId !== id);

  setStorageItem('sections', remainingSections);
  setStorageItem('entries', remainingEntries);
  return setStorageItem('collections', current);
}

export function getAllSections(): VocabularySection[] {
  return getStorageItem<VocabularySection[]>('sections', []);
}

export function getSections(collectionId: string): VocabularySection[] {
  return getAllSections().filter((s) => s.collectionId === collectionId);
}

export function saveSection(section: VocabularySection): boolean {
  const all = getAllSections();
  const idx = all.findIndex((s) => s.id === section.id);
  section.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    all[idx] = section;
  } else {
    all.push(section);
  }
  return setStorageItem('sections', all);
}

export function getAllEntries(): VocabularyEntry[] {
  return getStorageItem<VocabularyEntry[]>('entries', []);
}

export function getEntriesForSection(sectionId: string): VocabularyEntry[] {
  const allSections = getAllSections();
  const section = allSections.find((s) => s.id === sectionId);
  if (!section) return [];
  const entryIdSet = new Set(section.entryIds);
  return getAllEntries().filter((e) => entryIdSet.has(e.id));
}

export function getEntriesForCollection(collectionId: string): VocabularyEntry[] {
  return getAllEntries().filter((e) => e.collectionId === collectionId);
}

export function saveEntries(entries: VocabularyEntry[]): boolean {
  const all = getAllEntries();
  const map = new Map(all.map((e) => [e.id, e]));
  entries.forEach((entry) => {
    entry.updatedAt = new Date().toISOString();
    map.set(entry.id, entry);
  });
  return setStorageItem('entries', Array.from(map.values()));
}

export function updateEntry(entry: VocabularyEntry): boolean {
  return saveEntries([entry]);
}

// Known Words ("Bu so'zni bilaman")
export function getKnownWords(): Set<string> {
  const list = getStorageItem<string[]>('known_words', []);
  return new Set(list.map((w) => w.toLowerCase()));
}

export function toggleKnownWord(word: string): boolean {
  const norm = word.trim().toLowerCase();
  const current = getKnownWords();
  if (current.has(norm)) {
    current.delete(norm);
  } else {
    current.add(norm);
  }
  return setStorageItem('known_words', Array.from(current));
}

// Spaced Repetition States
export function getReviewStates(): ReviewState[] {
  return getStorageItem<ReviewState[]>('review_states', []);
}

export function getReviewState(entryId: string, senseId: string): ReviewState | undefined {
  const all = getReviewStates();
  return all.find((r) => r.entryId === entryId && r.senseId === senseId);
}

export function saveReviewState(state: ReviewState): boolean {
  const all = getReviewStates();
  const idx = all.findIndex((r) => r.id === state.id || (r.entryId === state.entryId && r.senseId === state.senseId));
  state.updatedAt = new Date().toISOString();
  state.revision = (state.revision || 0) + 1;
  if (idx >= 0) {
    all[idx] = state;
  } else {
    all.push(state);
  }
  return setStorageItem('review_states', all);
}

// Reading Documents
export function getReadingDocuments(): ReadingDocument[] {
  return getStorageItem<ReadingDocument[]>('documents', []);
}

export function getReadingDocument(id: string): ReadingDocument | undefined {
  return getReadingDocuments().find((d) => d.id === id);
}

export function saveReadingDocument(doc: ReadingDocument): boolean {
  const all = getReadingDocuments();
  const idx = all.findIndex((d) => d.id === doc.id);
  doc.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    all[idx] = doc;
  } else {
    all.push(doc);
  }
  return setStorageItem('documents', all);
}

export function deleteReadingDocument(id: string): boolean {
  // 1. Remove from documents
  const all = getReadingDocuments();
  const remaining = all.filter((d) => d.id !== id);
  const success = setStorageItem('documents', remaining);
  
  if (success) {
    // 2. Cleanup associated audio cache (implementation detail: assetRepository.clearAll() or selective removal)
    // Note: The audioEngine manages its own cache, this is just local storage cleanup
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('eta_reader_progress_' + id); // hypothetical
    }
  }
  
  return success;
}

// Exercise Attempts
export function recordExerciseAttempt(attempt: ExerciseAttempt): boolean {
  const all = getStorageItem<ExerciseAttempt[]>('attempts', []);
  all.push(attempt);
  return setStorageItem('attempts', all);
}

export function getAllAttempts(): ExerciseAttempt[] {
  return getStorageItem<ExerciseAttempt[]>('attempts', []);
}
