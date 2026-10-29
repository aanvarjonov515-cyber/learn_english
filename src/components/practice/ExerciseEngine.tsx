import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  VocabularyEntry,
  VocabularySense,
  ExerciseType,
  ExerciseAttempt,
  SessionLearningMode,
  ReviewEvaluationOutcome,
} from '../../types';
import { speakEnglishText, stopCurrentAudio } from '../../services/audio';
import {
  recordExerciseAttempt,
  getReviewState,
  saveReviewState,
} from '../../services/storage';
import {
  createInitialReviewState,
  evaluateDimension,
} from '../../services/scheduler';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Trophy,
  Clock,
  Eye,
  Delete,
  CornerDownLeft,
} from 'lucide-react';

interface ExerciseEngineProps {
  ownerId: string;
  entries: VocabularyEntry[];
  sectionTitle: string;
  initialMode?: SessionLearningMode;
  onExit: () => void;
}

interface LetterTile {
  id: string;
  char: string;
  isUsed: boolean;
}

interface QueuedQuestion {
  id: string;
  entry: VocabularyEntry;
  sense: VocabularySense;
  exerciseType: ExerciseType;
  groupIndex: number;
  phaseIndex: number;
  options?: string[]; // for multiple choice
  correctAnswer: string;
  acceptedAnswers: string[];
  requeueCount?: number;
}

export const ExerciseEngine: React.FC<ExerciseEngineProps> = ({
  ownerId,
  entries,
  sectionTitle,
  initialMode = 'small_groups',
  onExit,
}) => {
  const [learningMode, setLearningMode] = useState<SessionLearningMode>(initialMode);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Active question queue
  const [queue, setQueue] = useState<QueuedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // User input states
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [placedTiles, setPlacedTiles] = useState<LetterTile[]>([]);
  const [availableTiles, setAvailableTiles] = useState<LetterTile[]>([]);

  // Feedback states
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Hints
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);

  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);

  // Stats tracking
  const [startTime] = useState<number>(Date.now());
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);
  const [listenedWords, setListenedWords] = useState<Set<string>>(new Set());

  // Input ref
  const textInputRef = useRef<HTMLInputElement>(null);

  // Active time ticker
  useEffect(() => {
    if (!sessionStarted || sessionCompleted) return;
    const interval = setInterval(() => {
      setActiveSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStarted, sessionCompleted]);

  // Clean up audio on unmount or slide change
  useEffect(() => {
    return () => stopCurrentAudio();
  }, [currentIndex]);

  // Build the complete exercise queue based on selected mode
  const buildExerciseQueue = (mode: SessionLearningMode): QueuedQuestion[] => {
    if (entries.length === 0) return [];

    const built: QueuedQuestion[] = [];
    const groupSize = 6;

    // Distractor pool of Uzbek translations
    const allTranslations = entries
      .map((e) => e.senses[0]?.translationUz)
      .filter(Boolean);

    // Distractor pool of English words
    const allEnglishWords = entries.map((e) => e.surfaceForm);

    if (mode === 'small_groups') {
      // Chunk into small groups of 6
      for (let gIdx = 0; gIdx < entries.length; gIdx += groupSize) {
        const groupEntries = entries.slice(gIdx, gIdx + groupSize);

        // Phase 1: Intro
        groupEntries.forEach((entry) => {
          const sense = entry.senses[0];
          built.push({
            id: `q_intro_${entry.id}`,
            entry,
            sense,
            exerciseType: 'intro',
            groupIndex: Math.floor(gIdx / groupSize),
            phaseIndex: 1,
            correctAnswer: entry.surfaceForm,
            acceptedAnswers: [entry.surfaceForm.toLowerCase()],
          });
        });

        // Phase 2: Meaning Choice (Eng -> Uz)
        groupEntries.forEach((entry) => {
          const sense = entry.senses[0];
          const wrong = allTranslations.filter((t) => t !== sense.translationUz);
          const shuffledWrong = [...wrong].sort(() => 0.5 - Math.random()).slice(0, 3);
          const options = [sense.translationUz, ...shuffledWrong].sort(() => 0.5 - Math.random());

          built.push({
            id: `q_choice_${entry.id}`,
            entry,
            sense,
            exerciseType: 'choice_meaning',
            groupIndex: Math.floor(gIdx / groupSize),
            phaseIndex: 2,
            options,
            correctAnswer: sense.translationUz,
            acceptedAnswers: [sense.translationUz.toLowerCase()],
          });
        });

        // Phase 3: Audio to Word
        groupEntries.forEach((entry) => {
          const sense = entry.senses[0];
          const wrong = allEnglishWords.filter(
            (w) => w.toLowerCase() !== entry.surfaceForm.toLowerCase()
          );
          const shuffledWrong = [...wrong].sort(() => 0.5 - Math.random()).slice(0, 3);
          const options = [entry.surfaceForm, ...shuffledWrong].sort(() => 0.5 - Math.random());

          built.push({
            id: `q_audio_${entry.id}`,
            entry,
            sense,
            exerciseType: 'audio_to_word',
            groupIndex: Math.floor(gIdx / groupSize),
            phaseIndex: 3,
            options,
            correctAnswer: entry.surfaceForm,
            acceptedAnswers: [entry.surfaceForm.toLowerCase()],
          });
        });

        // Phase 4: Scramble Tiles
        groupEntries.forEach((entry) => {
          const sense = entry.senses[0];
          built.push({
            id: `q_scramble_${entry.id}`,
            entry,
            sense,
            exerciseType: 'scramble_tiles',
            groupIndex: Math.floor(gIdx / groupSize),
            phaseIndex: 4,
            correctAnswer: entry.surfaceForm,
            acceptedAnswers: [entry.surfaceForm.toLowerCase()],
          });
        });

        // Phase 5: Audio Dictation
        groupEntries.forEach((entry) => {
          const sense = entry.senses[0];
          built.push({
            id: `q_dict_${entry.id}`,
            entry,
            sense,
            exerciseType: 'audio_dictation',
            groupIndex: Math.floor(gIdx / groupSize),
            phaseIndex: 5,
            correctAnswer: entry.surfaceForm,
            acceptedAnswers: [entry.surfaceForm.toLowerCase()],
          });
        });

        // Phase 6: Free Production (Uz -> Eng)
        groupEntries.forEach((entry) => {
          const sense = entry.senses[0];
          built.push({
            id: `q_prod_${entry.id}`,
            entry,
            sense,
            exerciseType: 'production_free',
            groupIndex: Math.floor(gIdx / groupSize),
            phaseIndex: 6,
            correctAnswer: entry.surfaceForm,
            acceptedAnswers: [
              entry.surfaceForm.toLowerCase().trim(),
              entry.lemma.toLowerCase().trim(),
            ],
          });
        });
      }
    } else {
      // Full Phases: All words through phase 1, then phase 2, etc.
      const phases: ExerciseType[] = [
        'intro',
        'choice_meaning',
        'audio_to_word',
        'scramble_tiles',
        'audio_dictation',
        'production_free',
      ];

      phases.forEach((pType, pIndex) => {
        entries.forEach((entry) => {
          const sense = entry.senses[0];
          let options: string[] | undefined;

          if (pType === 'choice_meaning') {
            const wrong = allTranslations.filter((t) => t !== sense.translationUz);
            options = [
              sense.translationUz,
              ...wrong.sort(() => 0.5 - Math.random()).slice(0, 3),
            ].sort(() => 0.5 - Math.random());
          } else if (pType === 'audio_to_word') {
            const wrong = allEnglishWords.filter(
              (w) => w.toLowerCase() !== entry.surfaceForm.toLowerCase()
            );
            options = [
              entry.surfaceForm,
              ...wrong.sort(() => 0.5 - Math.random()).slice(0, 3),
            ].sort(() => 0.5 - Math.random());
          }

          built.push({
            id: `q_${pType}_${entry.id}`,
            entry,
            sense,
            exerciseType: pType,
            groupIndex: 0,
            phaseIndex: pIndex + 1,
            options,
            correctAnswer:
              pType === 'choice_meaning' ? sense.translationUz : entry.surfaceForm,
            acceptedAnswers: [
              entry.surfaceForm.toLowerCase().trim(),
              entry.lemma.toLowerCase().trim(),
            ],
          });
        });
      });
    }

    return built;
  };

  const handleStartSession = (mode: SessionLearningMode) => {
    setLearningMode(mode);
    const built = buildExerciseQueue(mode);
    setQueue(built);
    setCurrentIndex(0);
    setSessionStarted(true);
    setSessionCompleted(false);
  };

  const currentQ = queue[currentIndex];

  // Prepare input when switching question
  useEffect(() => {
    if (!currentQ) return;

    setSelectedOption(null);
    setTypedAnswer('');
    setIsAnswerSubmitted(false);
    setIsCorrect(false);
    setFeedbackMessage(null);
    setHintLevel(0);
    setAnswerRevealed(false);

    // If scramble, prepare unique tiles
    if (currentQ.exerciseType === 'scramble_tiles') {
      const letters = currentQ.correctAnswer.split('');
      const tiles: LetterTile[] = letters.map((char, i) => ({
        id: `tile_${i}_${char}_${Math.random()}`,
        char,
        isUsed: false,
      }));
      // Shuffle tiles (making sure it doesn't match ready word if length > 2)
      let shuffled = [...tiles].sort(() => 0.5 - Math.random());
      if (shuffled.map((t) => t.char).join('') === currentQ.correctAnswer && letters.length > 2) {
        shuffled.reverse();
      }
      setAvailableTiles(shuffled);
      setPlacedTiles([]);
    }

    // Auto audio play for audio-first exercises or intro
    if (
      autoPlayAudio &&
      (currentQ.exerciseType === 'intro' ||
        currentQ.exerciseType === 'audio_to_word' ||
        currentQ.exerciseType === 'audio_dictation')
    ) {
      handlePlayAudio(currentQ.entry.surfaceForm);
    }

    // Focus input
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  }, [currentIndex, currentQ?.id]);

  const handlePlayAudio = async (text: string) => {
    setIsPlayingAudio(true);
    await speakEnglishText(text, {
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
    setListenedWords((prev) => new Set(prev).add(text.toLowerCase()));
  };

  // Scramble tile clicking
  const handleTileClick = (tile: LetterTile) => {
    if (isAnswerSubmitted) return;
    setPlacedTiles((prev) => [...prev, tile]);
    setAvailableTiles((prev) => prev.map((t) => (t.id === tile.id ? { ...t, isUsed: true } : t)));
  };

  const handlePlacedTileClick = (tile: LetterTile) => {
    if (isAnswerSubmitted) return;
    setPlacedTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setAvailableTiles((prev) => prev.map((t) => (t.id === tile.id ? { ...t, isUsed: false } : t)));
  };

  const handleClearTiles = () => {
    if (isAnswerSubmitted) return;
    setPlacedTiles([]);
    setAvailableTiles((prev) => prev.map((t) => ({ ...t, isUsed: false })));
  };

  const handleUndoTile = () => {
    if (isAnswerSubmitted || placedTiles.length === 0) return;
    const last = placedTiles[placedTiles.length - 1];
    setPlacedTiles((prev) => prev.slice(0, -1));
    setAvailableTiles((prev) => prev.map((t) => (t.id === last.id ? { ...t, isUsed: false } : t)));
  };

  // Normalization comparison helper
  const isAnswerMatching = (input: string, accepted: string[]): { match: boolean; nearMiss: boolean } => {
    const cleanInput = input
      .trim()
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/\s+/g, ' ');

    for (const acc of accepted) {
      const cleanAcc = acc
        .trim()
        .toLowerCase()
        .replace(/[’]/g, "'")
        .replace(/\s+/g, ' ');

      if (cleanInput === cleanAcc) {
        return { match: true, nearMiss: false };
      }

      // Check for 1-letter typo (Levenshtein distance == 1)
      if (Math.abs(cleanInput.length - cleanAcc.length) <= 1) {
        let diffs = 0;
        let i = 0,
          j = 0;
        while (i < cleanInput.length && j < cleanAcc.length) {
          if (cleanInput[i] !== cleanAcc[j]) {
            diffs++;
            if (cleanInput.length > cleanAcc.length) i++;
            else if (cleanInput.length < cleanAcc.length) j++;
            else {
              i++;
              j++;
            }
          } else {
            i++;
            j++;
          }
        }
        diffs += cleanInput.length - i + (cleanAcc.length - j);
        if (diffs === 1) {
          return { match: false, nearMiss: true };
        }
      }
    }
    return { match: false, nearMiss: false };
  };

  // Submit Answer
  const handleSubmitAnswer = () => {
    if (!currentQ || isAnswerSubmitted) return;

    let given = '';
    if (currentQ.exerciseType === 'choice_meaning' || currentQ.exerciseType === 'audio_to_word') {
      if (!selectedOption) return;
      given = selectedOption;
    } else if (currentQ.exerciseType === 'scramble_tiles') {
      given = placedTiles.map((t) => t.char).join('');
      if (!given) return;
    } else if (currentQ.exerciseType === 'intro') {
      // Intro card doesn't test, advances immediately
      handleNextQuestion();
      return;
    } else {
      given = typedAnswer.trim();
      if (!given) return;
    }

    const { match, nearMiss } = isAnswerMatching(given, currentQ.acceptedAnswers);
    const correct = match;

    setIsAnswerSubmitted(true);
    setIsCorrect(correct);

    if (correct) {
      setFeedbackMessage("To'g'ri! Barakalla.");
    } else if (nearMiss) {
      setFeedbackMessage(`Juda yaqin! Kichik harf xatosi bor. To'g'ri javob: "${currentQ.correctAnswer}"`);
    } else {
      setFeedbackMessage(`Noto'g'ri. To'g'ri javob: "${currentQ.correctAnswer}"`);
    }

    // Determine review outcome
    let outcome: ReviewEvaluationOutcome = 'failed_forgotten';
    if (correct && hintLevel === 0 && !answerRevealed) {
      outcome = 'independent_correct';
    } else if (correct) {
      outcome = 'assisted_or_corrected';
    }

    // Record attempt
    const attempt: ExerciseAttempt = {
      id: `att_${Date.now()}_${Math.random()}`,
      ownerId,
      entryId: currentQ.entry.id,
      senseId: currentQ.sense.id,
      sessionId: `sess_${startTime}`,
      exerciseType: currentQ.exerciseType,
      answer: given,
      isCorrect: correct,
      hintUsed: hintLevel > 0,
      hintTypes: hintLevel > 0 ? [`level_${hintLevel}`] : [],
      answerRevealed,
      responseTimeMs: 2500,
      attemptNumber: 1,
      createdAt: new Date().toISOString(),
    };
    recordExerciseAttempt(attempt);
    setAttempts((prev) => [...prev, attempt]);

    // Update Spaced Repetition ReviewState
    const dimensionToUpdate =
      currentQ.exerciseType === 'production_free' ? 'production' : 'recognition';
    const existingState =
      getReviewState(currentQ.entry.id, currentQ.sense.id) ||
      createInitialReviewState(ownerId, currentQ.entry.id, currentQ.sense.id);

    const updatedDimension = evaluateDimension(existingState[dimensionToUpdate], outcome);
    const updatedState = {
      ...existingState,
      [dimensionToUpdate]: updatedDimension,
      updatedAt: new Date().toISOString(),
    };
    saveReviewState(updatedState);

    // If wrong answer, re-queue the question 3 items later for spaced recall!
    if (!correct) {
      setQueue((prev) => {
        const copy = [...prev];
        const requeued: QueuedQuestion = {
          ...currentQ,
          id: `${currentQ.id}_retry_${Date.now()}`,
          requeueCount: (currentQ.requeueCount || 0) + 1,
        };
        // Insert 3 positions ahead or at end
        const targetPos = Math.min(copy.length, currentIndex + 4);
        copy.splice(targetPos, 0, requeued);
        return copy;
      });
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < queue.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  // Hint helpers
  const handleUseHint = () => {
    if (hintLevel === 0) {
      // Level 1: First letter hint
      setHintLevel(1);
    } else if (hintLevel === 1) {
      // Level 2: Show example sentence with word hidden
      setHintLevel(2);
    } else {
      // Level 3: Reveal answer
      setAnswerRevealed(true);
      setTypedAnswer(currentQ.correctAnswer);
      if (currentQ.exerciseType === 'scramble_tiles') {
        setPlacedTiles(availableTiles.map((t) => ({ ...t, isUsed: true })));
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isAnswerSubmitted) {
        handleNextQuestion();
      } else {
        handleSubmitAnswer();
      }
    }
  };

  // Summary statistics calculated at completion
  const sessionSummary = useMemo(() => {
    const totalQuestions = queue.length;
    const uniqueEntries = new Set(attempts.map((a) => a.entryId)).size;
    const independentCorrect = attempts.filter((a) => a.isCorrect && !a.hintUsed).length;
    const assistedCorrect = attempts.filter((a) => a.isCorrect && a.hintUsed).length;
    const failedCount = attempts.filter((a) => !a.isCorrect).length;
    const listenedCount = listenedWords.size;

    return {
      totalQuestions,
      uniqueEntries,
      independentCorrect,
      assistedCorrect,
      failedCount,
      listenedCount,
      activeSeconds,
    };
  }, [attempts, listenedWords, activeSeconds, queue.length]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* MODE SELECTOR & START SCREEN */}
      {!sessionStarted && !sessionCompleted && (
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="text-center space-y-2">
            <span className="inline-flex p-3 rounded-2xl bg-teal-50 text-teal-800">
              <Sparkles className="w-8 h-8" />
            </span>
            <h2 className="font-serif font-bold text-2xl text-gray-900">
              {sectionTitle}
            </h2>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Jami {entries.length} ta so'z. Qaysi o'rganish rejimida mashq qilishni tanlang:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mode A: Small Groups */}
            <div
              onClick={() => setLearningMode('small_groups')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer text-left space-y-2 ${
                learningMode === 'small_groups'
                  ? 'border-teal-800 bg-teal-50/50 shadow-xs'
                  : 'border-[#E5E2D9] bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                  Standart / Tavsiya etilgan
                </span>
                {learningMode === 'small_groups' && (
                  <CheckCircle2 className="w-4 h-4 text-teal-800" />
                )}
              </div>
              <h3 className="font-serif font-bold text-base text-gray-900">
                Kichik Guruhlar (6 talik)
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                So'zlar 6 tadan guruhlanadi. Har bir guruh tinglash, tanlash, harflardan yig'ish va yozish orqali to'liq o'zlashtiriladi.
              </p>
            </div>

            {/* Mode B: Full Phases */}
            <div
              onClick={() => setLearningMode('full_phases')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer text-left space-y-2 ${
                learningMode === 'full_phases'
                  ? 'border-teal-800 bg-teal-50/50 shadow-xs'
                  : 'border-[#E5E2D9] bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Bosqichma-bosqich
                </span>
                {learningMode === 'full_phases' && (
                  <CheckCircle2 className="w-4 h-4 text-teal-800" />
                )}
              </div>
              <h3 className="font-serif font-bold text-base text-gray-900">
                To'liq Bosqichli Rejim
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Avval barcha so'zlar bilan tanishiladi, keyin barchasining ma'nosi tanlanadi, keyin esa yozishga o'tiladi.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E5E2D9]">
            <button
              onClick={onExit}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              Ortga qaytish
            </button>
            <button
              onClick={() => handleStartSession(learningMode)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
            >
              <span>Mashqni Boshlash</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE EXERCISE SCREEN */}
      {sessionStarted && !sessionCompleted && currentQ && (
        <div className="space-y-4" onKeyDown={handleKeyDown}>
          {/* Top Progress Bar & Header */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">
                Savol {currentIndex + 1} / {queue.length}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                {currentQ.exerciseType === 'intro'
                  ? 'Tanishish'
                  : currentQ.exerciseType === 'choice_meaning'
                  ? "Ma'noni tanlash"
                  : currentQ.exerciseType === 'audio_to_word'
                  ? 'Audiodan tanlash'
                  : currentQ.exerciseType === 'scramble_tiles'
                  ? "Harflardan yig'ish"
                  : currentQ.exerciseType === 'audio_dictation'
                  ? 'Eshitib yozish'
                  : 'Mustaqil yozish'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {Math.floor(activeSeconds / 60)}:
                {(activeSeconds % 60).toString().padStart(2, '0')}
              </span>
              <button
                onClick={onExit}
                className="text-gray-400 hover:text-gray-700 cursor-pointer text-xs"
              >
                Chiqish
              </button>
            </div>
          </div>

          <div className="w-full bg-[#E5E2D9] h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-800 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
            />
          </div>

          {/* MAIN CARD CONTAINER */}
          <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm min-h-[360px] flex flex-col justify-between">
            {/* TYPE 1: INTRO CARD */}
            {currentQ.exerciseType === 'intro' && (
              <div className="space-y-6 text-center py-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2">
                    <h2 className="font-serif font-bold text-3xl sm:text-4xl text-gray-900">
                      {currentQ.entry.surfaceForm}
                    </h2>
                    <button
                      onClick={() => handlePlayAudio(currentQ.entry.surfaceForm)}
                      className={`p-2 rounded-full text-teal-800 hover:bg-teal-50 transition-colors cursor-pointer ${
                        isPlayingAudio ? 'animate-pulse bg-teal-100' : ''
                      }`}
                      title="Talaffuzni tinglash"
                    >
                      <Volume2 className="w-6 h-6" />
                    </button>
                  </div>
                  {currentQ.entry.partOfSpeech && (
                    <p className="text-xs text-gray-500 font-mono italic">
                      {currentQ.entry.partOfSpeech}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-100 max-w-md mx-auto">
                  <p className="text-lg font-bold text-teal-950 font-serif">
                    {currentQ.sense.translationUz}
                  </p>
                  {currentQ.sense.definitionEn && (
                    <p className="text-xs text-teal-800 mt-1">{currentQ.sense.definitionEn}</p>
                  )}
                </div>

                {currentQ.sense.exampleEn && (
                  <div className="space-y-1 text-xs text-gray-600 max-w-lg mx-auto bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="font-medium text-gray-900 text-sm italic">
                      "{currentQ.sense.exampleEn}"
                    </p>
                    {currentQ.sense.exampleUz && (
                      <p className="text-gray-500">"{currentQ.sense.exampleUz}"</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TYPE 2: MULTIPLE CHOICE (ENGLISH -> UZBEK MEANING) */}
            {currentQ.exerciseType === 'choice_meaning' && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    To'g'ri o'zbekcha tarjimani tanlang:
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="font-serif font-bold text-2xl sm:text-3xl text-gray-900">
                      {currentQ.entry.surfaceForm}
                    </h2>
                    <button
                      onClick={() => handlePlayAudio(currentQ.entry.surfaceForm)}
                      className="p-1.5 rounded-full text-teal-800 hover:bg-teal-50 cursor-pointer"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {(currentQ.options || []).map((opt, i) => {
                    const isSelected = selectedOption === opt;
                    let btnStyle = 'border-gray-200 bg-white hover:border-teal-700 hover:bg-teal-50/30';

                    if (isAnswerSubmitted) {
                      if (opt === currentQ.correctAnswer) {
                        btnStyle = 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold';
                      } else if (isSelected) {
                        btnStyle = 'border-rose-600 bg-rose-50 text-rose-900 font-semibold';
                      } else {
                        btnStyle = 'border-gray-200 bg-gray-50 opacity-50';
                      }
                    } else if (isSelected) {
                      btnStyle = 'border-teal-800 bg-teal-50 text-teal-900 font-semibold ring-2 ring-teal-700';
                    }

                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isAnswerSubmitted}
                        onClick={() => setSelectedOption(opt)}
                        className={`p-4 rounded-xl border text-sm text-left transition-all cursor-pointer ${btnStyle}`}
                      >
                        <span className="text-xs text-gray-400 font-mono mr-2">{i + 1}.</span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TYPE 3: AUDIO TO WORD (LISTEN AND PICK ENGLISH WORD) */}
            {currentQ.exerciseType === 'audio_to_word' && (
              <div className="space-y-6 text-center">
                <div className="space-y-3">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Audioni tinglang va so'zni tanlang:
                  </span>
                  <div>
                    <button
                      onClick={() => handlePlayAudio(currentQ.entry.surfaceForm)}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-teal-800 text-white font-semibold text-xs shadow-xs hover:bg-teal-900 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-5 h-5" />
                      <span>Qayta Tinglash</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    (So'z yashirilgan, talaffuziga qarab toping)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {(currentQ.options || []).map((opt, i) => {
                    const isSelected = selectedOption === opt;
                    let btnStyle = 'border-gray-200 bg-white hover:border-teal-700 hover:bg-teal-50/30';

                    if (isAnswerSubmitted) {
                      if (opt === currentQ.correctAnswer) {
                        btnStyle = 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold';
                      } else if (isSelected) {
                        btnStyle = 'border-rose-600 bg-rose-50 text-rose-900 font-semibold';
                      } else {
                        btnStyle = 'border-gray-200 bg-gray-50 opacity-50';
                      }
                    } else if (isSelected) {
                      btnStyle = 'border-teal-800 bg-teal-50 text-teal-900 font-semibold ring-2 ring-teal-700';
                    }

                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isAnswerSubmitted}
                        onClick={() => setSelectedOption(opt)}
                        className={`p-4 rounded-xl border text-sm text-center transition-all cursor-pointer font-serif ${btnStyle}`}
                      >
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TYPE 4: SCRAMBLE TILES */}
            {currentQ.exerciseType === 'scramble_tiles' && (
              <div className="space-y-6 text-center">
                <div className="space-y-1">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Aralash harflardan so'zni yig'ing:
                  </span>
                  <p className="text-lg font-bold text-gray-900 font-serif">
                    {currentQ.sense.translationUz}
                  </p>
                </div>

                {/* Placed Tiles Area */}
                <div className="min-h-[56px] p-2 bg-[#FAF9F5] border-2 border-dashed border-[#D5D1C6] rounded-xl flex items-center justify-center gap-1.5 flex-wrap">
                  {placedTiles.length === 0 ? (
                    <span className="text-xs text-gray-400">Harflarni pastdan bosing...</span>
                  ) : (
                    placedTiles.map((tile) => (
                      <button
                        key={tile.id}
                        onClick={() => handlePlacedTileClick(tile)}
                        disabled={isAnswerSubmitted}
                        className="w-10 h-10 rounded-lg bg-teal-800 text-white font-bold text-base shadow-xs hover:bg-teal-900 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        {tile.char}
                      </button>
                    ))
                  )}
                </div>

                {/* Action Controls */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleUndoTile}
                    disabled={isAnswerSubmitted || placedTiles.length === 0}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer disabled:opacity-40"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5" /> Oxirgisini qaytarish
                  </button>
                  <button
                    type="button"
                    onClick={handleClearTiles}
                    disabled={isAnswerSubmitted || placedTiles.length === 0}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer disabled:opacity-40"
                  >
                    <Delete className="w-3.5 h-3.5" /> Tozalash
                  </button>
                </div>

                {/* Available Scrambled Tiles */}
                <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
                  {availableTiles.map((tile) => (
                    <button
                      key={tile.id}
                      onClick={() => handleTileClick(tile)}
                      disabled={tile.isUsed || isAnswerSubmitted}
                      className={`w-11 h-11 rounded-xl text-base font-bold border transition-all cursor-pointer ${
                        tile.isUsed
                          ? 'opacity-20 border-gray-200 bg-gray-100 cursor-not-allowed'
                          : 'border-[#D5D1C6] bg-white text-gray-900 shadow-xs hover:border-teal-700 hover:bg-teal-50'
                      }`}
                    >
                      {tile.char}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TYPE 5: AUDIO DICTATION (LISTEN AND TYPE) */}
            {currentQ.exerciseType === 'audio_dictation' && (
              <div className="space-y-6 text-center">
                <div className="space-y-3">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Eshitilgan so'zni yozing:
                  </span>
                  <div>
                    <button
                      onClick={() => handlePlayAudio(currentQ.entry.surfaceForm)}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-teal-800 text-white font-semibold text-xs shadow-xs hover:bg-teal-900 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-5 h-5" />
                      <span>Talaffuzni Qayta Tinglash</span>
                    </button>
                  </div>
                </div>

                <div className="max-w-md mx-auto">
                  <input
                    ref={textInputRef}
                    type="text"
                    disabled={isAnswerSubmitted}
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="Inglizcha so'zni yozing..."
                    className="w-full px-4 py-3 bg-white border border-[#D5D1C6] rounded-xl text-base text-center font-serif text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-teal-700 shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* TYPE 6: FREE PRODUCTION (UZBEK -> ENGLISH TYPING) */}
            {currentQ.exerciseType === 'production_free' && (
              <div className="space-y-6 text-center">
                <div className="space-y-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    O'zbekcha ma'nodan inglizcha so'zni yozing:
                  </span>
                  <h2 className="font-serif font-bold text-2xl sm:text-3xl text-gray-900">
                    {currentQ.sense.translationUz}
                  </h2>
                  {hintLevel >= 1 && (
                    <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full inline-block">
                      Yordam: Bosh harfi: <strong>{currentQ.correctAnswer[0]}</strong>, jami {currentQ.correctAnswer.length} ta harf
                    </p>
                  )}
                  {hintLevel >= 2 && currentQ.sense.exampleEn && (
                    <p className="text-xs text-gray-500 italic max-w-sm mx-auto">
                      Misol: "{currentQ.sense.exampleEn.replace(new RegExp(currentQ.correctAnswer, 'gi'), '_____')}"
                    </p>
                  )}
                </div>

                <div className="max-w-md mx-auto">
                  <input
                    ref={textInputRef}
                    type="text"
                    disabled={isAnswerSubmitted}
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="Inglizcha so'zni yozing..."
                    className="w-full px-4 py-3 bg-white border border-[#D5D1C6] rounded-xl text-base text-center font-serif text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-teal-700 shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* FEEDBACK & ACTIONS */}
            <div className="pt-4 border-t border-[#E5E2D9] space-y-3">
              {/* Feedback Alert */}
              {isAnswerSubmitted && feedbackMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
                    isCorrect
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span className="font-medium">{feedbackMessage}</span>
                  </div>

                  <button
                    onClick={() => handlePlayAudio(currentQ.entry.surfaceForm)}
                    className="p-1 rounded text-teal-800 hover:bg-teal-100 cursor-pointer"
                    title="Talaffuz"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div>
                  {!isAnswerSubmitted &&
                    currentQ.exerciseType !== 'intro' &&
                    currentQ.exerciseType !== 'choice_meaning' && (
                      <button
                        type="button"
                        onClick={handleUseHint}
                        className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-medium px-2.5 py-1.5 rounded-lg hover:bg-amber-50 cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>{hintLevel === 0 ? 'Yordam olish' : 'Javobni ko‘rish'}</span>
                      </button>
                    )}
                </div>

                <div>
                  {!isAnswerSubmitted ? (
                    <button
                      type="button"
                      onClick={handleSubmitAnswer}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                    >
                      <span>{currentQ.exerciseType === 'intro' ? 'Davom etish' : 'Tekshirish'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                    >
                      <span>Keyingisi</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SESSION COMPLETED SUMMARY */}
      {sessionCompleted && (
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <Trophy className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h2 className="font-serif font-bold text-2xl text-gray-900">
              Sessiya Muvaffaqiyatli Yakunlandi!
            </h2>
            <p className="text-xs text-gray-500">
              "{sectionTitle}" bo'yicha mashqlar bajarildi va xotira rejalashtiruvchisiga yozildi.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
              <span className="text-[11px] font-semibold text-teal-800 uppercase">
                O'rganilgan So'zlar
              </span>
              <p className="text-xl font-bold text-teal-950 mt-1">
                {sessionSummary.uniqueEntries} ta
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase">
                Mustaqil To'g'ri
              </span>
              <p className="text-xl font-bold text-emerald-950 mt-1">
                {sessionSummary.independentCorrect} ta
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-[11px] font-semibold text-amber-800 uppercase">
                Yordam Bilan
              </span>
              <p className="text-xl font-bold text-amber-950 mt-1">
                {sessionSummary.assistedCorrect} ta
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-[11px] font-semibold text-gray-600 uppercase">
                Faol Mashq Vaqti
              </span>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {Math.floor(sessionSummary.activeSeconds / 60)} daq {sessionSummary.activeSeconds % 60} son
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E5E2D9] text-xs text-gray-600 text-left space-y-1">
            <p className="font-semibold text-gray-900">Keyingi Qadam:</p>
            <p>
              Bosqichli takrorlash v1 algoritmi bo'yicha mustaqil eslangan so'zlar ertangi kunga (1-bosqich intervaliga) rejalashtirildi. Xato qilingan yoki yordam ishlatilgan so'zlar qayta mustahkamlash navbatiga qo'shildi.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleStartSession(learningMode)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Qayta Boshlash
            </button>
            <button
              onClick={onExit}
              className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
            >
              To'plamlarga Qaytish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
