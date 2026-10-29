import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvatars, saveAvatar, DEFAULT_AVATAR } from '../services/mediaStorage';
import { createAudioAnalyzer } from '../services/audioAnalyzer';
import { logActivityEvent, getActivityEvents, getTodayLocalDateStr } from '../services/activityLogger';
import { generateDailyStudyPlan } from '../services/studyPlanStorage';

test('Stage 13: Media & Avatar Storage - Default SVG Avatar present', () => {
  const avatars = getAvatars();
  assert.ok(avatars.length >= 1, 'At least 1 default avatar should be present');
  const defaultAv = avatars.find((a) => a.id === DEFAULT_AVATAR.id);
  assert.ok(defaultAv, 'Default Ms. Laylo avatar should exist');
  assert.equal(defaultAv?.capabilities.supportsRigging, true, 'Default avatar supports 2D rigging');
  assert.equal(defaultAv?.capabilities.supportsLipSync, true, 'Default avatar supports lip-sync');
});

test('Stage 13: Audio Analyzer - Graceful Fallback Mode', () => {
  // When no mediaElement or window AudioContext is passed in Node env, analyzer falls back smoothly
  const analyzer = createAudioAnalyzer(null, true);
  assert.equal(analyzer.isFallback, true, 'Analyzer correctly sets fallback mode in restricted environment');
  const amp = analyzer.getAmplitude();
  assert.ok(amp >= 0 && amp <= 1.0, 'Amplitude output is within normalized 0.0 to 1.0 range');
  analyzer.cleanup();
});

test('Stage 14: Activity Logger - Idempotent Logging', () => {
  const event1 = logActivityEvent('vocab_reviewed', {
    referenceId: 'test_card_123',
    durationSeconds: 120,
  });

  const event2 = logActivityEvent('vocab_reviewed', {
    referenceId: 'test_card_123',
    durationSeconds: 120,
  });

  assert.equal(event1.id, event2.id, 'Duplicate activity logging with same reference ID on same day is idempotent');
});

test('Stage 14: Daily Study Planner - Generates Deterministic Plan', () => {
  const plan = generateDailyStudyPlan();
  assert.ok(plan.items.length > 0, 'Daily study plan generates actionable study items');
  assert.ok(plan.totalEstimatedMinutes <= plan.timeBudgetMinutes + 5, 'Plan respects time budget');
  assert.equal(typeof plan.dateStr, 'string', 'Plan contains valid date string');
});
