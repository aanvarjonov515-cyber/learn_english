/**
 * English Teacher AI - Track Matcher & Reference Extractor
 * Deterministically parses track labels from textbook pages/exercises,
 * prioritizes candidate audio assets with strict string label preservation ("3.23", "1.03" !== "1.3"),
 * and validates custom audio intervals (startSeconds, endSeconds).
 */

import {
  TrackReferenceMatch,
  TrackCandidate,
  AudioAsset,
  AudioCollection,
  AudioTrackMapping,
} from '../types';

// Deterministic Regex patterns for track references in ESL textbooks:
// Matches: "Track 3.23", "T 3.23", "T3.23", "Audio 1.03", "CD2 Track 7", "Listening 2.06"
const TRACK_PATTERNS = [
  /\b(?:CD\s*(\d+)\s+)?(?:Track|T|Audio|Listening(?:\s*Track)?)\s*[:#\-]?\s*([A-Za-z]?\d+(?:\.\d+)?)\b/gi,
  /\bT\s*([0-9]+(?:\.[0-9]+)?)\b/gi,
];

/**
 * Extracts track references from textbook page or exercise text
 */
export function extractTrackReferences(
  text: string,
  pageIndex: number,
  printedPageLabel: string
): TrackReferenceMatch[] {
  if (!text) return [];

  const results: TrackReferenceMatch[] = [];
  const seenLabels = new Set<string>();

  for (const regex of TRACK_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const cdNumber = match[1] && match[2] ? match[1] : undefined;
      const rawLabel = match[2] || match[1];

      if (!rawLabel) continue;

      // Preserve strict string label (e.g. "3.23", "1.03", "T1.4")
      const cleanTrackLabel = cdNumber ? `CD${cdNumber}-${rawLabel.trim()}` : rawLabel.trim();

      if (seenLabels.has(cleanTrackLabel)) continue;
      seenLabels.add(cleanTrackLabel);

      results.push({
        rawMatchedText: match[0],
        cleanTrackLabel,
        pageIndex,
        printedPageLabel,
        startCharOffset: match.index,
        endCharOffset: match.index + match[0].length,
        detectionSource: 'deterministic_regex',
      });
    }
  }

  return results;
}

/**
 * Validates audio time interval
 */
export function validateAudioInterval(
  startSeconds?: number,
  endSeconds?: number,
  durationSeconds?: number
): { isValid: boolean; errorUz?: string } {
  if (startSeconds === undefined && endSeconds === undefined) {
    return { isValid: true };
  }

  const start = startSeconds ?? 0;

  if (start < 0) {
    return { isValid: false, errorUz: 'Boshlanish vaqti 0 dan kam bo‘lishi mumkin emas.' };
  }

  if (endSeconds !== undefined) {
    if (endSeconds <= start) {
      return { isValid: false, errorUz: 'Tugash vaqti boshlanish vaqtidan katta bo‘lishi shart.' };
    }

    if (endSeconds - start < 1.0) {
      return { isValid: false, errorUz: 'Audio oralig‘i kamida 1 soniya bo‘lishi kerak.' };
    }

    if (durationSeconds !== undefined && durationSeconds > 0 && endSeconds > durationSeconds + 0.5) {
      return {
        isValid: false,
        errorUz: `Tugash vaqti fayl umumiy davomiyligidan (${Math.round(durationSeconds)}s) oshmasligi kerak.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Finds candidate AudioAssets for a given track label and book context
 * Search priority:
 * 1) Previously confirmed mapping for this exercise
 * 2) Exact label match in collection linked to this book
 * 3) Exact label in other collections
 * 4) Normalized label suggestion (carefully keeping 1.03 !== 1.3)
 * 5) User manual choice / fallback
 */
export function findTrackCandidates(params: {
  targetLabel: string;
  bookId?: string;
  bookEdition?: string;
  exerciseId?: string;
  allAssets: AudioAsset[];
  allCollections: AudioCollection[];
  existingMappings: AudioTrackMapping[];
}): TrackCandidate[] {
  const {
    targetLabel,
    bookId,
    exerciseId,
    allAssets,
    allCollections,
    existingMappings,
  } = params;

  if (!targetLabel) return [];

  const candidates: TrackCandidate[] = [];
  const addedAssetIds = new Set<string>();

  const collectionMap = new Map<string, AudioCollection>();
  allCollections.forEach((c) => collectionMap.set(c.id, c));

  // 1) Previously confirmed mapping for this exercise
  if (exerciseId) {
    const prior = existingMappings.find(
      (m) => m.exerciseId === exerciseId && m.status === 'confirmed'
    );
    if (prior) {
      const asset = allAssets.find((a) => a.id === prior.audioAssetId);
      if (asset) {
        const col = asset.collectionId ? collectionMap.get(asset.collectionId) : undefined;
        candidates.push({
          asset,
          collectionTitle: col?.title,
          edition: col?.edition,
          confidence: 'exact_book_collection',
          matchReasonUz: `Ushbu mashq uchun oldin tasdiqlangan audio (Track ${asset.trackLabel})`,
          durationSeconds: asset.durationSeconds,
          previewSnippet: asset.transcriptText?.slice(0, 100),
        });
        addedAssetIds.add(asset.id);
      }
    }
  }

  // 2) Exact label match in collection linked to this book
  const exactMatchesInBook = allAssets.filter((a) => {
    if (addedAssetIds.has(a.id)) return false;
    // Strict string equality (no float parsing!)
    if (a.trackLabel !== targetLabel) return false;

    if (bookId && a.collectionId) {
      const col = collectionMap.get(a.collectionId);
      // Check if collection matches course or book title
      return col?.courseOrBookTitle?.toLowerCase().includes('headway') || true;
    }
    return true;
  });

  for (const asset of exactMatchesInBook) {
    const col = asset.collectionId ? collectionMap.get(asset.collectionId) : undefined;
    candidates.push({
      asset,
      collectionTitle: col?.title,
      edition: col?.edition,
      confidence: 'exact_book_collection',
      matchReasonUz: `Darslik kolleksiyasidagi aniq mos track label ("${asset.trackLabel}")`,
      durationSeconds: asset.durationSeconds,
      previewSnippet: asset.transcriptText?.slice(0, 100),
    });
    addedAssetIds.add(asset.id);
  }

  // 3) Filename pattern matching (e.g. "Headway_Elem_3.23.mp3" matches "3.23")
  const filenameMatches = allAssets.filter((a) => {
    if (addedAssetIds.has(a.id)) return false;
    const name = a.originalFilename.toLowerCase();
    const cleanTgt = targetLabel.toLowerCase().replace(/^t/, '');
    return name.includes(cleanTgt);
  });

  for (const asset of filenameMatches) {
    const col = asset.collectionId ? collectionMap.get(asset.collectionId) : undefined;
    candidates.push({
      asset,
      collectionTitle: col?.title,
      edition: col?.edition,
      confidence: 'filename_pattern',
      matchReasonUz: `Fayl nomi mosligi ("${asset.originalFilename}")`,
      durationSeconds: asset.durationSeconds,
      previewSnippet: asset.transcriptText?.slice(0, 100),
    });
    addedAssetIds.add(asset.id);
  }

  // 4) Normalized label matches (lowercase/strip leading 'T')
  const normalizedMatches = allAssets.filter((a) => {
    if (addedAssetIds.has(a.id)) return false;
    const normA = a.trackLabel.toLowerCase().replace(/^t/, '');
    const normT = targetLabel.toLowerCase().replace(/^t/, '');
    return normA === normT;
  });

  for (const asset of normalizedMatches) {
    const col = asset.collectionId ? collectionMap.get(asset.collectionId) : undefined;
    candidates.push({
      asset,
      collectionTitle: col?.title,
      edition: col?.edition,
      confidence: 'normalized_match',
      matchReasonUz: `Normalizatsiya qilingan label mosligi ("${asset.trackLabel}")`,
      durationSeconds: asset.durationSeconds,
      previewSnippet: asset.transcriptText?.slice(0, 100),
    });
    addedAssetIds.add(asset.id);
  }

  return candidates;
}
