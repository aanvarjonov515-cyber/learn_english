/**
 * Persistent Chat Storage Service (Stage 17)
 * Manages chat conversations, paginated messages, lesson-specific context linking,
 * double-click prevention via requestId tracking, and message retry/cancellation.
 */

import { Conversation, PersistentChatMessage } from '../types';
import { isDemoModeActive } from './storage';

const CHAT_PREFIX = 'eta_persistent_chat_';
const DEMO_CHAT_PREFIX = 'eta_demo_persistent_chat_';

function getPrefix(): string {
  return isDemoModeActive() ? DEMO_CHAT_PREFIX : CHAT_PREFIX;
}

const chatMemoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return chatMemoryStore[key] || null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, val: string): void {
  if (typeof localStorage === 'undefined') {
    chatMemoryStore[key] = val;
    return;
  }
  try {
    localStorage.setItem(key, val);
  } catch {}
}

function seedDemoPersistentChat(): void {
  if (typeof localStorage === 'undefined') return;
  const prefix = DEMO_CHAT_PREFIX;
  if (safeGet(prefix + 'seeded')) return;

  const demoConv: Conversation = {
    id: 'conv_main_teacher',
    ownerId: 'usr_demo_01',
    title: 'Asosiy Ustoz bilan suhbat',
    lessonContext: {
      module: 'general',
      topicTitle: 'Umumiy ingliz tili muloqoti',
    },
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    lastMessageSnippet: 'Does bilan -s qoidasini tushundim, rahmat!',
    messageCount: 4,
  };

  const demoMessages: PersistentChatMessage[] = [
    {
      messageId: 'msg_p1',
      conversationId: 'conv_main_teacher',
      ownerId: 'usr_demo_01',
      role: 'assistant',
      content: 'Assalomu alaykum! Men sizning shaxsiy AI Ustozingizman. Bugun qaysi mavzu yoki dars bo‘yicha birgalikda ishlaymiz?',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      status: 'sent',
    },
    {
      messageId: 'msg_p2',
      conversationId: 'conv_main_teacher',
      ownerId: 'usr_demo_01',
      role: 'user',
      content: 'Ustoz, Present Simple da do va does ishlatilishi qanday farq qiladi?',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      status: 'sent',
    },
    {
      messageId: 'msg_p3',
      conversationId: 'conv_main_teacher',
      ownerId: 'usr_demo_01',
      role: 'assistant',
      content: 'I, you, we, they olmoshlari bilan "do" ishlatiladi: Do you speak English?\nHe, she, it (3-shaxs) bilan esa "does" ishlatiladi: Does she work here?\n\nDoes ishlatilganda asosiy fe’ldan -s tushib qoladi!',
      createdAt: new Date(Date.now() - 86400000 * 2 + 1000).toISOString(),
      status: 'sent',
      explanationMethodUsed: 'Sentence Comparison',
    },
    {
      messageId: 'msg_p4',
      conversationId: 'conv_main_teacher',
      ownerId: 'usr_demo_01',
      role: 'user',
      content: 'Tushunarli! Rahmat.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      status: 'sent',
    },
  ];

  safeSet(prefix + 'conversations', JSON.stringify([demoConv]));
  safeSet(prefix + 'msgs_conv_main_teacher', JSON.stringify(demoMessages));
  safeSet(prefix + 'seeded', 'true');
}

try {
  seedDemoPersistentChat();
} catch {}

export function getAllConversations(): Conversation[] {
  const raw = safeGet(getPrefix() + 'conversations');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getConversationById(id: string): Conversation | null {
  const all = getAllConversations();
  return all.find((c) => c.id === id) || null;
}

export function createConversation(title?: string, lessonContext?: Conversation['lessonContext']): Conversation {
  const all = getAllConversations();
  const now = new Date().toISOString();
  const newConv: Conversation = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ownerId: 'usr_demo_01',
    title: title || 'Yangi suhbat',
    lessonContext: lessonContext || { module: 'general', topicTitle: 'Umumiy dars' },
    createdAt: now,
    updatedAt: now,
    lastMessageSnippet: '',
    messageCount: 0,
  };

  all.unshift(newConv);
  safeSet(getPrefix() + 'conversations', JSON.stringify(all));
  return newConv;
}

export function renameConversation(id: string, newTitle: string): void {
  const all = getAllConversations();
  const idx = all.findIndex((c) => c.id === id);
  if (idx >= 0) {
    all[idx].title = newTitle;
    all[idx].updatedAt = new Date().toISOString();
    safeSet(getPrefix() + 'conversations', JSON.stringify(all));
  }
}

export function deleteConversation(id: string): void {
  const all = getAllConversations().filter((c) => c.id !== id);
  safeSet(getPrefix() + 'conversations', JSON.stringify(all));
  chatMemoryStore[getPrefix() + `msgs_${id}`] = '';
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(getPrefix() + `msgs_${id}`);
    } catch {}
  }
}

export interface PaginatedMessages {
  messages: PersistentChatMessage[];
  totalCount: number;
  hasMore: boolean;
  page: number;
}

export function getPaginatedMessages(conversationId: string, page = 1, pageSize = 20): PaginatedMessages {
  const key = getPrefix() + `msgs_${conversationId}`;
  const raw = safeGet(key);
  const all: PersistentChatMessage[] = raw ? JSON.parse(raw) : [];

  const totalCount = all.length;
  // Sort by createdAt ascending
  all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Return last `pageSize * page` messages for smooth pagination
  const startIndex = Math.max(0, totalCount - page * pageSize);
  const sliced = all.slice(startIndex);

  return {
    messages: sliced,
    totalCount,
    hasMore: startIndex > 0,
    page,
  };
}

export function addPersistentChatMessage(msg: PersistentChatMessage): PersistentChatMessage {
  const key = getPrefix() + `msgs_${msg.conversationId}`;
  const raw = safeGet(key);
  const all: PersistentChatMessage[] = raw ? JSON.parse(raw) : [];

  // Double-click idempotency check via requestId or messageId
  if (msg.requestId && all.some((m) => m.requestId === msg.requestId)) {
    return all.find((m) => m.requestId === msg.requestId)!;
  }

  const existingIdx = all.findIndex((m) => m.messageId === msg.messageId);
  if (existingIdx >= 0) {
    all[existingIdx] = msg;
  } else {
    all.push(msg);
  }

  safeSet(key, JSON.stringify(all));

  // Update conversation last snippet & count
  const conversations = getAllConversations();
  const cIdx = conversations.findIndex((c) => c.id === msg.conversationId);
  if (cIdx >= 0) {
    conversations[cIdx].lastMessageSnippet = msg.content.slice(0, 80);
    conversations[cIdx].messageCount = all.length;
    conversations[cIdx].updatedAt = new Date().toISOString();
    safeSet(getPrefix() + 'conversations', JSON.stringify(conversations));
  }

  return msg;
}

export function updatePersistentMessageStatus(
  conversationId: string,
  messageId: string,
  status: PersistentChatMessage['status'],
  newContent?: string
): void {
  const key = getPrefix() + `msgs_${conversationId}`;
  const raw = safeGet(key);
  if (!raw) return;
  const all: PersistentChatMessage[] = JSON.parse(raw);

  const idx = all.findIndex((m) => m.messageId === messageId);
  if (idx >= 0) {
    all[idx].status = status;
    if (newContent !== undefined) {
      all[idx].content = newContent;
    }
    safeSet(key, JSON.stringify(all));
  }
}
