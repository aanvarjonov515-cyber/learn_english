/**
 * Speech Normalizer Service (TTS Text Preprocessing)
 * Cleans markdown, symbols, emojis, and grammar notation (-s/-es) into natural speech-friendly text.
 */

export function normalizeTextForSpeech(text: string): string {
  if (!text) return '';

  let cleaned = text
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/`([^`]+)`/g, '$1')
    // Remove headers
    .replace(/#{1,6}\s+/g, '')
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Normalize grammar notation like -s / -es / -ed
    .replace(/\b-s\b/gi, ' s qo‘shimchasi ')
    .replace(/\b-es\b/gi, ' es qo‘shimchasi ')
    .replace(/\b-ed\b/gi, ' ed qo‘shimchasi ')
    .replace(/\b-ing\b/gi, ' ing qo‘shimchasi ')
    .replace(/-s\/-es/gi, ' s yoki es qo‘shimchasi ')
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/g, ' havola ')
    // Remove emojis and special icons
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    // Normalize punctuation pauses
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}
