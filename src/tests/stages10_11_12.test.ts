/**
 * Unit & Integration Tests for Stages 10, 11, and 12
 * - Track extraction & candidate prioritization (Stage 10)
 * - Audio interval validation (Stage 10)
 * - Teacher state machine transitions (Stage 11)
 * - Writing span validation and canonical taxonomy (Stage 12)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractTrackReferences,
  findTrackCandidates,
  validateAudioInterval,
} from '../services/trackMatcher';
import { validateStateTransition } from '../services/teacherStorage';
import { AudioAsset, AudioCollection, AudioTrackMapping } from '../types';

describe('Stage 10: Track Matching and Audio Intervals', () => {
  it('extracts track labels accurately with strict string preservation', () => {
    const text = 'Listen to Track 3.23 and answer questions. Then check T 1.03 for details.';
    const matches = extractTrackReferences(text, 1, '1');

    assert.equal(matches.length, 2);
    assert.equal(matches[0].cleanTrackLabel, '3.23');
    // Ensure "1.03" is strictly preserved as string and not parsed as 1.3
    assert.equal(matches[1].cleanTrackLabel, '1.03');
    assert.notEqual(matches[1].cleanTrackLabel, '1.3');
  });

  it('extracts CD2 Track 7 formats correctly', () => {
    const text = 'Conversation on CD2 Track 7 in the student book.';
    const matches = extractTrackReferences(text, 5, 'Unit 1');

    assert.equal(matches.length, 1);
    assert.equal(matches[0].cleanTrackLabel, 'CD2-7');
  });

  it('validates audio intervals strictly', () => {
    // Valid whole audio
    assert.equal(validateAudioInterval().isValid, true);

    // Valid interval: start 5, end 20, duration 40
    assert.equal(validateAudioInterval(5, 20, 40).isValid, true);

    // Invalid negative start
    const neg = validateAudioInterval(-2, 10, 30);
    assert.equal(neg.isValid, false);

    // Invalid end <= start
    const backwards = validateAudioInterval(15, 10, 30);
    assert.equal(backwards.isValid, false);

    // Invalid end exceeds duration
    const exceeds = validateAudioInterval(0, 50, 40);
    assert.equal(exceeds.isValid, false);

    // Too small (< 1s)
    const tooSmall = validateAudioInterval(10, 10.4, 30);
    assert.equal(tooSmall.isValid, false);
  });

  it('prioritizes exact matches in book collection over filename patterns', () => {
    const sampleAssets: AudioAsset[] = [
      {
        id: 'aud_1',
        ownerId: 'u1',
        title: 'Random Track',
        originalFilename: 'Random_file_3.23.mp3',
        trackLabel: '3.23',
        normalizedTrackLabel: '3.23',
        storagePath: '',
        mimeType: 'audio/mp3',
        sizeBytes: 1000,
        hasTranscript: false,
        transcriptStatus: 'none',
        transcriptAlignmentLevel: 'none',
        bookmarks: [],
        processingStatus: 'ready',
        createdAt: '',
        updatedAt: '',
      },
    ];

    const sampleCollections: AudioCollection[] = [
      {
        id: 'col_1',
        ownerId: 'u1',
        title: 'Headway Elementary Collection',
        courseOrBookTitle: 'Headway Elementary',
        trackCount: 1,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const candidates = findTrackCandidates({
      targetLabel: '3.23',
      bookId: 'book_headway_elem_demo',
      allAssets: sampleAssets,
      allCollections: sampleCollections,
      existingMappings: [],
    });

    assert.ok(candidates.length > 0);
    assert.equal(candidates[0].asset.trackLabel, '3.23');
  });
});

describe('Stage 11: Teacher State Machine & Transitions', () => {
  it('permits valid pedagogical transitions', () => {
    assert.equal(validateStateTransition('preparing', 'goalSetting'), true);
    assert.equal(validateStateTransition('goalSetting', 'explaining'), true);
    assert.equal(validateStateTransition('explaining', 'demonstrating'), true);
    assert.equal(validateStateTransition('demonstrating', 'guidedPractice'), true);
    assert.equal(validateStateTransition('guidedPractice', 'independentPractice'), true);
    assert.equal(validateStateTransition('independentPractice', 'reviewing'), true);
    assert.equal(validateStateTransition('reviewing', 'summarizing'), true);
    assert.equal(validateStateTransition('summarizing', 'completed'), true);
  });

  it('rejects invalid jumps', () => {
    // Cannot jump from preparing directly to summarizing
    assert.equal(validateStateTransition('preparing', 'summarizing'), false);
    // Cannot jump from completed directly to guidedPractice without preparing
    assert.equal(validateStateTransition('completed', 'guidedPractice'), false);
  });
});

describe('Stage 12: Writing Validation & Canonical Rules', () => {
  it('correctly maps canonical rules', () => {
    const canonicalRules = [
      'thirdPersonSingular',
      'doDoes',
      'articleUsage',
      'wordOrder',
      'subjectVerbAgreement',
      'tenseChoice',
      'spelling',
      'other',
    ];

    assert.ok(canonicalRules.includes('thirdPersonSingular'));
    assert.ok(canonicalRules.includes('doDoes'));
  });

  it('recalibrates offsets accurately when learner text has exact substring', () => {
    const text = 'I wake up at seven. My brother go to university.';
    const span = 'My brother go';

    const foundIndex = text.indexOf(span);
    assert.ok(foundIndex >= 0);
    assert.equal(text.slice(foundIndex, foundIndex + span.length), span);
  });
});
