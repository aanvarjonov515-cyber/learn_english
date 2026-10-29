/**
 * Grammar Book Storage Service
 * Manages GrammarBook, BookPage, GrammarUnit, GrammarExercise, and BookStudyProgress.
 * Accurately tracks pdfPageIndex vs printedPageLabel.
 */

import {
  GrammarBook,
  BookPage,
  GrammarUnit,
  GrammarExercise,
  BookStudyProgress,
} from '../types';
import { isDemoModeActive } from './storage';

const GRAMMAR_PREFIX = 'eta_grammar_';
const DEMO_GRAMMAR_PREFIX = 'eta_demo_grammar_';

function getPrefix() {
  return isDemoModeActive() ? DEMO_GRAMMAR_PREFIX : GRAMMAR_PREFIX;
}

// Seed sample Grammar textbook for Demo Mode
function seedDemoGrammarData() {
  if (typeof localStorage === 'undefined') return;
  const prefix = DEMO_GRAMMAR_PREFIX;
  if (localStorage.getItem(prefix + 'seeded')) return;

  const bookId = 'book_headway_elem_demo';
  const sampleBook: GrammarBook = {
    id: bookId,
    ownerId: 'usr_demo_01',
    title: 'Headway Elementary (Student’s Book)',
    author: 'Liz & John Soars',
    edition: '5th Edition',
    estimatedLevel: 'A2',
    totalPages: 12,
    pageOffset: 4, // PDF page 5 corresponds to printed page 1
    processingStatus: 'ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const samplePages: BookPage[] = [
    {
      id: `p_${bookId}_1`,
      bookId,
      pdfPageIndex: 1,
      printedPageLabel: 'Cover',
      extractedText: 'Headway Elementary Student’s Book 5th Edition. Oxford University Press.',
      extractionStatus: 'extracted',
      isCompleted: true,
    },
    {
      id: `p_${bookId}_5`,
      bookId,
      pdfPageIndex: 5,
      printedPageLabel: '1',
      unitId: 'unit_1',
      extractedText: `Unit 1: Nice to meet you!
Grammar: Present Simple of 'to be' (am, is, are). Possessive adjectives (my, your, his, her).
Vocabulary: Countries and nationalities. Numbers 1–20.
Conversation:
A: Hello, I am David. What is your name?
B: My name is Maria. I am from Spain.
Exercise 1: Complete with am, is, or are:
1. I ___ a student.
2. She ___ from Italy.
3. They ___ doctors.`,
      extractionStatus: 'extracted',
      isCompleted: true,
      hasListeningExercise: true,
      linkedAudioTrackLabel: '1.03',
      linkedAudioAssetId: 'aud_track_1_03',
    },
    {
      id: `p_${bookId}_6`,
      bookId,
      pdfPageIndex: 6,
      printedPageLabel: '2',
      unitId: 'unit_1',
      extractedText: `Grammar Focus: Questions with 'to be'
Am I? Is he? Is she? Are you? Are they?
Short Answers:
Yes, I am. / No, I am not.
Yes, she is. / No, she isn't.

Exercise 2 (Listening Track 1.03):
Listen to the conversation between David and Nilufar.
Where is Nilufar from?
Is she attending the conference for the first time?`,
      extractionStatus: 'extracted',
      isCompleted: false,
      hasListeningExercise: true,
      linkedAudioTrackLabel: '1.03',
      linkedAudioAssetId: 'aud_track_1_03',
    },
    {
      id: `p_${bookId}_7`,
      bookId,
      pdfPageIndex: 7,
      printedPageLabel: '3',
      unitId: 'unit_2',
      extractedText: `Unit 2: A Good Job!
Grammar: Present Simple (he/she/it -s, -es). Questions and negatives with does/doesn't.
Vocabulary: Jobs and occupations (doctor, pilot, teacher, software engineer).
Reading:
Sarah is an architect in Cambridge. She gets up at 7:00 every morning. She designs modern energy-efficient buildings.
Exercise 3: Complete with does or doesn't:
1. Sarah ___ work on Sundays.
2. What time ___ she start work?`,
      extractionStatus: 'extracted',
      isCompleted: false,
      hasListeningExercise: false,
    },
    {
      id: `p_${bookId}_8`,
      bookId,
      pdfPageIndex: 8,
      printedPageLabel: '4',
      unitId: 'unit_2',
      extractedText: `Unit 2: Everyday Life & Routine
Vocabulary: Telling the time, daily habits.
Listening Exercise (Track 3.23):
Asking for directions in the city center.
Listen and match the places with their positions on the street map.`,
      extractionStatus: 'extracted',
      isCompleted: false,
      hasListeningExercise: true,
      linkedAudioTrackLabel: '3.23',
      linkedAudioAssetId: 'aud_track_3_23',
    },
  ];

  const sampleUnits: GrammarUnit[] = [
    {
      id: 'unit_1',
      bookId,
      unitNumber: 1,
      title: "Unit 1: Nice to meet you! ('To Be' fe'li va tanishuv)",
      startPdfPage: 5,
      endPdfPage: 6,
      topics: [
        {
          id: 'top_1',
          unitId: 'unit_1',
          title: "Present Simple: 'To Be' (am, is, are)",
          grammarRuleUz:
            "'To be' fe'li hozirgi zamonda shaxslarga ko'ra am (I), is (he, she, it) va are (you, we, they) shakllariga ega.",
          exampleEn: 'She is a talented teacher.',
          exampleUz: 'U iqtidorli o‘qituvchi.',
        },
      ],
      exercises: [
        {
          id: 'ex_1',
          unitId: 'unit_1',
          bookId,
          pageIndex: 5,
          printedPageLabel: '1',
          exerciseNumber: '1',
          instruction: 'Bo‘sh joylarni am, is yoki are bilan to‘ldiring.',
          exerciseType: 'fill_blanks',
          contentText: '1. I ___ a student.\n2. She ___ from Italy.\n3. They ___ doctors.',
          officialAnswerKey: '1. am, 2. is, 3. are',
          aiSuggestedSolution: '1. am, 2. is, 3. are',
          isSubmitted: false,
        },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'unit_2',
      bookId,
      unitNumber: 2,
      title: "Unit 2: A Good Job! (Present Simple va kundalik tartib)",
      startPdfPage: 7,
      endPdfPage: 8,
      topics: [
        {
          id: 'top_2',
          unitId: 'unit_2',
          title: 'Present Simple: 3-shaxs birlik (-s / -es)',
          grammarRuleUz:
            'Hozirgi oddiy zamonda he, she, it bilan fe’l oxiriga -s yoki -es qo‘shiladi (masalan: works, watches).',
          exampleEn: 'He works at a major company.',
          exampleUz: 'U yirik kompaniyada ishlaydi.',
        },
      ],
      exercises: [
        {
          id: 'ex_2',
          unitId: 'unit_2',
          bookId,
          pageIndex: 7,
          printedPageLabel: '3',
          exerciseNumber: '3',
          instruction: 'Bo‘sh joylarni does yoki doesn’t bilan to‘ldiring.',
          exerciseType: 'fill_blanks',
          contentText: '1. Sarah ___ work on Sundays.\n2. What time ___ she start work?',
          officialAnswerKey: '1. doesn’t, 2. does',
          aiSuggestedSolution: '1. doesn’t, 2. does',
          isSubmitted: false,
        },
      ],
      createdAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem(prefix + 'books', JSON.stringify([sampleBook]));
  localStorage.setItem(prefix + `pages_${bookId}`, JSON.stringify(samplePages));
  localStorage.setItem(prefix + `units_${bookId}`, JSON.stringify(sampleUnits));
  localStorage.setItem(prefix + 'seeded', 'true');
}

try {
  seedDemoGrammarData();
} catch (e) {
  console.warn('LocalStorage error while seeding demo grammar data', e);
}

// Accessors
export function getGrammarBooks(): GrammarBook[] {
  try {
    const raw = localStorage.getItem(getPrefix() + 'books');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGrammarBook(book: GrammarBook): boolean {
  try {
    const all = getGrammarBooks();
    const idx = all.findIndex((b) => b.id === book.id);
    book.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      all[idx] = book;
    } else {
      all.unshift(book);
    }
    localStorage.setItem(getPrefix() + 'books', JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

export function deleteGrammarBook(id: string): boolean {
  try {
    const remaining = getGrammarBooks().filter((b) => b.id !== id);
    localStorage.setItem(getPrefix() + 'books', JSON.stringify(remaining));
    localStorage.removeItem(getPrefix() + `pages_${id}`);
    localStorage.removeItem(getPrefix() + `units_${id}`);
    return true;
  } catch {
    return false;
  }
}

export function getBookPages(bookId: string): BookPage[] {
  try {
    const raw = localStorage.getItem(getPrefix() + `pages_${bookId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookPage(page: BookPage): boolean {
  try {
    const pages = getBookPages(page.bookId);
    const idx = pages.findIndex((p) => p.id === page.id);
    if (idx >= 0) {
      pages[idx] = page;
    } else {
      pages.push(page);
    }
    localStorage.setItem(getPrefix() + `pages_${page.bookId}`, JSON.stringify(pages));
    return true;
  } catch {
    return false;
  }
}

export function getBookUnits(bookId: string): GrammarUnit[] {
  try {
    const raw = localStorage.getItem(getPrefix() + `units_${bookId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookUnit(unit: GrammarUnit): boolean {
  try {
    const units = getBookUnits(unit.bookId);
    const idx = units.findIndex((u) => u.id === unit.id);
    if (idx >= 0) {
      units[idx] = unit;
    } else {
      units.push(unit);
    }
    localStorage.setItem(getPrefix() + `units_${unit.bookId}`, JSON.stringify(units));
    return true;
  } catch {
    return false;
  }
}

export function saveBookUnits(bookId: string, units: GrammarUnit[]): boolean {
  try {
    localStorage.setItem(getPrefix() + `units_${bookId}`, JSON.stringify(units));
    return true;
  } catch {
    return false;
  }
}
