# English Teacher AI - Architecture & System Design

## 1. Papkalar Tuzilishi
```
/
├── server.ts                   # Express full-stack server va Gemini endpointlari
├── src/
│   ├── server/
│   │   └── gemini.ts           # Server-side @google/genai integratsiyasi:
│   │                           # - gemini-3.8-flash (vocab enrich, dictionary lookup, teacher explain, teacher turn, writing evaluate)
│   │                           # - gemini-3.8-flash-lite-tts (speech synthesis)
│   │                           # - gemini-3.5-transcribe (audio transcription)
│   ├── types/
│   │   └── index.ts            # Barcha domen turlari:
│   │                           # - UserProfile, UserSettings, Vocabulary, ReviewState
│   │                           # - AudioAsset, AudioCollection, AudioTrackMapping, ExerciseAudioEvidence
│   │                           # - GrammarBook, BookPage, GrammarUnit, GrammarExercise
│   │                           # - TeacherSession, TeacherSessionState, TeacherStructuredAction, LessonGoal
│   │                           # - WritingTask, WritingSubmission, WritingIssue, RecurringErrorStat
│   ├── services/
│   │   ├── storage.ts          # LocalStorage / Session boshqaruvi, Demo vs Haqiqiy rejim
│   │   ├── scheduler.ts        # Spaced Repetition ("Bosqichli takrorlash v1") dvigateli
│   │   ├── tokenizer.ts        # Reader matnini tokenizatsiya qilish va offset boshqaruvi
│   │   ├── csvParser.ts        # PapaParse RFC 4180 va TXT qatorli parser
│   │   ├── audio.ts            # Web Speech API va qisqa talaffuz ovozi
│   │   ├── audioEngine.ts      # GlobalPlaybackController, SpeechSynthesisService, AudioAssetRepository
│   │   ├── listeningStorage.ts # Audio treklari, xatcho'plar, A-B loop, diktant solishtirish
│   │   ├── grammarStorage.ts   # Darsliklar, unitlar, mashqlar, ikki tomonlama indekslash
│   │   ├── trackMatcher.ts     # Deterministik track reference ajratish va kandidat saralash (10-bosqich)
│   │   ├── mappingStorage.ts   # AudioTrackMapping va ExerciseAudioEvidence saqlash (10-bosqich)
│   │   ├── teacherStorage.ts   # TeacherSession, state machine va adaptiv qoidalar (11-bosqich)
│   │   ├── writingStorage.ts   # WritingTask, WritingSubmission va takroriy xatolar taksonomiyasi (12-bosqich)
│   │   ├── mediaStorage.ts     # Avatarlar, video assetlar, video-text mapping va media afzalliklar (13-bosqich)
│   │   ├── audioAnalyzer.ts    # Web Audio API amplitude Lip-Sync analyzer va fallback (13-bosqich)
│   │   ├── activityLogger.ts   # ActivityEvent idempotent qayd qilish va kunlik statistika (14-bosqich)
│   │   └── studyPlanStorage.ts # Deterministik vaqt byudjetiga ega kunlik o‘quv rejasi (14-bosqich)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx     # Desktop chap navigatsiya
│   │   │   ├── BottomNav.tsx   # Mobil pastki panel
│   │   │   └── Header.tsx      # Yuqori sarlavha, SaveIndicator, Daraja
│   │   ├── common/
│   │   │   ├── DemoBanner.tsx
│   │   │   ├── SaveStatusIndicator.tsx
│   │   │   └── FileUploadModal.tsx
│   │   ├── media/
│   │   │   ├── TeacherRiggedAvatar.tsx  # 2D SVG Anime rigged avatar (Ms. Laylo) (13-bosqich)
│   │   │   ├── MediaPanel.tsx          # Qayta ishlatiluvchi universal Media Panel (13-bosqich)
│   │   │   └── AvatarSelectionModal.tsx # Avatar kutubxonasi va rasm yuklash modali (13-bosqich)
│   │   ├── dashboard/
│   │   │   └── DailyPlanView.tsx       # Kunlik interaktiv o‘quv rejasi va streak paneli (14-bosqich)
│   │   │   ├── FileUploadModal.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── onboarding/
│   │   │   └── OnboardingModal.tsx
│   │   ├── home/
│   │   │   └── HomeView.tsx
│   │   ├── vocabulary/
│   │   │   ├── VocabularyView.tsx
│   │   │   └── NewDeckWizard.tsx
│   │   ├── practice/
│   │   │   └── ExerciseEngine.tsx
│   │   ├── reader/
│   │   │   ├── ReaderView.tsx
│   │   │   ├── ReaderAudioBar.tsx
│   │   │   ├── DictionaryPopup.tsx
│   │   │   └── AddToVocabModal.tsx
│   │   ├── listening/
│   │   │   └── ListeningView.tsx
│   │   ├── grammar/
│   │   │   ├── GrammarView.tsx
│   │   │   ├── TeacherPanel.tsx
│   │   │   ├── GrammarExerciseModal.tsx
│   │   │   └── AudioTrackMappingModal.tsx
│   │   ├── teacher/
│   │   │   └── TeacherView.tsx
│   │   ├── writing/
│   │   │   └── WritingView.tsx
│   │   ├── repetition/
│   │   │   └── SpacedRepetitionView.tsx
│   │   ├── analytics/
│   │   │   └── AnalyticsView.tsx
│   │   └── settings/
│   │       └── SettingsView.tsx
│   ├── tests/
│   │   └── stages10_11_12.test.ts # 10, 11 va 12-bosqichlar test paketi
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── PROJECT_SPEC.md
├── IMPLEMENTATION_STATUS.md
└── ARCHITECTURE.md
```

## 2. Frontend va Backend Chegarasi
- **Frontend**:
  - React 19 + TypeScript + Tailwind CSS.
  - Hech qanday maxfiy API kaliti (`GEMINI_API_KEY`) frontend kodiga yoki bundlega chiqarilmaydi.
  - Barcha AI so'rovlari va baholashlar `/api/*` orqali serverga yo'naltiriladi.
- **Backend (`server.ts`)**:
  - Node.js + Express runtime port 3000 da ishlaydi.
  - Endpointlar:
    - `POST /api/vocabulary/enrich`: Lug'at boyitish.
    - `POST /api/dictionary/lookup`: Kontekstual ma'no qidiruvi.
    - `POST /api/tts/speak`: Unary WAV talaffuz generatsiyasi.
    - `POST /api/listening/transcribe`: Audio transkripsiyasi.
    - `POST /api/grammar/teacher-explain`: Grammatika sahifasi tushuntirishlari.
    - `POST /api/grammar/suggest-structure`: Kitob mundarijasini unitlarga ajratish.
    - `POST /api/teacher/turn`: AI Teacher individual dars muloqoti.
    - `POST /api/writing/evaluate`: Yozma ishlarni tekshirish va offsetlarni qayta kalibrlash.

## 3. Audio Coordination & Track Mapping Arxitekturasi (10-bosqich)
- `trackMatcher.ts` kitob sahifasidagi tekstlardan deterministik regex orqali "Track 3.23", "T 1.03", "CD2 Track 7" kabi belgilarni ajratadi.
- `trackLabel` satr sifatida saqlanadi ("1.03" !== "1.3").
- `GlobalPlaybackController`:
  - Listening boshlanganda Teacher ovozi darhol to'xtatiladi.
  - Listening tugagach, Teacher avtomatik gapirib ketmaydi; foydalanuvchiga "Teacher bilan davom etish" tugmasi ko'rsatiladi.
  - Audio intervallari (`startSeconds`, `endSeconds`) bilan qirqib eshitish ta'minlangan.

## 4. AI Teacher State Machine (11-bosqich)
- Holatlar: `preparing` → `goalSetting` → `explaining` → `demonstrating` → `guidedPractice` → `independentPractice` → `checkingUnderstanding` → `reviewing` → `summarizing` → `completed`.
- Har bir holat o'tishi `ALLOWED_TRANSITIONS` matritsasi bo'yicha server va clientda tekshiriladi.
- Adaptivlik:
  - Ketma-ket to'g'ri javoblar scaffolding (yordam) darajasini kamaytiradi.
  - Ketma-ket xatolar soddaroq tushuntirish va boshqariladigan savol beradi.

## 5. Daily Writing & Canonical Error Taxonomy (12-bosqich)
- Yozma ish topshirilganda snapshot yaratiladi va qayta tahrirlar `parentSubmissionId` orqali yangi revision (`v2`) bilan bog'lanadi.
- Kanonik qoidalar taksonomiyasi:
  `thirdPersonSingular`, `doDoes`, `articleUsage`, `wordOrder`, `subjectVerbAgreement`, `tenseChoice`, `spelling`, `other`.
- Offsetlar va spanlar matn ichidagi haqiqiy belgilar bilan solishtirilib, model xatolari qayta kalibrlanadi.
