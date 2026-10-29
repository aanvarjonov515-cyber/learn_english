/**
 * English Teacher AI - Domain Types
 * Covers UserProfile, UserSettings, Vocabulary, Exercises, Spaced Repetition, Reader, and Media.
 */

export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type AccentPreference = 'us' | 'uk';
export type ReaderTheme = 'warm' | 'night' | 'light';
export type ReaderFontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface UserProfile {
  id: string;
  displayName: string;
  nativeLanguage: 'uz';
  estimatedLevel: EnglishLevel;
  timezone: string; // e.g., 'Asia/Tashkent'
  createdAt: string; // UTC ISO string
  updatedAt: string;
  isOnboarded: boolean;
}

export interface UserSettings {
  dailyStudyMinutes: 10 | 20 | 30 | 45;
  dailyNewWordTarget: number; // e.g. 10
  preferredAccent: AccentPreference;
  preferredVoiceId?: string;
  readerFontSize: ReaderFontSize;
  readerTheme: ReaderTheme;
  reduceMotion: boolean;
  autoPlayMappedAudio: boolean;
  teacherVoiceProvider?: 'gemini_tts' | 'browser_tts';
  teacherVoiceId?: string;
  teacherVoiceGender?: 'female' | 'male';
  teacherSpeechRate?: number;
  teacherAutoSpeak?: boolean;
}

export interface VocabularySense {
  id: string;
  translationUz: string;
  definitionEn?: string;
  exampleEn?: string;
  exampleUz?: string;
  context?: string;
  verificationStatus: 'ai_generated' | 'user_reviewed' | 'user_edited';
}

export interface VocabularyEntry {
  id: string;
  ownerId: string;
  collectionId: string;
  surfaceForm: string;
  lemma: string;
  partOfSpeech?: string; // noun, verb, adjective, etc.
  senses: VocabularySense[];
  source: 'manual' | 'file' | 'ai' | 'reader';
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface VocabularySection {
  id: string;
  ownerId: string;
  collectionId: string;
  title: string;
  position: number;
  entryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VocabularyCollection {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  sectionSize: number; // default 40
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ExerciseType =
  | 'intro'
  | 'choice_meaning'
  | 'audio_to_word'
  | 'scramble_tiles'
  | 'audio_dictation'
  | 'production_free';

export interface ExerciseAttempt {
  id: string;
  ownerId: string;
  entryId: string;
  senseId: string;
  sessionId: string;
  exerciseType: ExerciseType;
  answer: string;
  isCorrect: boolean;
  hintUsed: boolean;
  hintTypes: string[];
  answerRevealed: boolean;
  responseTimeMs: number;
  attemptNumber: number;
  createdAt: string;
}

export type DimensionStatus = 'new' | 'learning' | 'due' | 'graduated' | 'relearning';

export interface DimensionState {
  stage: number; // 0..6 (Intervals: 0=new, 1=1d, 2=3d, 3=7d, 4=14d, 5=30d, 6=60d)
  status: DimensionStatus;
  dueAt: string; // ISO string
  lastEvaluatedAt?: string;
  lastPromotedLocalDate?: string; // 'YYYY-MM-DD'
  independentSuccessCount: number;
  lapseCount: number;
}

export type ReviewEvaluationOutcome =
  | 'independent_correct'
  | 'assisted_or_corrected'
  | 'failed_forgotten'
  | 'technical_skip';

export interface ListeningStats {
  dictationSuccessCount: number;
  audioSkippedCount: number;
  replayCount: number;
}

export interface ReviewState {
  id: string;
  ownerId: string;
  entryId: string;
  senseId: string;
  algorithmVersion: 'v1';
  recognition: DimensionState;
  production: DimensionState;
  listening: ListeningStats;
  updatedAt: string;
  revision: number;
}

export type SessionLearningMode = 'small_groups' | 'full_phases';

export interface LearningSession {
  id: string;
  ownerId: string;
  sectionId: string;
  collectionId: string;
  mode: SessionLearningMode;
  groupSize: number; // default 6
  currentGroupIndex: number;
  currentPhaseIndex: number;
  status: 'ready' | 'introducing' | 'practicing' | 'feedback' | 'paused' | 'completed' | 'abandoned';
  itemQueue: string[]; // entry IDs
  currentIndex: number;
  attempts: ExerciseAttempt[];
  startedAt: string;
  lastSavedAt: string;
  completedAt?: string;
}

export interface ReadingProgress {
  paragraphId: string;
  offset: number;
  percent: number;
  isCompleted: boolean;
  updatedAt: string;
}

export interface ReadingDocument {
  id: string;
  ownerId: string;
  title: string;
  author?: string;
  estimatedLevel?: EnglishLevel;
  notes?: string;
  text: string;
  wordCount: number;
  contentVersion: number;
  processingStatus: 'ready' | 'processing' | 'error';
  lastOpenedAt?: string;
  progress?: ReadingProgress;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingToken {
  tokenId: string;
  documentId: string;
  contentVersion: number;
  paragraphId: string;
  sentenceId: string;
  surfaceForm: string;
  cleanWord: string;
  startOffset: number;
  endOffset: number;
  tokenType: 'word' | 'punctuation' | 'whitespace';
}

export interface DictionaryLookupResult {
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
  alternativeMeanings?: { meaning: string; pos: string }[];
  source: 'ai' | 'dictionary' | 'user_cache';
}

export interface AudioAsset {
  id: string;
  ownerId: string;
  title: string;
  originalFilename: string;
  trackLabel: string; // Strictly a string, e.g. "3.23", "1.03", "T1.4"
  normalizedTrackLabel: string;
  collectionId?: string;
  storagePath: string; // data URL or path
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  hasTranscript: boolean;
  transcriptText?: string;
  transcriptStatus: 'none' | 'generating' | 'ready' | 'error';
  transcriptAlignmentLevel: AlignmentLevel;
  bookmarks: AudioBookmark[];
  processingStatus: 'pending' | 'ready' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface AudioCollection {
  id: string;
  ownerId: string;
  title: string;
  courseOrBookTitle?: string;
  edition?: string;
  level?: EnglishLevel;
  notes?: string;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AudioBookmark {
  id: string;
  audioAssetId: string;
  timeSeconds: number;
  label: string;
  notes?: string;
  createdAt: string;
}

export type MappingConfirmationStatus =
  | 'unlinked'
  | 'suggested'
  | 'ambiguous'
  | 'confirmed'
  | 'unavailable'
  | 'stale';

export type MappingSource =
  | 'manual'
  | 'exactLabel'
  | 'filenameSuggestion'
  | 'extractedReference'
  | 'ai';

export interface AudioTrackMapping {
  id: string;
  ownerId: string;
  bookId: string;
  bookEdition?: string;
  audioCollectionId?: string;
  unitId?: string;
  exerciseId: string;
  pageReference?: string;
  trackLabel: string; // STRICTLY string, e.g. "3.23", "1.03"
  audioAssetId: string;
  startSeconds?: number;
  endSeconds?: number;
  status: MappingConfirmationStatus;
  mappingSource: MappingSource;
  confirmedBy?: string;
  confirmedAt?: string;
  bookContentVersion: number;
  audioAssetFingerprint?: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrackReferenceMatch {
  rawMatchedText: string; // e.g. "Track 3.23", "T 1.03", "Audio 2.4", "CD2 Track 7"
  cleanTrackLabel: string; // e.g. "3.23", "1.03"
  pageIndex: number;
  printedPageLabel: string;
  startCharOffset?: number;
  endCharOffset?: number;
  detectionSource: 'deterministic_regex' | 'ai_inference';
}

export interface TrackCandidate {
  asset: AudioAsset;
  collectionTitle?: string;
  edition?: string;
  confidence: 'exact_book_collection' | 'exact_other_collection' | 'normalized_match' | 'filename_pattern' | 'user_picked';
  matchReasonUz: string;
  durationSeconds?: number;
  previewSnippet?: string;
}

export interface ExerciseAudioEvidence {
  id: string;
  exerciseId: string;
  audioAssetId: string;
  mappingId: string;
  playStartedAt: string;
  listenedIntervals: { start: number; end: number }[];
  totalListenedSeconds: number;
  seekCount: number;
  replayCount: number;
  answerSubmittedAt?: string;
  transcriptOpened: boolean;
  helpUsed: boolean;
  evaluationOutcome?: 'correct' | 'partially_correct' | 'incorrect';
}

export interface DictationSubmission {
  id: string;
  audioAssetId: string;
  userText: string;
  referenceText: string;
  accuracyScore: number;
  wordDifferences: {
    word: string;
    status: 'correct' | 'missing' | 'extra' | 'typo';
  }[];
  createdAt: string;
}

export type TTSVoiceId = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
export type ReadingSpeechStyle = 'natural' | 'slow_clear' | 'story';
export type AlignmentLevel = 'none' | 'segment' | 'sentence' | 'word';

export interface TTSVoiceOption {
  id: TTSVoiceId;
  name: string;
  gender: 'female' | 'male';
  accentDesc: string;
  sampleText: string;
  isAvailable: boolean;
}

export interface SentenceAudioTiming {
  sentenceId: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface DocumentAudioSegment {
  segmentId: string;
  documentId: string;
  contentVersion: number;
  paragraphId: string;
  sentenceId: string;
  audioUrl: string;
  durationSeconds: number;
  alignmentLevel: AlignmentLevel;
  timings: SentenceAudioTiming[];
  voiceId: TTSVoiceId;
}

export interface PlaybackState {
  isPlaying: boolean;
  activeAudioSource: 'idle' | 'reader' | 'listening' | 'teacher';
  currentTime: number;
  duration: number;
  playbackRate: number;
  activeSentenceId: string | null;
  activeSegmentIndex: number;
  volume: number;
  autoScroll: boolean;
  voiceId: TTSVoiceId;
  speechStyle: ReadingSpeechStyle;
}


// Stage 9: Grammar PDF Books & Exercises
export interface GrammarBook {
  id: string;
  ownerId: string;
  title: string;
  author?: string;
  edition?: string;
  estimatedLevel?: EnglishLevel;
  totalPages: number;
  pageOffset: number; // Difference between PDF page index and printed page label
  sourceAssetId?: string;
  pdfDataUrl?: string;
  processingStatus: 'ready' | 'processing' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface BookPage {
  id: string;
  bookId: string;
  pdfPageIndex: number; // 1-based PDF document page
  printedPageLabel: string; // e.g. "3", "iv", "Unit 1 - Page 4"
  extractedText: string;
  extractionStatus: 'extracted' | 'ocr_needed' | 'manual' | 'empty';
  unitId?: string;
  isCompleted: boolean;
  hasListeningExercise?: boolean;
  linkedAudioTrackLabel?: string;
  linkedAudioAssetId?: string;
}

export interface GrammarTopic {
  id: string;
  unitId: string;
  title: string;
  grammarRuleUz: string;
  exampleEn: string;
  exampleUz: string;
}

export interface GrammarExercise {
  id: string;
  unitId: string;
  bookId: string;
  pageIndex: number;
  printedPageLabel: string;
  exerciseNumber: string;
  instruction: string;
  exerciseType:
    | 'fill_blanks'
    | 'choice'
    | 'short_answer'
    | 'listening'
    | 'matching'
    | 'writing';
  contentText: string;
  officialAnswerKey?: string;
  aiSuggestedSolution?: string;
  userDraftAnswer?: string;
  isSubmitted: boolean;
  isCorrect?: boolean;
  linkedAudioAssetId?: string;
  linkedTrackLabel?: string;
}

export interface GrammarUnit {
  id: string;
  bookId: string;
  unitNumber: number;
  title: string;
  startPdfPage: number;
  endPdfPage: number;
  topics: GrammarTopic[];
  exercises: GrammarExercise[];
  createdAt: string;
}

export interface BookStudyProgress {
  bookId: string;
  lastOpenedPdfPage: number;
  completedUnitsCount: number;
  completedExercisesCount: number;
  updatedAt: string;
}

// Stage 11: AI Teacher Lesson System
export type TeacherSessionState =
  | 'preparing'
  | 'goalSetting'
  | 'explaining'
  | 'demonstrating'
  | 'guidedPractice'
  | 'independentPractice'
  | 'checkingUnderstanding'
  | 'reviewing'
  | 'summarizing'
  | 'paused'
  | 'completed';

export type TeacherActionType =
  | 'explainTopic'
  | 'showExample'
  | 'askQuestion'
  | 'startVocabularyExercise'
  | 'openBookPage'
  | 'openReadingDocument'
  | 'prepareListeningExercise'
  | 'proposeWritingTask'
  | 'summarizeLesson';

export interface TeacherStructuredAction {
  type: TeacherActionType;
  titleUz: string;
  payload: {
    topicId?: string;
    ruleName?: string;
    questionText?: string;
    options?: string[];
    correctAnswer?: string;
    exampleEn?: string;
    exampleUz?: string;
    bookId?: string;
    pdfPageIndex?: number;
    printedPageLabel?: string;
    exerciseId?: string;
    trackLabel?: string;
    audioAssetId?: string;
    writingPrompt?: string;
    targetGrammar?: string;
  };
}

export interface LessonGoal {
  id: string;
  titleUz: string;
  targetGrammarPoint: string;
  isAchieved: boolean;
  evidenceCount: number;
}

export interface TeacherChatMessage {
  id: string;
  sender: 'teacher' | 'user';
  text: string;
  action?: TeacherStructuredAction;
  audioUrl?: string;
  isAudioPlaying?: boolean;
  timestamp: string;
  evidenceRef?: string;
  userHelpTag?: 'asked_simpler' | 'asked_example' | 'asked_quiz' | 'revealed_answer';
}

export type GrammarKnowledgeLevel =
  | 'notStarted'
  | 'introduced'
  | 'guidedPractice'
  | 'independentEvidence'
  | 'needsReview';

export interface TeacherSessionSummary {
  topicsCovered: string[];
  exercisesCompleted: number;
  independentSuccesses: number;
  repeatedMistakes: string[];
  hintsUsedCount: number;
  nextRecommendationUz: string;
  evidenceIds: string[];
}

export interface TeacherSession {
  id: string;
  ownerId: string;
  module: 'vocabulary' | 'reader' | 'grammar' | 'writing' | 'chat';
  entryPoint:
    | 'today_lesson'
    | 'continue_book'
    | 'study_topic'
    | 'hard_words'
    | 'continue_listening'
    | 'yesterday_mistakes';
  currentState: TeacherSessionState;
  goals: LessonGoal[];
  durationMinutes: 10 | 20 | 30 | 0; // 0 = free
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  relatedBookId?: string;
  relatedPageNumber?: number;
  relatedUnitId?: string;
  messages: TeacherChatMessage[];
  activeExerciseId?: string;
  sessionSummary?: TeacherSessionSummary;
  consecutiveCorrect: number;
  consecutiveErrors: number;
  revision: number;
}

// Stage 12: Daily Writing & AI Feedback
export interface WritingTask {
  id: string;
  ownerId: string;
  title: string;
  instructionUz: string;
  promptEn?: string;
  targetLevel: EnglishLevel;
  targetGrammarPoints: string[];
  suggestedVocabulary: string[];
  suggestedLength: number;
  lengthUnit: 'words' | 'sentences';
  requiredElements: string[];
  optionalElements: string[];
  sourceReferences: {
    sourceType: 'teacher_session' | 'book_exercise' | 'grammar_topic' | 'listening' | 'reader' | 'free_user';
    sourceId: string;
    sourceTitle?: string;
  }[];
  supportLevel: 'learning_standard' | 'guided_scaffold' | 'free_production';
  createdAt: string;
  dueLocalDate?: string;
  status: 'todo' | 'drafting' | 'submitted' | 'completed' | 'revision_needed';
  scaffolding?: {
    suggestedPlan?: string[];
    guidingQuestions?: string[];
    starterPhrases?: string[];
    sampleVocab?: { en: string; uz: string }[];
  };
}

export type WritingIssueCategory =
  | 'target_grammar'
  | 'general_grammar'
  | 'vocabulary_choice'
  | 'spelling'
  | 'punctuation'
  | 'style_suggestion'
  | 'meaning_clarity';

export type CanonicalRuleId =
  | 'thirdPersonSingular'
  | 'doDoes'
  | 'articleUsage'
  | 'wordOrder'
  | 'subjectVerbAgreement'
  | 'tenseChoice'
  | 'spelling'
  | 'other';

export interface WritingIssue {
  issueId: string;
  category: WritingIssueCategory;
  severity: 'error' | 'warning' | 'suggestion';
  originalSpan: string;
  startOffset: number;
  endOffset: number;
  explanationUz: string;
  suggestedCorrection: string;
  targetRule: CanonicalRuleId;
  isTargetGrammar: boolean;
  requiresClarification?: boolean;
}

export interface WritingFeedback {
  feedbackVersion: number;
  summaryUz: string;
  overallAssessment: 'goal_achieved' | 'partially_achieved' | 'needs_more_practice' | 'unclear_too_short';
  strengths: string[];
  issues: WritingIssue[];
  nextStepUz: string;
  fullExemplarCorrection?: string;
  followUpTransferTask?: {
    titleUz: string;
    instructionUz: string;
    promptEn: string;
  };
  reviewedAt: string;
}

export interface WritingSubmission {
  id: string;
  ownerId: string;
  taskId: string;
  originalText: string;
  wordCount: number;
  sentenceCount: number;
  revisionNumber: number;
  parentSubmissionId?: string;
  contentHash: string;
  targetGrammarSnapshot: string[];
  supportUsed: {
    hintsRevealed: boolean;
    modelAnswerViewed: boolean;
    scaffoldingOpened: boolean;
  };
  submittedAt: string;
  feedbackStatus: 'draft' | 'pending_review' | 'reviewed';
  feedback?: WritingFeedback;
}

export interface RecurringErrorStat {
  ruleId: CanonicalRuleId;
  ruleNameUz: string;
  occurrenceCount: number;
  independentCorrectCount: number;
  lastObservedDate: string;
  sampleExplanationsUz: string[];
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// Stage 13: Media & Avatar System
export type MediaPanelMode = 'none' | 'video' | 'staticAvatar' | 'animatedAvatar';

export type AvatarAnimationState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'explaining'
  | 'encouraging'
  | 'paused'
  | 'error';

export interface AvatarCapabilities {
  supportsRigging: boolean;
  supportsLipSync: boolean;
  supportsGesture: boolean;
}

export interface AvatarAsset {
  id: string;
  ownerId: string;
  name: string;
  type: 'preset_svg' | 'static_image' | 'custom_upload';
  imageUrl?: string;
  isDefault?: boolean;
  capabilities: AvatarCapabilities;
  createdAt: string;
}

export interface VideoAsset {
  id: string;
  ownerId: string;
  title: string;
  videoUrl: string;
  durationSeconds: number;
  fileSizeMb?: number;
  uploadedAt: string;
  hasOriginalAudio: boolean;
}

export interface VideoTextMapping {
  id: string;
  videoId: string;
  targetModule: 'reader' | 'teacher';
  targetId: string;
  startOffsetSeconds: number;
  endOffsetSeconds: number;
  noteUz?: string;
}

export interface MediaPreferences {
  activeMode: MediaPanelMode;
  selectedAvatarId: string;
  activeVideoId?: string;
  videoAudioMode: 'original' | 'muted_with_teacher_tts';
  isCollapsed: boolean;
  heightPx: number;
}

// Stage 14: Daily Study Plan & Dashboard Integration
export type StudyPlanType =
  | 'vocab_review'
  | 'vocab_new'
  | 'teacher_lesson'
  | 'grammar_practice'
  | 'listening_exercise'
  | 'reading_session'
  | 'writing_task'
  | 'writing_revision'
  | 'delayed_grammar_check';

export interface StudyPlanItem {
  id: string;
  type: StudyPlanType;
  titleUz: string;
  descriptionUz: string;
  estimatedMinutes: number;
  priority: number;
  targetModule: 'vocabulary' | 'reader' | 'grammar' | 'writing' | 'teacher';
  targetPath: string;
  deepLinkPayload?: Record<string, any>;
  isCompleted: boolean;
  completedAt?: string;
  evidenceId?: string;
  evidenceSummaryUz?: string;
}

export interface DailyStudyPlan {
  dateStr: string; // YYYY-MM-DD local timezone
  timeBudgetMinutes: 10 | 20 | 30 | 45;
  totalEstimatedMinutes: number;
  items: StudyPlanItem[];
  completedMinutes: number;
  isAllCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ActivityEventType =
  | 'vocab_reviewed'
  | 'vocab_learned'
  | 'reader_read'
  | 'grammar_exercise_done'
  | 'listening_completed'
  | 'teacher_session_done'
  | 'writing_submitted'
  | 'writing_revised';

export interface ActivityEvent {
  id: string;
  ownerId: string;
  eventType: ActivityEventType;
  occurredAt: string;
  localDateAtOccurrence: string;
  durationSeconds?: number;
  scoreRatio?: number;
  referenceId?: string;
  metadata?: Record<string, any>;
}

// Stage 17: Persistent Chat & Learner Memory
export type ChatMessageRole = 'user' | 'assistant' | 'system';
export type ChatMessageStatus = 'sending' | 'sent' | 'error';

export interface PersistentChatMessage {
  messageId: string;
  conversationId: string;
  ownerId: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
  relatedEntityIds?: string[];
  requestId?: string;
  action?: TeacherStructuredAction;
  explanationMethodUsed?: string;
  userHelpTag?: string;
  audioUrl?: string;
}

export interface Conversation {
  id: string;
  ownerId: string;
  title: string;
  lessonContext?: {
    module?: 'vocabulary' | 'reader' | 'grammar' | 'writing' | 'listening' | 'general';
    bookId?: string;
    pageIndex?: number;
    printedPageLabel?: string;
    topicTitle?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastMessageSnippet?: string;
  messageCount: number;
}

export type LearnerMemorySource = 'user_statement' | 'exercise_evidence' | 'teacher_hypothesis';
export type LearnerMemoryCategory = 'preference' | 'learning_goal' | 'exercise_evidence' | 'teacher_hypothesis';

export interface LearnerMemoryItem {
  id: string;
  ownerId: string;
  summary: string;
  source: LearnerMemorySource;
  category: LearnerMemoryCategory;
  relatedEntityId?: string;
  attemptId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

// Stage 18: Integrated Daily Homework System
export type HomeworkAssignmentStatus =
  | 'draft'
  | 'assigned'
  | 'inProgress'
  | 'submitted'
  | 'checking'
  | 'needsRevision'
  | 'completed'
  | 'deferred'
  | 'archived';

export type HomeworkItemType =
  | 'vocabulary'
  | 'grammar'
  | 'writing'
  | 'listening'
  | 'open_question';

export type HomeworkEvaluationMethod = 'deterministic' | 'ai_schema';
export type HomeworkEvaluationStatus = 'pending' | 'checking' | 'graded' | 'failed' | 'retryable';

export interface HomeworkItem {
  id: string;
  assignmentId: string;
  type: HomeworkItemType;
  relatedTaskId?: string;
  exerciseId?: string;
  instruction: string;
  required: boolean;
  evaluationMethod: HomeworkEvaluationMethod;
  status: 'pending' | 'completed' | 'needs_revision';
  targetRule?: CanonicalRuleId;
  questionData?: {
    questionText?: string;
    options?: string[];
    correctAnswer?: string;
    promptEn?: string;
  };
}

export interface HomeworkAssignment {
  id: string;
  ownerId: string;
  title: string;
  instruction: string;
  sourceLessonId?: string;
  learningObjectives: string[];
  relatedEntityIds: string[];
  assignedAt: string;
  dueAt: string;
  timezoneAtAssignment: string;
  estimatedMinutes: number;
  status: HomeworkAssignmentStatus;
  assignmentVersion: number;
  items: HomeworkItem[];
}

export interface HomeworkSubmission {
  id: string;
  ownerId: string;
  assignmentId: string;
  itemId: string;
  submissionVersion: number;
  responseReference: string; // Answer text, exercise attempt ID, or writing submission ID
  submittedAt: string;
  evaluationStatus: HomeworkEvaluationStatus;
  feedbackReference?: string;
  feedbackSummaryUz?: string;
  idempotencyKey: string;
}

// Stage 19: Theme System Types
export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';



