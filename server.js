// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// src/server/gemini.ts
import { GoogleGenAI, Type } from "@google/genai";

// src/server/prompts/teacherPrompts.ts
var TEACHER_SYSTEM_PROMPT = `You are "AI Teacher" in the English Teacher AI application.
You are an intelligent, polite, calm, warm, and highly pedagogical English language teacher for Uzbek learners.

IDENTITY & BOUNDARIES:
1. You are transparently an AI Teacher assistant. Do NOT pretend to be a human or claim false emotional/physical dependencies ("Men tuni bilan uxlamay sizni kutdim", "Inson kabi sizni ko'rib turibman").
2. Standard polite Uzbek address: ALWAYS use "Siz" (polite address) by default. Only use informal ("Sen") if the user explicitly requests an informal tone.
3. Be calm, polite, respectful, and concise.

CONVERSATION & TONE RULES (CRITICAL):
1. Direct Answer First: Answer the user's specific question directly in the very first sentence.
2. No Repetitive Greetings: Do NOT start every message with "Assalomu alaykum", "Xayrli kun", or "Salom!". Only greet once at the start of a brand new conversation.
3. No Repetitive Name Mentioning: Do NOT repeat the user's name in every single turn.
4. No Repetitive Praise: Avoid repeating generic praise like "Barakalla!", "Juda zo'r!", "O'ta aqllisiz!" on every turn. Focus on constructive feedback.
5. No Repetitive Closing Lines: Do NOT end every response with "Yana qanday yordam beray?" or "Sizga yana nimani tushuntiray?".
6. Single Question Limit: Never ask more than ONE check/practice question in a single message.
7. Minimal Emojis: Use at most 1-2 subtle emojis per message (e.g. \u{1F4DA}, \u2728).
8. Mistakes Attribution: Never link mistakes to personal intelligence or capability ("Siz e'tiborsizsiz", "Kallangiz ishlamayapti"). Attribute mistakes to rule complexity ("Bu qoida biroz chalg'ituvchi", "Aynan shu kabi holatlarda ko'pchilik adashadi").
9. Workload Reduction: If the user says they are tired or busy, immediately reduce the task size or offer a break.
10. Short Answer for Short Question: If user asks a quick question, give a quick 1-3 line direct answer. Do not write a dissertation for a simple question.

EXPLANATION METHODS (Vary your approach):
When explaining a concept, choose ONE appropriate method based on context:
- Simple Rule (Sodda qoida)
- Everyday Life Example (Kundalik hayot misoli)
- Sentence Comparison (Ikki gapni solishtirish)
- Sentence Breakdown (Gapni qismlarga ajratish)
- Single Mistake Analysis (Bitta xatoni tahlil qilish)
- Guided Question (Savol orqali yo'naltirish)
- Short Table (Qisqa jadval)
- Joint Sentence Construction (Birgalikda gap tuzish)
- Uzbek vs English Difference (Inglizcha va o'zbekchadagi farq)

HANDLING "TUSHUNMADIM" (I DID NOT UNDERSTAND):
1. Do NOT copy-paste your previous answer. Choose a DIFFERENT explanation method!
2. Identify the specific tricky element (e.g., third-person -s vs auxiliary does).
3. Provide a simpler everyday life analogy or contrast.
4. Work through ONE example step-by-step together.
5. Provide ONE fresh practice question in a NEW context.

EXAMPLES & NON-REPETITION:
- Always check the context to see what examples were used previously. Never re-use the exact same sentence if the user already solved or struggled with it.
- Never output deterministic robot boilerplate. Generate natural, contextually accurate Uzbek explanation.
`;

// src/server/gemini.ts
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
async function enrichVocabularyBatch(items) {
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
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are an expert English-Uzbek linguist, lexicographer, and educator. Always produce structured, high-quality educational data.",
      responseMimeType: "application/json",
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
            usageNote: { type: Type.STRING }
          },
          required: ["id", "lemma", "translationUz", "exampleEn", "exampleUz"]
        }
      }
    }
  });
  const text = response.text?.trim() || "[]";
  const parsed = JSON.parse(text);
  return parsed;
}
async function lookupContextualMeaning(input) {
  const prompt = `Target Word or Phrase: "${input.phrase || input.word}"
Target Sentence Context: "${input.sentence}"
${input.contextBefore ? `Preceding text: "${input.contextBefore}"` : ""}
${input.contextAfter ? `Following text: "${input.contextAfter}"` : ""}

Determine the EXACT contextual meaning of this word or phrase in THIS specific sentence.
For example, if the sentence is "He sat on the bank of the river", "bank" is "daryo qirg'og'i" (nature), NOT "moliya banki" (finance).
Detect if this word forms a recognized idiom or phrasal verb (such as "look after", "take a break", "give up").`;
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are an expert bilingual contextual English-Uzbek dictionary for language learners. Provide precise contextual translations.",
      responseMimeType: "application/json",
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
          phraseDetected: { type: Type.STRING }
        },
        required: [
          "word",
          "lemma",
          "partOfSpeech",
          "contextualTranslationUz",
          "shortDefinitionEn",
          "exampleEn",
          "exampleUz"
        ]
      }
    }
  });
  const text = response.text?.trim() || "{}";
  const parsed = JSON.parse(text);
  return {
    ...parsed,
    contextSentence: input.sentence
  };
}
async function generateSpeechWav(text, voiceName = "Kore", style = "Clear, articulate, natural English teacher pronunciation") {
  const validVoices = ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"];
  const safeVoice = validVoices.includes(voiceName) ? voiceName : "Kore";
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash-lite-tts",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: text.slice(0, 800),
            // Provider safety limit per chunk
            speechMetadata: {
              style
            }
          }
        ]
      }
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: safeVoice }
        }
      }
    }
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("TTS audio data was empty");
  }
  return Buffer.from(base64Audio, "base64");
}
async function transcribeAudio(base64Audio, mimeType = "audio/mp3") {
  const audioPart = {
    inlineData: {
      mimeType,
      data: base64Audio
    }
  };
  const response = await ai.models.generateContent({
    model: "gemini-3.5-transcribe",
    contents: {
      parts: [
        audioPart,
        {
          text: "Transcribe this English audio exactly as spoken into clear written English text. Maintain natural capitalization and punctuation."
        }
      ]
    }
  });
  return response.text?.trim() || "";
}
async function explainGrammarPage(input) {
  const prompt = `Textbook: "${input.bookTitle}", Page: ${input.printedPageLabel}
Current Page Text Content:
"""
${input.pageText.slice(0, 3e3)}
"""
${input.selectedText ? `Target Selection: "${input.selectedText}"` : ""}
${input.userQuestion ? `User Question: "${input.userQuestion}"` : ""}
${input.userAnswer ? `User Answer to check: "${input.userAnswer}"` : ""}
Action Type: ${input.promptType}

Provide an educational, clear explanation in Uzbek language.
Follow these pedagogical rules:
1. Short clear grammatical rule in Uzbek (keyRuleUz).
2. Concise explanation tailored for an English learner in Uzbek (explanationUz).
3. 2 simple CEFR A2/B1 level examples with Uzbek translation.
4. 1 short checking quiz question to test understanding (checkQuestion).
Never claim you see content not present in the provided text.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are an expert English grammar teacher for Uzbek learners. Always explain grammar concepts clearly, warmly, and concisely in Uzbek.",
      responseMimeType: "application/json",
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
                uz: { type: Type.STRING }
              },
              required: ["en", "uz"]
            }
          },
          checkQuestion: { type: Type.STRING }
        },
        required: ["keyRuleUz", "explanationUz", "examples"]
      }
    }
  });
  const text = response.text?.trim() || "{}";
  return JSON.parse(text);
}
async function suggestBookStructure(tocText) {
  const prompt = `Analyze this textbook Table of Contents or outline text and extract structured units:
"""
${tocText.slice(0, 4e3)}
"""
Extract the units with unitNumber, title, startPdfPage, endPdfPage, and key topics.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are an expert curriculum designer. Extract structured units from textbook outlines.",
      responseMimeType: "application/json",
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
                  grammarRuleUz: { type: Type.STRING }
                },
                required: ["title"]
              }
            }
          },
          required: ["unitNumber", "title", "startPdfPage", "endPdfPage"]
        }
      }
    }
  });
  const text = response.text?.trim() || "[]";
  return JSON.parse(text);
}
async function conductTeacherTurn(input) {
  const prompt = `You are "AI Teacher" in the English Teacher AI app for Uzbek learners.
You are patient, encouraging, transparently an AI assistant, clear, non-condescending, and pedagogical.
You explain grammar/vocabulary rules in clear, accessible Uzbek, accompanied by simple, authentic English examples.

Current Lesson Context:
- Session State: ${input.sessionState}
- Learner Level: ${input.context.userLevel || "A2"}
- Target Topic: ${input.context.topicTitle || "General English Lesson"}
- Lesson Goals: ${JSON.stringify(input.context.goals || ["Present Simple affirmative with -s/-es"])}
- Active Book: ${input.context.bookTitle || "General"} (Page ${input.context.printedPageLabel || "N/A"})
- Page Snippet: "${(input.context.pageTextSnippet || "").slice(0, 300)}"
- Recent Mistakes / Weak Points: ${JSON.stringify(input.context.recentMistakes || [])}
- Consecutive Errors: ${input.context.consecutiveErrors || 0}
- Special User Action Tag: ${input.context.userActionTag || "none"}

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
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are an expert, patient English teacher for Uzbek speakers. Provide clear pedagogical guidance in Uzbek with structured data.",
      responseMimeType: "application/json",
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
                  targetGrammar: { type: Type.STRING }
                }
              }
            },
            required: ["type", "titleUz"]
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
              nextRecommendationUz: { type: Type.STRING }
            }
          }
        },
        required: ["teacherTextUz", "suggestedNextState"]
      }
    }
  });
  const text = response.text?.trim() || "{}";
  return JSON.parse(text);
}
async function evaluateWritingSubmission(input) {
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
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are an encouraging, rigorous English writing assessor for Uzbek learners. Always provide structured, objective evaluations.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summaryUz: { type: Type.STRING },
          overallAssessment: {
            type: Type.STRING,
            enum: ["goal_achieved", "partially_achieved", "needs_more_practice", "unclear_too_short"]
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
                    "target_grammar",
                    "general_grammar",
                    "vocabulary_choice",
                    "spelling",
                    "punctuation",
                    "style_suggestion",
                    "meaning_clarity"
                  ]
                },
                severity: { type: Type.STRING, enum: ["error", "warning", "suggestion"] },
                originalSpan: { type: Type.STRING },
                startOffset: { type: Type.INTEGER },
                endOffset: { type: Type.INTEGER },
                explanationUz: { type: Type.STRING },
                suggestedCorrection: { type: Type.STRING },
                targetRule: {
                  type: Type.STRING,
                  enum: [
                    "thirdPersonSingular",
                    "doDoes",
                    "articleUsage",
                    "wordOrder",
                    "subjectVerbAgreement",
                    "tenseChoice",
                    "spelling",
                    "other"
                  ]
                },
                isTargetGrammar: { type: Type.BOOLEAN }
              },
              required: [
                "issueId",
                "category",
                "severity",
                "originalSpan",
                "explanationUz",
                "suggestedCorrection",
                "targetRule",
                "isTargetGrammar"
              ]
            }
          },
          nextStepUz: { type: Type.STRING },
          fullExemplarCorrection: { type: Type.STRING },
          followUpTransferTask: {
            type: Type.OBJECT,
            properties: {
              titleUz: { type: Type.STRING },
              instructionUz: { type: Type.STRING },
              promptEn: { type: Type.STRING }
            },
            required: ["titleUz", "instructionUz", "promptEn"]
          }
        },
        required: ["summaryUz", "overallAssessment", "strengths", "issues", "nextStepUz"]
      }
    }
  });
  const text = response.text?.trim() || "{}";
  const parsed = JSON.parse(text);
  if (parsed.issues && Array.isArray(parsed.issues)) {
    parsed.issues = parsed.issues.map((iss, idx) => {
      let start = iss.startOffset ?? -1;
      let end = iss.endOffset ?? -1;
      const span = iss.originalSpan;
      if (span && (start < 0 || end <= start || input.originalText.slice(start, end) !== span)) {
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
        endOffset: Math.max(0, end)
      };
    });
  }
  return parsed;
}
async function conductPersistentTeacherChat(input) {
  const prompt = `
Lesson / Module Context: ${JSON.stringify(input.lessonContext || { module: "general", topicTitle: "General Conversation" })}
Learner Memory Records:
${input.learnerMemorySummary || "None"}

Previous Explanations / Examples Used Recently:
${input.previousExplanationsSummary || "None"}

Recent Conversation History:
${JSON.stringify(input.recentMessages.slice(-6))}

User's Latest Message:
"${input.userMessage}"

Respond in Uzbek following TEACHER_SYSTEM_PROMPT directives.
Select ONE explanation method used (e.g. 'Simple Rule', 'Everyday Life Example', 'Sentence Comparison', 'Sentence Breakdown', 'Single Mistake Analysis', 'Guided Question', 'Short Table', 'Joint Sentence Construction', 'Uzbek vs English Difference').
If applicable, suggest a structured action (e.g. 'createHomework', 'startExercise', 'openBookPage', 'prepareReviewSession', 'proposeWritingTask', 'addDailyPlanTask').
`;
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      systemInstruction: TEACHER_SYSTEM_PROMPT,
      responseMimeType: "application/json",
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
              payload: { type: Type.OBJECT }
            },
            required: ["type", "titleUz"]
          }
        },
        required: ["teacherResponseUz", "explanationMethodUsed"]
      }
    }
  });
  const text = response.text?.trim() || "{}";
  return JSON.parse(text);
}

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);
  app.use(express.json({ limit: "10mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      time: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.post("/api/vocabulary/enrich", async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "So'zlar ro'yxati berilmadi." });
      }
      if (items.length > 50) {
        return res.status(400).json({ error: "Bitta so'rovda ko'pi bilan 50 ta so'z yuborish mumkin." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: "GEMINI_API_KEY sozlanmagan. Iltimos, Secrets panelidan API kalitni tekshiring."
        });
      }
      const chunkSize = 15;
      const allResults = [];
      const errors = [];
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        try {
          const chunkResults = await enrichVocabularyBatch(chunk);
          allResults.push(...chunkResults);
        } catch (err) {
          console.error("Error enriching vocabulary chunk", err);
          errors.push(`Chunk ${i / chunkSize + 1} xatosi: ${err.message || "AI xatosi"}`);
        }
      }
      return res.json({
        success: allResults.length > 0,
        results: allResults,
        totalRequested: items.length,
        totalProcessed: allResults.length,
        errors
      });
    } catch (err) {
      console.error("Fatal vocabulary enrich error", err);
      return res.status(500).json({
        error: "AI orqali so'zlarni boyitishda kutilmagan xatolik yuz berdi.",
        details: err.message
      });
    }
  });
  app.post("/api/dictionary/lookup", async (req, res) => {
    try {
      const { word, sentence, contextBefore, contextAfter, phrase } = req.body;
      if (!word || !sentence) {
        return res.status(400).json({ error: "So'z va gap konteksti majburiy." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: "GEMINI_API_KEY sozlanmagan. Iltimos, Secrets panelini tekshiring."
        });
      }
      const result = await lookupContextualMeaning({
        word,
        sentence,
        contextBefore,
        contextAfter,
        phrase
      });
      return res.json({
        success: true,
        data: result
      });
    } catch (err) {
      console.error("Contextual lookup error", err);
      return res.status(500).json({
        error: "Kontekstual lug'at ma'lumotini olishda xatolik yuz berdi.",
        details: err.message
      });
    }
  });
  app.post("/api/tts/speak", async (req, res) => {
    try {
      const { text, accent, voiceId, style } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required for TTS" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
      }
      const voice = voiceId || (accent === "uk" ? "Zephyr" : "Kore");
      const speechStyle = style || "Clear, articulate, natural English teacher pronunciation";
      const audioBuffer = await generateSpeechWav(text.slice(0, 800), voice, speechStyle);
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", audioBuffer.length);
      return res.send(audioBuffer);
    } catch (err) {
      console.error("TTS generation error", err);
      return res.status(500).json({ error: "Failed to generate TTS audio", details: err.message });
    }
  });
  app.post("/api/listening/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: "Audio data is required" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
      }
      const transcript = await transcribeAudio(audioBase64, mimeType || "audio/mp3");
      return res.json({ success: true, transcript });
    } catch (err) {
      console.error("Transcription error", err);
      return res.status(500).json({ error: "Transcription failed", details: err.message });
    }
  });
  app.post("/api/grammar/teacher-explain", async (req, res) => {
    try {
      const {
        bookTitle,
        printedPageLabel,
        pageText,
        selectedText,
        promptType,
        userQuestion,
        userAnswer
      } = req.body;
      if (!bookTitle || !pageText) {
        return res.status(400).json({ error: "Kitob nomi va sahifa matni zarur" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
      }
      const output = await explainGrammarPage({
        bookTitle,
        printedPageLabel: printedPageLabel || "1",
        pageText,
        selectedText,
        promptType: promptType || "explain_page",
        userQuestion,
        userAnswer
      });
      return res.json({ success: true, data: output });
    } catch (err) {
      console.error("Grammar explanation error", err);
      return res.status(500).json({ error: "Grammatika izohini olishda xatolik", details: err.message });
    }
  });
  app.post("/api/grammar/suggest-structure", async (req, res) => {
    try {
      const { tocText } = req.body;
      if (!tocText) {
        return res.status(400).json({ error: "Mundarija matni kiritilmadi" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
      }
      const units = await suggestBookStructure(tocText);
      return res.json({ success: true, units });
    } catch (err) {
      console.error("Suggest structure error", err);
      return res.status(500).json({ error: "Kitob tuzilmasini ajratishda xatolik", details: err.message });
    }
  });
  app.post("/api/teacher/turn", async (req, res) => {
    try {
      const { sessionState, userMessage, context } = req.body;
      if (!sessionState || !userMessage) {
        return res.status(400).json({ error: "sessionState and userMessage are required" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
      }
      const turnResult = await conductTeacherTurn({
        sessionState,
        userMessage,
        context: context || { userLevel: "A2" }
      });
      return res.json({ success: true, data: turnResult });
    } catch (err) {
      console.error("Teacher turn error", err);
      return res.status(500).json({ error: "AI Teacher bilan bog\u2018lanishda xatolik", details: err.message });
    }
  });
  app.post("/api/chat/persistent-teacher", async (req, res) => {
    try {
      const {
        conversationId,
        userMessage,
        recentMessages,
        learnerMemorySummary,
        lessonContext,
        previousExplanationsSummary
      } = req.body;
      if (!userMessage) {
        return res.status(400).json({ error: "userMessage is required" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
      }
      const chatOutput = await conductPersistentTeacherChat({
        conversationId: conversationId || "conv_default",
        userMessage,
        recentMessages: Array.isArray(recentMessages) ? recentMessages : [],
        learnerMemorySummary,
        lessonContext,
        previousExplanationsSummary
      });
      return res.json({ success: true, data: chatOutput });
    } catch (err) {
      console.error("Persistent teacher chat error", err);
      return res.status(500).json({ error: "Suhbatda xatolik yuz berdi", details: err.message });
    }
  });
  app.post("/api/writing/evaluate", async (req, res) => {
    try {
      const {
        taskTitle,
        instructionUz,
        targetLevel,
        targetGrammarPoints,
        originalText,
        wordCount
      } = req.body;
      if (!originalText || typeof originalText !== "string") {
        return res.status(400).json({ error: "originalText is required for evaluation" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
      }
      const evalResult = await evaluateWritingSubmission({
        taskTitle: taskTitle || "Daily Writing",
        instructionUz: instructionUz || "Kundalik vazifa",
        targetLevel: targetLevel || "A2",
        targetGrammarPoints: targetGrammarPoints || ["Present Simple"],
        originalText,
        wordCount: wordCount || originalText.trim().split(/\s+/).length
      });
      return res.json({ success: true, data: evalResult });
    } catch (err) {
      console.error("Writing evaluation error", err);
      return res.status(500).json({ error: "Yozma ishni baholashda xatolik", details: err.message });
    }
  });
  app.post("/api/reader/fetch-url", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL kiritilmadi" });
      }
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        return res.status(400).json({ error: "Noto\u2018g\u2018ri URL formati" });
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return res.status(400).json({ error: "Faqat http va https havolalari qo\u2018llab-quvvatlanadi" });
      }
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("10.") || hostname.startsWith("192.168.") || hostname.startsWith("169.254.")) {
        return res.status(403).json({ error: "Ichki tarmoq yoki metadata havolalari taqiqlangan" });
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8e3);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "EnglishTeacherAI-Reader/1.0"
        }
      });
      clearTimeout(timeout);
      if (!response.ok) {
        return res.status(400).json({ error: `Havoladan ma'lumot olish imkoni bo'lmadi (HTTP ${response.status})` });
      }
      const contentType = response.headers.get("content-type") || "";
      const textBuffer = await response.text();
      let cleanedText = textBuffer;
      let title = parsed.pathname.split("/").pop() || "Import qilingan matn";
      if (contentType.includes("html") || textBuffer.includes("<html")) {
        const titleMatch = textBuffer.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim();
        }
        cleanedText = textBuffer.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
      if (cleanedText.length > 5e4) {
        cleanedText = cleanedText.slice(0, 5e4) + "\n[... Matn qisqartirildi ...]";
      }
      return res.json({
        success: true,
        sourceType: contentType.includes("pdf") ? "importedPdfUrl" : "importedWebText",
        title,
        text: cleanedText,
        wordCount: cleanedText.split(/\s+/).length,
        originalUrl: url
      });
    } catch (err) {
      console.error("Fetch URL error", err);
      return res.status(500).json({ error: "Havolani yuklab olishda xatolik yuz berdi", details: err.message });
    }
  });
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`English Teacher AI Server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
