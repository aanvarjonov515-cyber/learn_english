/**
 * Vocabulary Text and CSV Parser
 * Compliant with RFC 4180 via PapaParse and robust line-by-line TXT parser.
 */

import Papa from 'papaparse';

export interface ParsedInputItem {
  id: string;
  rawLine: string;
  englishWord: string;
  userTranslation?: string;
  warning?: string;
  isIncluded: boolean;
}

export interface ParseResult {
  items: ParsedInputItem[];
  detectedFormat: 'plain_list' | 'delimited_pairs' | 'csv';
  totalLines: number;
  warningsCount: number;
}

/**
 * Parses free text (line by line) with optional translation delimiters:
 * e.g. "apple — olma", "1. look after - g'amxo'rlik qilmoq", "take a break"
 */
export function parseRawTextLines(text: string): ParseResult {
  if (!text) {
    return { items: [], detectedFormat: 'plain_list', totalLines: 0, warningsCount: 0 };
  }

  const lines = text.split(/\r?\n/);
  const items: ParsedInputItem[] = [];
  let pairCount = 0;
  let warningsCount = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return; // skip empty lines

    // Remove leading numbers like "1. ", "1) ", "• "
    const cleanedLine = trimmed.replace(/^(\d+[\.\)]\s*|[\-\*\•]\s*)/, '').trim();

    // Look for common delimiters: "—", "-", ":", "=", "\t"
    const delimiterMatch = cleanedLine.match(/^([a-zA-Z0-9\s'’\-]+?)\s*(?:[—–\-=:]|\t)\s*(.+)$/);

    let english = cleanedLine;
    let translation: string | undefined = undefined;
    let warning: string | undefined = undefined;

    if (delimiterMatch) {
      english = delimiterMatch[1].trim();
      translation = delimiterMatch[2].trim();
      pairCount++;
    } else {
      // Check if line contains unexpected non-latin characters without delimiter
      if (/[а-яА-ЯёЁ]/.test(english) && !translation) {
        warning = "Qatorda kirill harflari bor, lekin tarjima ajratgichi (— yoki -) topilmadi.";
        warningsCount++;
      }
    }

    // Basic validity check
    if (!english) {
      warning = "Inglizcha so'z bo'sh.";
      warningsCount++;
    }

    items.push({
      id: `item_${index + 1}_${Date.now()}`,
      rawLine: trimmed,
      englishWord: english,
      userTranslation: translation,
      warning,
      isIncluded: !warning || warning.length === 0,
    });
  });

  const detectedFormat = pairCount > items.length * 0.3 ? 'delimited_pairs' : 'plain_list';

  return {
    items,
    detectedFormat,
    totalLines: lines.length,
    warningsCount,
  };
}

export interface CsvColumnMapping {
  wordColumn: string;
  translationColumn?: string;
  exampleColumn?: string;
  notesColumn?: string;
}

/**
 * Parses CSV content with PapaParse RFC 4180 compliance
 */
export function parseCsvContent(
  csvString: string,
  mapping?: CsvColumnMapping
): { items: ParsedInputItem[]; headers: string[]; errors: string[] } {
  const result = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = result.meta.fields || [];
  const errors = result.errors.map((e) => `Qator ${e.row || 0}: ${e.message}`);
  const items: ParsedInputItem[] = [];

  if (headers.length === 0 && Array.isArray(result.data)) {
    // Fallback if no header
    const rawParse = Papa.parse(csvString, { header: false, skipEmptyLines: true });
    (rawParse.data as string[][]).forEach((row, i) => {
      if (row.length > 0 && row[0]?.trim()) {
        items.push({
          id: `csv_${i + 1}`,
          rawLine: row.join(','),
          englishWord: row[0].trim(),
          userTranslation: row[1]?.trim() || undefined,
          isIncluded: true,
        });
      }
    });
    return { items, headers: [], errors };
  }

  // Determine auto mapping if not provided
  const wordKey =
    mapping?.wordColumn ||
    headers.find((h) => /word|english|term|so'z|ingliz/i.test(h)) ||
    headers[0];

  const translationKey =
    mapping?.translationColumn ||
    headers.find((h) => /translation|tarjima|uzbek|meaning|o'zbek/i.test(h));

  (result.data as Record<string, string>[]).forEach((row, idx) => {
    const english = (row[wordKey] || '').trim();
    const translation = translationKey ? (row[translationKey] || '').trim() : undefined;

    if (english) {
      items.push({
        id: `csv_row_${idx + 1}`,
        rawLine: JSON.stringify(row),
        englishWord: english,
        userTranslation: translation || undefined,
        isIncluded: true,
      });
    }
  });

  return { items, headers, errors };
}
