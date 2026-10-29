/**
 * Server-side Gemini AI Client and Handlers
 * Uses @google/genai SDK with gemini-3.8-flash and gemini-3.8-flash-lite-tts.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { TEACHER_SYSTEM_PROMPT } from './prompts/teacherPrompts';

// Initialize Gemini client strictly on server side with User-Agent header
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface EnrichInputItem {
  id: string;
  surfaceForm: string;
  userTranslation?: string;
}

export interface EnrichedVocabularySenseResult {
  id: string;
  lemma: string;
  partOfSpeech: string;
  translationUz: string;
  definitionEn: string;
  exampleEn: string;
  exampleUz: string;
  usageNote?: string;
}

/**
 * Enriches a batch of vocabulary items using gemini-3.8-flash with structured schema output
 */
export async function enrichVocabularyBatch(
  items: EnrichInputItem[]
): Promise<EnrichedVocabularySenseResult[]> {
  if (!items || items.length === 0) return [];

  const prompt = `Translate and enrich the following English words/phrases for Uzbek language learners:
${JSON.stringify(items, null, 2)}

Requirements:
- Provide the base lemma (dictionary form).
- Provide the correct part of speech (e.g. noun, verb, phrasal verb, adjective).
- Provide an accurate Uzbek translation. If the user already provided a userTranslation, use it or provide the most natural Uzbek equivalent.
- Provide a concise English definition.
- Provide a clear, natural English example sentence at CEFR A2/B1 level.
- Provide an accurate Uzbek translation of that example sentence.
- Provide an optional usage note if the word is frequently confused or polysemous.
- Preserve the exact "id" from input.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction:
        "You are an expert English-Uzbek linguist, lexicographer, and educator. Always produce structured, high-quality educational data.",
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            lemma: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            translationUz: { type: Type.STRING },
            definitionEn: { type: Type.STRING },
            exampleEn: { type: Type.STRING },
            exampleUz: { type: Type.STRING },
            usageNote: { type: Type.STRING },
          },
          required: ['id', 'lemma', 'translationUz', 'exampleEn', 'exampleUz'],
        },
      },
    },
  });

  const text = response.text?.trim() || '[]';
  const parsed = JSON.parse(text) as EnrichedVocabularySenseResult[];
  return parsed;
}

export interface ContextualLookupInput {
  word: string;
  sentence: string;
  contextBefore?: string;
  contextAfter?: string;
  phrase?: string;
}

export interface ContextualLookupOutput {
  word: string;
  lemma: string;
  partOfSpeech: string;
  contextualTranslationUz: string;
  shortDefinitionEn: string;
  contextSentence: string;
  exampleEn: string;
  exampleUz: string;
  usageNote?: string;
  isPhrase?: boolean;
  phraseDetected?: string;
}

/**
 * Looks up contextual translation of a word or phrase within a specific sentence
 */
export async function lookupContextualMeaning(
  input: ContextualLookupInput
): Promise<ContextualLookupOutput> {
  const prompt = `Target Word or Phrase: "${input.phrase || input.word}"
Target Sentence Context: "${input.sentence}"
${input.contextBefore ? `Preceding text: "${input.contextBefore}"` : ''}
${input.contextAfter ? `Following text: "${input.contextAfter}"` : ''}

Determine the EXACT contextual meaning of this word or phrase in THIS specific sentence.
For example, if the sentence is "He sat on the bank of the river", "bank" is "daryo qirg'og'i" (nature), NOT "moliya banki" (finance).
Detect if this word forms a recognized idiom or phrasal verb (such as "look after", "take a break", "give up").`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction:
        "You are an expert bilingual contextual English-Uzbek dictionary for language learners. Provide precise contextual translations.",
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          lemma: { type: Type.STRING },
          partOfSpeech: { type: Type.STRING },
          contextualTranslationUz: { type: Type.STRING },
          shortDefinitionEn: { type: Type.STRING },
          exampleEn: { type: Type.STRING },
          exampleUz: { type: Type.STRING },
          usageNote: { type: Type.STRING },
          isPhrase: { type: Type.BOOLEAN },
          phraseDetected: { type: Type.STRING },
        },
        required: [
          'word',
          'lemma',
          'partOfSpeech',
          'contextualTranslationUz',
          'shortDefinitionEn',
          'exampleEn',
          'exampleUz',
        ],
      },
    },
  });

  const text = response.text?.trim() || '{}';
  const parsed = JSON.parse(text);
  return {
    ...parsed,
    contextSentence: input.sentence,
  };
}

/**
 * Generates natural audio pronunciation using gemini-3.8-flash-lite-tts
 */
/**
 * Generates natural audio pronunciation using gemini-3.8-flash-lite-tts
 */
export async function generateSpeechWav(
  text: string,
  voiceName = 'Kore',
  style = 'Clear, articulate, natural English teacher pronunciation'
): Promise<Buffer> {
  // Validate voice name against official prebuilts: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
  const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
  const safeVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash-lite-tts',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: text.slice(0, 800), // Provider safety limit per chunk
            speechMetadata: {
              style,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: safeVoice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('TTS audio data was empty');
  }

  return Buffer.from(base64Audio, 'base64');
}

/**
 * Transcribes pre-recorded listening audio using gemini-3.5-transcribe
 */
export async function transcribeAudio(
  base64Audio: string,
  mimeType = 'audio/mp3'
): Promise<string> {
  const audioPart = {
    inlineData: {
      mimeType,
      data: base64Audio,
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        audioPart,
        {
          text: 'Transcribe this English audio exactly as spoken into clear written English text. Maintain natural capitalization and punctuation.',
        },
      ],
    },
  });

  return response.text?.trim() || '';
}

export interface GrammarExplainInput {
  bookTitle: string;
  printedPageLabel: string;
  pageText: string;
  selectedText?: string;
  promptType:
    | 'explain_page'
    | 'explain_sentence'
    | 'simplify_rule'
    | 'give_examples'
    | 'ask_quiz'
    | 'check_answer';
  userQuestion?: string;
  userAnswer?: string;
}

export interface GrammarExplainOutput {
  explanationUz: string;
  keyRuleUz: string;
  examples: { en: string; uz: string }[];
  checkQuestion?: string;
}

/**
 * Explains textbook grammar grounded in the specific page and printedPageLabel
 */
export async function explainGrammarPage(
  input: GrammarExplainInput
): Promise<GrammarExplainOutput> {
  const prompt = `Textbook: "${input.bookTitle}", Page: ${input.printedPageLabel}
Current Page Text Content:
"""
${input.pageText.slice(0, 3000)}
"""
${input.selectedText ? `Target Selection: "${input.selectedText}"` : ''}
${input.userQuestion ? `User Question: "${input.userQuestion}"` : ''}
${input.userAnswer ? `User Answer to check: "${input.userAnswer}"` : ''}
Action Type: ${input.promptType}

Provide an educational, clear explanation in Uzbek language.
Follow these pedagogical rules:
1. Short clear grammatical rule in Uzbek (keyRuleUz).
2. Concise explanation tailored for an English learner in Uzbek (explanationUz).
3. 2 simple CEFR A2/B1 level examples with Uzbek translation.
4. 1 short checking quiz question to test understanding (checkQuestion).
Never claim you see content not present in the provided text.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction:
        "You are an expert English grammar teacher for Uzbek learners. Always explain grammar concepts clearly, warmly, and concisely in Uzbek.",
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          keyRuleUz: { type: Type.STRING },
          explanationUz: { type: Type.STRING },
          examples: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                en: { type: Type.STRING },
                uz: { type: Type.STRING },
              },
              required: ['en', 'uz'],
            },
          },
          checkQuestion: { type: Type.STRING },
        },
        required: ['keyRuleUz', 'explanationUz', 'examples'],
      },
    },
  });

  const text = response.text?.trim() || '{}';
  return JSON.parse(text);
}

/**
 * Suggests units and topics from textbook Table of Contents
 */
export async function suggestBookStructure(tocText: string): Promise<any[]> {
  const prompt = `Analyze this textbook Table of Contents or outline text and extract structured units:
"""
${tocText.slice(0, 4000)}
"""
Extract the units with unitNumber, title, startPdfPage, endPdfPage, and key topics.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction:
        "You are an expert curriculum designer. Extract structured units from textbook outlines.",
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            unitNumber: { type: Type.INTEGER },
            title: { type: Type.STRING },
            startPdfPage: { type: Type.INTEGER },
            endPdfPage: { type: Type.INTEGER },
            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  grammarRuleUz: { type: Type.STRING },
                },
                required: ['title'],
              },
            },
          },
          required: ['unitNumber', 'title', 'startPdfPage', 'endPdfPage'],
        },
      },
    },
  });

  const text = response.text?.trim() || '[]';
  return JSON.parse(text);
}

export interface TeacherTurnInput {
  sessionState: string;
  userMessage: string;
  context: {
    userLevel: string;
    topicTitle?: string;
    goals?: string[];
    bookTitle?: string;
    printedPageLabel?: string;
    pageTextSnippet?: string;
    recentMistakes?: string[];
    consecutiveErrors?: number;
    userActionTag?: string;
  };
}

export interface TeacherTurnOutput {
  teacherTextUz: string;
  suggestedNextState: string;
  isCorrect?: boolean;
  targetedRule?: string;
  action?: {
    type: string;
    titleUz: string;
    payload: any;
  };
  adaptiveHintUz?: string;
  sessionSummary?: {
    topicsCovered: string[];
    exercisesCompleted: number;
    independentSuccesses: number;
    repeatedMistakes: string[];
    hintsUsedCount: number;
    nextRecommendationUz: string;
  };
}

/**
 * Conducts one pedagogical turn of an AI Teacher interactive lesson
 */
export async function conductTeacherTurn(
  input: TeacherTurnInput
): Promise<TeacherTurnOutput> {
  const prompt = `You are "AI Teacher" in the English Teacher AI app for Uzbek learners.
You are patient, encouraging, transparently an AI assistant, clear, non-condescending, and pedagogical.
You explain grammar/vocabulary rules in clear, accessible Uzbek, accompanied by simple, authentic English examples.

Current Lesson Context:
- Session State: ${input.sessionState}
- Learner Level: ${input.context.userLevel || 'A2'}
- Target Topic: ${input.context.topicTitle || 'General English Lesson'}
- Lesson Goals: ${JSON.stringify(input.context.goals || ['Present Simple affirmative with -s/-es'])}
- Active Book: ${input.context.bookTitle || 'General'} (Page ${input.context.printedPageLabel || 'N/A'})
- Page Snippet: "${(input.context.pageTextSnippet || '').slice(0, 300)}"
- Recent Mistakes / Weak Points: ${JSON.stringify(input.context.recentMistakes || [])}
- Consecutive Errors: ${input.context.consecutiveErrors || 0}
- Special User Action Tag: ${input.context.userActionTag || 'none'}

User's Input / Action:
"${input.userMessage}"

Pedagogical Rules:
1. If user says "He go to school every day", acknowledge the intended meaning kindly, explain that for he/she/it in Present Simple affirmative we add -s/-es ("goes"), provide the correct sentence, and immediately give a fresh check question: "She ___ English every evening."
2. If consecutive errors >= 2, simplify the explanation, break it down step-by-step, and provide a guided question.
3. If user clicked "Tushunmadim" or "Soddaroq ayt", re-explain the rule using everyday analogies in Uzbek and a simpler example.
4. If user clicked "Boshqa misol", provide 2 fresh contrasting examples with Uzbek translations.
5. If user asks "Javobni ko'rsat", show the answer gently with an explanation, and provide a new transfer practice question.
6. Provide structured output with teacherTextUz, suggestedNextState, and optional action.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction:
        "You are an expert, patient English teacher for Uzbek speakers. Provide clear pedagogical guidance in Uzbek with structured data.",
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          teacherTextUz: { type: Type.STRING },
          suggestedNextState: { type: Type.STRING },
          isCorrect: { type: Type.BOOLEAN },
          targetedRule: { type: Type.STRING },
          action: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              titleUz: { type: Type.STRING },
              payload: {
                type: Type.OBJECT,
                properties: {
                  questionText: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  exampleEn: { type: Type.STRING },
                  exampleUz: { type: Type.STRING },
                  writingPrompt: { type: Type.STRING },
                  targetGrammar: { type: Type.STRING },
                },
              },
            },
            required: ['type', 'titleUz'],
          },
          adaptiveHintUz: { type: Type.STRING },
          sessionSummary: {
            type: Type.OBJECT,
            properties: {
              topicsCovered: { type: Type.ARRAY, items: { type: Type.STRING } },
              exercisesCompleted: { type: Type.INTEGER },
              independentSuccesses: { type: Type.INTEGER },
              repeatedMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
              hintsUsedCount: { type: Type.INTEGER },
              nextRecommendationUz: { type: Type.STRING },
            },
          },
        },
        required: ['teacherTextUz', 'suggestedNextState'],
      },
    },
  });

  const text = response.text?.trim() || '{}';
  return JSON.parse(text);
}

export interface WritingEvaluationInput {
  taskTitle: string;
  instructionUz: string;
  targetLevel: string;
  targetGrammarPoints: string[];
  originalText: string;
  wordCount: number;
}

export interface WritingEvaluationOutput {
  summaryUz: string;
  overallAssessment: 'goal_achieved' | 'partially_achieved' | 'needs_more_practice' | 'unclear_too_short';
  strengths: string[];
  issues: {
    issueId: string;
    category:
      | 'target_grammar'
      | 'general_grammar'
      | 'vocabulary_choice'
      | 'spelling'
      | 'punctuation'
      | 'style_suggestion'
      | 'meaning_clarity';
    severity: 'error' | 'warning' | 'suggestion';
    originalSpan: string;
    startOffset: number;
    endOffset: number;
    explanationUz: string;
    suggestedCorrection: string;
    targetRule:
      | 'thirdPersonSingular'
      | 'doDoes'
      | 'articleUsage'
      | 'wordOrder'
      | 'subjectVerbAgreement'
      | 'tenseChoice'
      | 'spelling'
      | 'other';
    isTargetGrammar: boolean;
  }[];
  nextStepUz: string;
  fullExemplarCorrection?: string;
  followUpTransferTask?: {
    titleUz: string;
    instructionUz: string;
    promptEn: string;
  };
}

/**
 * Evaluates a daily writing submission with structured feedback, offset validation,
 * and canonical rule categorization
 */
export async function evaluateWritingSubmission(
  input: WritingEvaluationInput
): Promise<WritingEvaluationOutput> {
  const prompt = `Writing Task: "${input.taskTitle}"
Instructions (Uzbek): "${input.instructionUz}"
Target Level: ${input.targetLevel}
Target Grammar Points: ${JSON.stringify(input.targetGrammarPoints)}

Learner's Original Text (${input.wordCount} words):
"${input.originalText}"

Evaluation Requirements:
1. Differentiate target grammar vs other grammar, spelling, punctuation, and stylistic suggestions. Do not mark simple, correct sentences as errors simply because they are not complex.
2. For each issue:
   - Identify exact "originalSpan" that appears in the text.
   - Provide accurate character startOffset and endOffset inside learner's text.
   - Categorize under canonical rule: 'thirdPersonSingular' | 'doDoes' | 'articleUsage' | 'wordOrder' | 'subjectVerbAgreement' | 'tenseChoice' | 'spelling' | 'other'.
   - Clear, supportive explanation in Uzbek.
3. Provide strengths (concrete aspects done well, not empty praise).
4. Provide an overall assessment: 'goal_achieved' | 'partially_achieved' | 'needs_more_practice' | 'unclear_too_short'.
5. Provide a full exemplar correction and a short independent follow-up transfer prompt.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction:
        "You are an encouraging, rigorous English writing assessor for Uzbek learners. Always provide structured, objective evaluations.",
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summaryUz: { type: Type.STRING },
          overallAssessment: {
            type: Type.STRING,
            enum: ['goal_achieved', 'partially_achieved', 'needs_more_practice', 'unclear_too_short'],
          },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                issueId: { type: Type.STRING },
                category: {
                  type: Type.STRING,
                  enum: [
                    'target_grammar',
                    'general_grammar',
                    'vocabulary_choice',
                    'spelling',
                    'punctuation',
                    'style_suggestion',
                    'meaning_clarity',
                  ],
                },
                severity: { type: Type.STRING, enum: ['error', 'warning', 'suggestion'] },
                originalSpan: { type: Type.STRING },
                startOffset: { type: Type.INTEGER },
                endOffset: { type: Type.INTEGER },
                explanationUz: { type: Type.STRING },
                suggestedCorrection: { type: Type.STRING },
                targetRule: {
                  type: Type.STRING,
                  enum: [
                    'thirdPersonSingular',
                    'doDoes',
                    'articleUsage',
                    'wordOrder',
                    'subjectVerbAgreement',
                    'tenseChoice',
                    'spelling',
                    'other',
                  ],
                },
                isTargetGrammar: { type: Type.BOOLEAN },
              },
              required: [
                'issueId',
                'category',
                'severity',
                'originalSpan',
                'explanationUz',
                'suggestedCorrection',
                'targetRule',
                'isTargetGrammar',
              ],
            },
          },
          nextStepUz: { type: Type.STRING },
          fullExemplarCorrection: { type: Type.STRING },
          followUpTransferTask: {
            type: Type.OBJECT,
            properties: {
              titleUz: { type: Type.STRING },
              instructionUz: { type: Type.STRING },
              promptEn: { type: Type.STRING },
            },
            required: ['titleUz', 'instructionUz', 'promptEn'],
          },
        },
        required: ['summaryUz', 'overallAssessment', 'strengths', 'issues', 'nextStepUz'],
      },
    },
  });

  const text = response.text?.trim() || '{}';
  const parsed = JSON.parse(text) as WritingEvaluationOutput;

  // Post-processing: Validate and recalibrate offsets against learner's actual text
  if (parsed.issues && Array.isArray(parsed.issues)) {
    parsed.issues = parsed.issues.map((iss, idx) => {
      let start = iss.startOffset ?? -1;
      let end = iss.endOffset ?? -1;

      // Check if substring matches
      const span = iss.originalSpan;
      if (
        span &&
        (start < 0 ||
          end <= start ||
          input.originalText.slice(start, end) !== span)
      ) {
        // Recalibrate with exact match
        const found = input.originalText.indexOf(span);
        if (found !== -1) {
          start = found;
          end = found + span.length;
        } else {
          start = 0;
          end = span.length;
        }
      }

      return {
        ...iss,
        issueId: iss.issueId || `iss_${idx + 1}`,
        startOffset: Math.max(0, start),
        endOffset: Math.max(0, end),
      };
    });
  }

  return parsed;
}

export interface PersistentChatInput {
  conversationId: string;
  userMessage: string;
  recentMessages: { role: string; content: string }[];
  learnerMemorySummary?: string;
  lessonContext?: {
    module?: string;
    topicTitle?: string;
    bookId?: string;
    printedPageLabel?: string;
  };
  previousExplanationsSummary?: string;
}

export interface PersistentChatOutput {
  teacherResponseUz: string;
  explanationMethodUsed: string;
  action?: {
    type: string;
    titleUz: string;
    payload: any;
  };
}

/**
 * Conducts one turn of persistent free-form AI Teacher chat with context selection,
 * memory integration, diverse explanation methods, and pedagogical rules.
 */
export async function conductPersistentTeacherChat(
  input: PersistentChatInput
): Promise<PersistentChatOutput> {
  const prompt = `
Lesson / Module Context: ${JSON.stringify(input.lessonContext || { module: 'general', topicTitle: 'General Conversation' })}
Learner Memory Records:
${input.learnerMemorySummary || 'None'}

Previous Explanations / Examples Used Recently:
${input.previousExplanationsSummary || 'None'}

Recent Conversation History:
${JSON.stringify(input.recentMessages.slice(-6))}

User's Latest Message:
"${input.userMessage}"

Respond in Uzbek following TEACHER_SYSTEM_PROMPT directives.
Select ONE explanation method used (e.g. 'Simple Rule', 'Everyday Life Example', 'Sentence Comparison', 'Sentence Breakdown', 'Single Mistake Analysis', 'Guided Question', 'Short Table', 'Joint Sentence Construction', 'Uzbek vs English Difference').
If applicable, suggest a structured action (e.g. 'createHomework', 'startExercise', 'openBookPage', 'prepareReviewSession', 'proposeWritingTask', 'addDailyPlanTask').
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: TEACHER_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          teacherResponseUz: { type: Type.STRING },
          explanationMethodUsed: { type: Type.STRING },
          action: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              titleUz: { type: Type.STRING },
              payload: { type: Type.OBJECT },
            },
            required: ['type', 'titleUz'],
          },
        },
        required: ['teacherResponseUz', 'explanationMethodUsed'],
      },
    },
  });

  const text = response.text?.trim() || '{}';
  return JSON.parse(text);
}
