/**
 * Listening Storage Service
 * Manages AudioAsset, AudioCollection, AudioBookmark, and AudioTrackMapping.
 * Enforces trackLabel as string (e.g. "3.23", "1.03" !== "1.3").
 */

import {
  AudioAsset,
  AudioCollection,
  AudioBookmark,
  AudioTrackMapping,
  DictationSubmission,
} from '../types';
import { isDemoModeActive } from './storage';

const LISTENING_PREFIX = 'eta_listening_';
const DEMO_LISTENING_PREFIX = 'eta_demo_listening_';

function getPrefix() {
  return isDemoModeActive() ? DEMO_LISTENING_PREFIX : LISTENING_PREFIX;
}

// Seed sample listening data for Demo Mode
function seedDemoListeningData() {
  const prefix = DEMO_LISTENING_PREFIX;
  if (localStorage.getItem(prefix + 'seeded')) return;

  const collectionId = 'col_audio_headway_elem';
  const sampleCollection: AudioCollection = {
    id: collectionId,
    ownerId: 'usr_demo_01',
    title: 'Headway Elementary (5th Edition) Audio Tracks',
    courseOrBookTitle: 'Headway Elementary',
    edition: '5th Edition',
    level: 'A2',
    notes: 'Oxford University Press ingliz tili darsligi uchun tinglash audiolari.',
    trackCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleTracks: AudioAsset[] = [
    {
      id: 'aud_track_3_23',
      ownerId: 'usr_demo_01',
      title: 'Unit 3: Asking for Directions in London',
      originalFilename: 'Headway_Elem_3.23.mp3',
      trackLabel: '3.23', // STRICTLY string
      normalizedTrackLabel: '3.23',
      collectionId,
      storagePath: '',
      mimeType: 'audio/mp3',
      sizeBytes: 1024 * 750,
      durationSeconds: 48,
      hasTranscript: true,
      transcriptText: `Excuse me, could you tell me the way to the British Museum?
Yes, of course. Go straight ahead down this street, then take the second turning on your left.
Walk past the bank and the coffee shop, and you will see the museum entrance right opposite the park.
Thank you very much for your help! You are welcome, have a nice day in London.`,
      transcriptStatus: 'ready',
      transcriptAlignmentLevel: 'sentence',
      bookmarks: [
        {
          id: 'bm_1',
          audioAssetId: 'aud_track_3_23',
          timeSeconds: 12,
          label: "Yo'l ko'rsatish boshlanishi",
          notes: 'Take the second turning on your left',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'bm_2',
          audioAssetId: 'aud_track_3_23',
          timeSeconds: 28,
          label: "Muzey joylashuvi",
          notes: 'Opposite the park',
          createdAt: new Date().toISOString(),
        },
      ],
      processingStatus: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'aud_track_1_03',
      ownerId: 'usr_demo_01',
      title: 'Unit 1: Meeting People at a Conference',
      originalFilename: 'Headway_Elem_1.03.mp3',
      trackLabel: '1.03', // DISTINCT from 1.3
      normalizedTrackLabel: '1.03',
      collectionId,
      storagePath: '',
      mimeType: 'audio/mp3',
      sizeBytes: 1024 * 540,
      durationSeconds: 35,
      hasTranscript: true,
      transcriptText: `Hello, my name is David. Are you here for the global technology summit?
Hi David, yes I am! I am Nilufar from Tashkent, Uzbekistan. It is very nice to meet you.
Nice to meet you too Nilufar! Is this your first time attending this international conference?
Yes, it is my first visit, and I am very excited to learn about artificial intelligence.`,
      transcriptStatus: 'ready',
      transcriptAlignmentLevel: 'sentence',
      bookmarks: [],
      processingStatus: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'aud_track_t1_4',
      ownerId: 'usr_demo_01',
      title: 'Unit 2: Ordering Coffee and Pastries',
      originalFilename: 'Track_T1.4_Cafe.mp3',
      trackLabel: 'T1.4',
      normalizedTrackLabel: 't1.4',
      collectionId,
      storagePath: '',
      mimeType: 'audio/mp3',
      sizeBytes: 1024 * 420,
      durationSeconds: 26,
      hasTranscript: true,
      transcriptText: `Good morning! Can I get a hot cappuccino with oat milk, please?
Sure, would you like regular or large?
A large one, please. And could I also have a chocolate croissant?
Certainly. That will be four pounds fifty. Cash or card?`,
      transcriptStatus: 'ready',
      transcriptAlignmentLevel: 'sentence',
      bookmarks: [],
      processingStatus: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem(prefix + 'collections', JSON.stringify([sampleCollection]));
  localStorage.setItem(prefix + 'tracks', JSON.stringify(sampleTracks));
  localStorage.setItem(prefix + 'seeded', 'true');
}

try {
  seedDemoListeningData();
} catch (e) {
  console.warn('LocalStorage error while seeding demo listening data', e);
}

/**
 * Extracts suggested track label from filename (e.g. "Headway_Elem_3.23.mp3" -> "3.23")
 */
export function parseSuggestedTrackLabel(filename: string): string {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  // Match patterns like "3.23", "1.03", "T1.4", "CD2-07", "Track 4"
  const match = baseName.match(/(?:track[_\s-]*)?([a-zA-Z]?\d+[\.\-_]\d+|[a-zA-Z]\d+)/i);
  if (match) {
    return match[1].replace(/_/g, '.');
  }
  return '';
}

// Accessors
export function getAudioAssets(): AudioAsset[] {
  try {
    const raw = localStorage.getItem(getPrefix() + 'tracks');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAudioAsset(asset: AudioAsset): boolean {
  try {
    const all = getAudioAssets();
    const idx = all.findIndex((a) => a.id === asset.id);
    asset.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      all[idx] = asset;
    } else {
      all.unshift(asset);
    }
    localStorage.setItem(getPrefix() + 'tracks', JSON.stringify(all));
    return true;
  } catch (err) {
    console.error('Failed to save audio asset', err);
    return false;
  }
}

export function deleteAudioAsset(id: string): boolean {
  try {
    const remaining = getAudioAssets().filter((a) => a.id !== id);
    localStorage.setItem(getPrefix() + 'tracks', JSON.stringify(remaining));
    return true;
  } catch {
    return false;
  }
}

export function getAudioCollections(): AudioCollection[] {
  try {
    const raw = localStorage.getItem(getPrefix() + 'collections');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAudioCollection(col: AudioCollection): boolean {
  try {
    const all = getAudioCollections();
    const idx = all.findIndex((c) => c.id === col.id);
    col.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      all[idx] = col;
    } else {
      all.push(col);
    }
    localStorage.setItem(getPrefix() + 'collections', JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

export function getAudioTrackMappings(): AudioTrackMapping[] {
  try {
    const raw = localStorage.getItem(getPrefix() + 'mappings');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAudioTrackMapping(mapping: AudioTrackMapping): boolean {
  try {
    const all = getAudioTrackMappings();
    const idx = all.findIndex(
      (m) => m.bookId === mapping.bookId && m.exerciseId === mapping.exerciseId
    );
    if (idx >= 0) {
      all[idx] = mapping;
    } else {
      all.push(mapping);
    }
    localStorage.setItem(getPrefix() + 'mappings', JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/**
 * Dictation evaluation comparing user typing with reference transcript
 */
export function evaluateDictation(userText: string, referenceText: string): DictationSubmission {
  const cleanUser = userText.trim().replace(/[’]/g, "'");
  const cleanRef = referenceText.trim().replace(/[’]/g, "'");

  const userWords = cleanUser.split(/\s+/).filter(Boolean);
  const refWords = cleanRef.split(/\s+/).filter(Boolean);

  let correctCount = 0;
  const wordDifferences: DictationSubmission['wordDifferences'] = [];

  const maxLen = Math.max(userWords.length, refWords.length);
  for (let i = 0; i < maxLen; i++) {
    const uWord = userWords[i]?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').toLowerCase() || '';
    const rWord = refWords[i]?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').toLowerCase() || '';

    if (!uWord && rWord) {
      wordDifferences.push({ word: refWords[i], status: 'missing' });
    } else if (uWord && !rWord) {
      wordDifferences.push({ word: userWords[i], status: 'extra' });
    } else if (uWord === rWord) {
      correctCount++;
      wordDifferences.push({ word: userWords[i], status: 'correct' });
    } else {
      wordDifferences.push({ word: userWords[i], status: 'typo' });
    }
  }

  const accuracyScore = refWords.length > 0 ? Math.round((correctCount / refWords.length) * 100) : 0;

  return {
    id: `dict_${Date.now()}`,
    audioAssetId: '',
    userText,
    referenceText,
    accuracyScore,
    wordDifferences,
    createdAt: new Date().toISOString(),
  };
}
