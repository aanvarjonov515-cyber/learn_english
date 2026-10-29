/**
 * Text Tokenizer and Offset Service for English Reader
 * Splits English text into structured paragraphs, sentences, and tokens.
 * Accurately preserves apostrophes (don't, teacher's), hyphens (well-known),
 * and exact character offsets.
 */

import { ReadingToken } from '../types';

export interface ParagraphBlock {
  id: string;
  index: number;
  rawText: string;
  sentences: SentenceBlock[];
}

export interface SentenceBlock {
  id: string;
  paragraphId: string;
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  tokens: ReadingToken[];
}

/**
 * Tokenizes a multi-paragraph text into stable tokens with sentence context
 */
export function tokenizeText(
  documentId: string,
  rawText: string,
  contentVersion = 1
): ParagraphBlock[] {
  if (!rawText) return [];

  // Split into paragraphs by double newlines or single newlines
  const rawParagraphs = rawText.split(/\r?\n+/);
  const paragraphBlocks: ParagraphBlock[] = [];
  let globalOffset = 0;

  rawParagraphs.forEach((paraText, pIdx) => {
    const trimmed = paraText.trim();
    if (!trimmed) return;

    const paragraphId = `p_${pIdx + 1}`;
    const sentences = splitIntoSentences(
      documentId,
      contentVersion,
      paragraphId,
      paraText,
      globalOffset
    );

    paragraphBlocks.push({
      id: paragraphId,
      index: pIdx,
      rawText: paraText,
      sentences,
    });

    globalOffset += paraText.length + 1;
  });

  return paragraphBlocks;
}

/**
 * Splits a paragraph into sentences and creates tokens
 */
function splitIntoSentences(
  documentId: string,
  contentVersion: number,
  paragraphId: string,
  paraText: string,
  paraGlobalOffset: number
): SentenceBlock[] {
  // Regex to split on sentence terminators (.!?) followed by space or quote
  const sentenceRegex = /([^\.!\?]+[\.!\?]+["'”’]?|.+)/g;
  const matches = paraText.match(sentenceRegex) || [paraText];

  const sentences: SentenceBlock[] = [];
  let currentOffset = paraGlobalOffset;

  matches.forEach((sText, sIdx) => {
    if (!sText.trim()) return;

    const sentenceId = `${paragraphId}_s_${sIdx + 1}`;
    const sStart = currentOffset;
    const sEnd = sStart + sText.length;

    const tokens = tokenizeSentence(
      documentId,
      contentVersion,
      paragraphId,
      sentenceId,
      sText,
      sStart
    );

    sentences.push({
      id: sentenceId,
      paragraphId,
      index: sIdx,
      text: sText.trim(),
      startOffset: sStart,
      endOffset: sEnd,
      tokens,
    });

    currentOffset = sEnd;
  });

  return sentences;
}

/**
 * Tokenizes a single sentence preserving words with contractions/hyphens
 */
function tokenizeSentence(
  documentId: string,
  contentVersion: number,
  paragraphId: string,
  sentenceId: string,
  sentenceText: string,
  sentenceStartOffset: number
): ReadingToken[] {
  // Matches words with apostrophes/hyphens, or whitespace, or punctuation
  // e.g. "don't", "well-known", "father's", "hello", ",", " "
  const tokenRegex = /([a-zA-Z0-9]+(?:['’\-][a-zA-Z0-9]+)*)|(\s+)|([^a-zA-Z0-9\s])/g;
  const tokens: ReadingToken[] = [];
  let match: RegExpExecArray | null;
  let tokenCounter = 0;

  while ((match = tokenRegex.exec(sentenceText)) !== null) {
    const rawMatch = match[0];
    const matchIndex = match.index;
    const start = sentenceStartOffset + matchIndex;
    const end = start + rawMatch.length;

    let tokenType: ReadingToken['tokenType'] = 'punctuation';
    let cleanWord = '';

    if (match[1]) {
      tokenType = 'word';
      // Clean word strips curly quotes to standard
      cleanWord = rawMatch.replace(/[’]/g, "'").toLowerCase();
    } else if (match[2]) {
      tokenType = 'whitespace';
    }

    tokenCounter++;
    tokens.push({
      tokenId: `${sentenceId}_t_${tokenCounter}`,
      documentId,
      contentVersion,
      paragraphId,
      sentenceId,
      surfaceForm: rawMatch,
      cleanWord,
      startOffset: start,
      endOffset: end,
      tokenType,
    });
  }

  return tokens;
}

/**
 * Simple stable hash for caching lookups
 */
export function getLookupCacheKey(word: string, contextSentence: string): string {
  const normWord = word.trim().toLowerCase();
  const normSentence = contextSentence.trim().toLowerCase().slice(0, 100);
  let hash = 0;
  for (let i = 0; i < normSentence.length; i++) {
    hash = (hash << 5) - hash + normSentence.charCodeAt(i);
    hash |= 0;
  }
  return `dict_${normWord}_${Math.abs(hash)}`;
}
