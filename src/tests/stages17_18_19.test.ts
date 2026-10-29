import { test, describe } from 'node:test';
import assert from 'node:assert';

// Import Stage 17 Persistent Chat & Learner Memory Services
import {
  getAllConversations,
  createConversation,
  addPersistentChatMessage,
  getPaginatedMessages,
  deleteConversation,
} from '../services/persistentChatStorage';

import {
  getLearnerMemoryItems,
  saveLearnerMemoryItem,
  deleteLearnerMemoryItem,
  getMemorySummaryForPrompt,
} from '../services/learnerMemoryStorage';

// Import Stage 18 Homework Services
import {
  getAllHomeworkAssignments,
  submitHomeworkItemAnswer,
  deferHomeworkAssignment,
  simplifyHomeworkAssignment,
  checkDailyHomeworkOnLogin,
} from '../services/homeworkStorage';

// Import Stage 19 Theme Services
import {
  getStoredThemePreference,
  setStoredThemePreference,
  resolveTheme,
  applyThemeToDOM,
} from '../services/themeStorage';

describe('Stage 17: Persistent Chat & Learner Memory Engine', () => {
  test('creates new conversation and handles paginated message history', () => {
    const conv = createConversation('Test Unit Conversation', { module: 'grammar', topicTitle: 'Present Simple' });
    assert.ok(conv.id.startsWith('conv_'));
    assert.strictEqual(conv.title, 'Test Unit Conversation');

    // Add 25 messages to test pagination (pageSize=20)
    for (let i = 1; i <= 25; i++) {
      addPersistentChatMessage({
        messageId: `msg_test_${i}`,
        conversationId: conv.id,
        ownerId: 'usr_demo_01',
        role: i % 2 === 0 ? 'assistant' : 'user',
        content: `Test message content ${i}`,
        createdAt: new Date(Date.now() + i * 1000).toISOString(),
        status: 'sent',
      });
    }

    const page1 = getPaginatedMessages(conv.id, 1, 20);
    assert.strictEqual(page1.totalCount, 25);
    assert.strictEqual(page1.messages.length, 20);
    assert.strictEqual(page1.hasMore, true);

    deleteConversation(conv.id);
  });

  test('learner memory CRUD and summary generation for prompt', () => {
    const item = saveLearnerMemoryItem({
      summary: 'Student understands third person singular -s rule well',
      category: 'exercise_evidence',
      source: 'exercise_evidence',
    });

    assert.ok(item.id);
    assert.strictEqual(item.summary, 'Student understands third person singular -s rule well');

    const summaryStr = getMemorySummaryForPrompt();
    assert.ok(summaryStr.includes('third person singular -s'));

    deleteLearnerMemoryItem(item.id);
  });
});

describe('Stage 18: Integrated Daily Homework System', () => {
  test('homework assignment retrieval, item submission, and login check', () => {
    const assignments = getAllHomeworkAssignments();
    assert.ok(assignments.length > 0, 'Should have seeded or active homework assignments');

    const target = assignments[0];
    const itemId = target.items[0].id;

    const sub = submitHomeworkItemAnswer(target.id, itemId, 'works', 'test_key_123');
    assert.ok(sub.id);
    assert.strictEqual(sub.evaluationStatus, 'graded');
    assert.ok(sub.feedbackSummaryUz?.includes('To‘g‘ri') || sub.feedbackSummaryUz?.includes('Xato'));

    const loginCheck = checkDailyHomeworkOnLogin();
    assert.ok(typeof loginCheck.activeHomeworksCount === 'number');
    assert.ok(loginCheck.noticeMessageUz.includes('Ilovaga kirganingizda'));
  });

  test('homework deferral and simplification', () => {
    const assignments = getAllHomeworkAssignments();
    const target = assignments[0];

    const futureDate = new Date(Date.now() + 86400000 * 5).toISOString();
    deferHomeworkAssignment(target.id, futureDate);

    const updated = getAllHomeworkAssignments().find((a) => a.id === target.id);
    assert.strictEqual(updated?.status, 'deferred');

    simplifyHomeworkAssignment(target.id);
    const simplified = getAllHomeworkAssignments().find((a) => a.id === target.id);
    assert.ok(simplified?.assignmentVersion! > updated?.assignmentVersion!);
  });
});

describe('Stage 19 & Global Theme System', () => {
  test('theme preference resolution and storage', () => {
    setStoredThemePreference('dark');
    assert.strictEqual(getStoredThemePreference(), 'dark');

    const resolvedDark = resolveTheme('dark');
    assert.strictEqual(resolvedDark, 'dark');

    const resolvedLight = resolveTheme('light');
    assert.strictEqual(resolvedLight, 'light');

    setStoredThemePreference('system');
    assert.strictEqual(getStoredThemePreference(), 'system');
  });

  test('applyThemeToDOM applies classes and data-theme attribute', () => {
    applyThemeToDOM('dark');
    if (typeof document !== 'undefined') {
      assert.strictEqual(document.documentElement.classList.contains('dark'), true);
      assert.strictEqual(document.documentElement.getAttribute('data-theme'), 'dark');
    }

    applyThemeToDOM('light');
    if (typeof document !== 'undefined') {
      assert.strictEqual(document.documentElement.classList.contains('light'), true);
      assert.strictEqual(document.documentElement.getAttribute('data-theme'), 'light');
    }
  });
});
