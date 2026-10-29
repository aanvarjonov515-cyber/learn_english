/**
 * Full-Stack Express Server for English Teacher AI
 * Proxies Gemini AI requests server-side, keeping API keys secure.
 * Mounts Vite middleware during development and serves static files in production.
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  enrichVocabularyBatch,
  lookupContextualMeaning,
  generateSpeechWav,
  transcribeAudio,
  explainGrammarPage,
  suggestBookStructure,
  conductTeacherTurn,
  evaluateWritingSubmission,
  conductPersistentTeacherChat,
} from './src/server/gemini';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Security: payload limits
  app.use(express.json({ limit: '10mb' }));

  // API Route: Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      time: new Date().toISOString(),
    });
  });

  // API Route: Vocabulary Enrichment (Gemini 3.8 Flash)
  app.post('/api/vocabulary/enrich', async (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "So'zlar ro'yxati berilmadi." });
      }

      if (items.length > 50) {
        return res.status(400).json({ error: "Bitta so'rovda ko'pi bilan 50 ta so'z yuborish mumkin." });
      }

      // Check API Key
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: "GEMINI_API_KEY sozlanmagan. Iltimos, Secrets panelidan API kalitni tekshiring.",
        });
      }

      // Batching: process in sub-chunks of 15 to ensure high reliability
      const chunkSize = 15;
      const allResults = [];
      const errors = [];

      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        try {
          const chunkResults = await enrichVocabularyBatch(chunk);
          allResults.push(...chunkResults);
        } catch (err: any) {
          console.error('Error enriching vocabulary chunk', err);
          errors.push(`Chunk ${i / chunkSize + 1} xatosi: ${err.message || 'AI xatosi'}`);
        }
      }

      return res.json({
        success: allResults.length > 0,
        results: allResults,
        totalRequested: items.length,
        totalProcessed: allResults.length,
        errors,
      });
    } catch (err: any) {
      console.error('Fatal vocabulary enrich error', err);
      return res.status(500).json({
        error: "AI orqali so'zlarni boyitishda kutilmagan xatolik yuz berdi.",
        details: err.message,
      });
    }
  });

  // API Route: Contextual Dictionary Lookup (Gemini 3.8 Flash)
  app.post('/api/dictionary/lookup', async (req: Request, res: Response) => {
    try {
      const { word, sentence, contextBefore, contextAfter, phrase } = req.body;

      if (!word || !sentence) {
        return res.status(400).json({ error: "So'z va gap konteksti majburiy." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: "GEMINI_API_KEY sozlanmagan. Iltimos, Secrets panelini tekshiring.",
        });
      }

      const result = await lookupContextualMeaning({
        word,
        sentence,
        contextBefore,
        contextAfter,
        phrase,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('Contextual lookup error', err);
      return res.status(500).json({
        error: "Kontekstual lug'at ma'lumotini olishda xatolik yuz berdi.",
        details: err.message,
      });
    }
  });

  // API Route: Text to Speech (Gemini 3.8 Flash Lite TTS)
  app.post('/api/tts/speak', async (req: Request, res: Response) => {
    try {
      const { text, accent, voiceId, style } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required for TTS' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const voice = voiceId || (accent === 'uk' ? 'Zephyr' : 'Kore');
      const speechStyle = style || 'Clear, articulate, natural English teacher pronunciation';
      const audioBuffer = await generateSpeechWav(text.slice(0, 800), voice, speechStyle);

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', audioBuffer.length);
      return res.send(audioBuffer);
    } catch (err: any) {
      console.error('TTS generation error', err);
      return res.status(500).json({ error: 'Failed to generate TTS audio', details: err.message });
    }
  });

  // API Route: Listening Audio Transcription (gemini-3.5-transcribe)
  app.post('/api/listening/transcribe', async (req: Request, res: Response) => {
    try {
      const { audioBase64, mimeType } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'Audio data is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const transcript = await transcribeAudio(audioBase64, mimeType || 'audio/mp3');
      return res.json({ success: true, transcript });
    } catch (err: any) {
      console.error('Transcription error', err);
      return res.status(500).json({ error: 'Transcription failed', details: err.message });
    }
  });

  // API Route: Grammar Page Explanation (gemini-3.8-flash)
  app.post('/api/grammar/teacher-explain', async (req: Request, res: Response) => {
    try {
      const {
        bookTitle,
        printedPageLabel,
        pageText,
        selectedText,
        promptType,
        userQuestion,
        userAnswer,
      } = req.body;

      if (!bookTitle || !pageText) {
        return res.status(400).json({ error: 'Kitob nomi va sahifa matni zarur' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const output = await explainGrammarPage({
        bookTitle,
        printedPageLabel: printedPageLabel || '1',
        pageText,
        selectedText,
        promptType: promptType || 'explain_page',
        userQuestion,
        userAnswer,
      });

      return res.json({ success: true, data: output });
    } catch (err: any) {
      console.error('Grammar explanation error', err);
      return res.status(500).json({ error: 'Grammatika izohini olishda xatolik', details: err.message });
    }
  });

  // API Route: Suggest Book Structure (gemini-3.8-flash)
  app.post('/api/grammar/suggest-structure', async (req: Request, res: Response) => {
    try {
      const { tocText } = req.body;
      if (!tocText) {
        return res.status(400).json({ error: 'Mundarija matni kiritilmadi' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const units = await suggestBookStructure(tocText);
      return res.json({ success: true, units });
    } catch (err: any) {
      console.error('Suggest structure error', err);
      return res.status(500).json({ error: 'Kitob tuzilmasini ajratishda xatolik', details: err.message });
    }
  });

  // API Route: AI Teacher Lesson Interactive Turn (gemini-3.8-flash)
  app.post('/api/teacher/turn', async (req: Request, res: Response) => {
    try {
      const { sessionState, userMessage, context } = req.body;
      if (!sessionState || !userMessage) {
        return res.status(400).json({ error: 'sessionState and userMessage are required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const turnResult = await conductTeacherTurn({
        sessionState,
        userMessage,
        context: context || { userLevel: 'A2' },
      });

      return res.json({ success: true, data: turnResult });
    } catch (err: any) {
      console.error('Teacher turn error', err);
      return res.status(500).json({ error: 'AI Teacher bilan bog‘lanishda xatolik', details: err.message });
    }
  });

  // API Route: Persistent Teacher Chat Turn (gemini-3.8-flash)
  app.post('/api/chat/persistent-teacher', async (req: Request, res: Response) => {
    try {
      const {
        conversationId,
        userMessage,
        recentMessages,
        learnerMemorySummary,
        lessonContext,
        previousExplanationsSummary,
      } = req.body;

      if (!userMessage) {
        return res.status(400).json({ error: 'userMessage is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const chatOutput = await conductPersistentTeacherChat({
        conversationId: conversationId || 'conv_default',
        userMessage,
        recentMessages: Array.isArray(recentMessages) ? recentMessages : [],
        learnerMemorySummary,
        lessonContext,
        previousExplanationsSummary,
      });

      return res.json({ success: true, data: chatOutput });
    } catch (err: any) {
      console.error('Persistent teacher chat error', err);
      return res.status(500).json({ error: 'Suhbatda xatolik yuz berdi', details: err.message });
    }
  });

  // API Route: Daily Writing Evaluation (gemini-3.8-flash)
  app.post('/api/writing/evaluate', async (req: Request, res: Response) => {
    try {
      const {
        taskTitle,
        instructionUz,
        targetLevel,
        targetGrammarPoints,
        originalText,
        wordCount,
      } = req.body;

      if (!originalText || typeof originalText !== 'string') {
        return res.status(400).json({ error: 'originalText is required for evaluation' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const evalResult = await evaluateWritingSubmission({
        taskTitle: taskTitle || 'Daily Writing',
        instructionUz: instructionUz || 'Kundalik vazifa',
        targetLevel: targetLevel || 'A2',
        targetGrammarPoints: targetGrammarPoints || ['Present Simple'],
        originalText,
        wordCount: wordCount || originalText.trim().split(/\s+/).length,
      });

      return res.json({ success: true, data: evalResult });
    } catch (err: any) {
      console.error('Writing evaluation error', err);
      return res.status(500).json({ error: 'Yozma ishni baholashda xatolik', details: err.message });
    }
  });

  // API Route: Fetch Book URL / Web Article Text
  app.post('/api/reader/fetch-url', async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL kiritilmadi' });
      }

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return res.status(400).json({ error: 'Noto‘g‘ri URL formati' });
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return res.status(400).json({ error: 'Faqat http va https havolalari qo‘llab-quvvatlanadi' });
      }

      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('169.254.')
      ) {
        return res.status(403).json({ error: 'Ichki tarmoq yoki metadata havolalari taqiqlangan' });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'EnglishTeacherAI-Reader/1.0',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(400).json({ error: `Havoladan ma'lumot olish imkoni bo'lmadi (HTTP ${response.status})` });
      }

      const contentType = response.headers.get('content-type') || '';
      const textBuffer = await response.text();

      let cleanedText = textBuffer;
      let title = parsed.pathname.split('/').pop() || 'Import qilingan matn';

      if (contentType.includes('html') || textBuffer.includes('<html')) {
        const titleMatch = textBuffer.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim();
        }
        cleanedText = textBuffer
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      if (cleanedText.length > 50000) {
        cleanedText = cleanedText.slice(0, 50000) + '\n[... Matn qisqartirildi ...]';
      }

      return res.json({
        success: true,
        sourceType: contentType.includes('pdf') ? 'importedPdfUrl' : 'importedWebText',
        title,
        text: cleanedText,
        wordCount: cleanedText.split(/\s+/).length,
        originalUrl: url,
      });
    } catch (err: any) {
      console.error('Fetch URL error', err);
      return res.status(500).json({ error: 'Havolani yuklab olishda xatolik yuz berdi', details: err.message });
    }
  });

  // Serve Frontend
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Mount Vite middlewares in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`English Teacher AI Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
