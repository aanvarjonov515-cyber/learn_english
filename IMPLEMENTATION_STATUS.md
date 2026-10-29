# English Teacher AI - Implementation Status

## Ishlayotgan Funksiyalar (Active & Functional):

### 1-bosqich: Arxitektura, Navigatsiya va Dizayn
- Hash routing barcha asosiy yo'nalishlar bo'yicha URL bilan to'liq sinxronlashgan.
- Desktop chap menyu va mobil pastki panel (Bosh, So'zlar, Takrorlash, O'qish, Tinglash, Grammatika, Writing, AI Teacher).
- Iliq oq fon (`#FAF9F5`), to'q matn, yashil/teal asosiy rang, iliq sariq urg'u.
- Namuna rejimi (Demo Mode) va Haqiqiy rejimning to'liq ajratilganligi.
- Xatolik chegarasi (`ErrorBoundary`).

### 2-bosqich: Profil, Qulayliklar va Saqlash Infratuzilmasi
- Onboarding modali (Ism, taxminiy CEFR A1-C1 darajasi, kunlik maqsad, timezone).
- Universal fayl yuklash komponenti (`FileUploadModal`) - format va hajm tekshiruvi.
- Saqlash holatlari indikatori (`Saqlanmoqda...`, `Saqlandi`, `Saqlanmadi`).

### 3-bosqich: So'zlarni Kiritish, AI Teacher Boyitishi va 40 talik Bo'limlar
- So'zlarni qo'lda kiritish, tarjimasi bilan kiritish, TXT va CSV yuklash.
- Server-side Gemini AI (`gemini-3.8-flash`) yordamida structured JSON formatida lemma, so'z turkumi, o'zbekcha tarjima va misol gaplar.
- Tahrirlash, tasdiqlash va 40 talik bo'limlarga idempotent ajratish.

### 4-bosqich: Bosqichma-bosqich Faol Eslash Mashq Dvigateli (Exercise Engine)
- 6 ta mashq turi: Tanishish, O'zbekcha ma'noni tanlash, Audiodan so'zni tanlash, Harflardan yig'ish, Eshitib yozish (Dictation), Mustaqil yozish (Production).
- 2 ta o'rganish rejimi: 6 talik kichik guruhlar va to'liq bosqichlar.
- Audio talaffuz: Server-side TTS (`gemini-3.8-flash-lite-tts`) va brauzer fallback.

### 5-bosqich: Oraliqli Takrorlash Tizimi ("Bosqichli takrorlash v1")
- Alohida Recognition va Production monitoringi.
- Intervallar: 1, 3, 7, 14, 30, 60 kun.
- Bugungi takrorlash navbati va qiyin so'zlar pedagogik tashxisi.

### 6-bosqich: Interaktiv Reader (Kitob va Matn O'qish)
- Matn tokenizatsiyasi (offsetlar aniq saqlangan).
- Kontekstga mos lug'at oynasi (`DictionaryPopup`), iboralarni tushuntirish, yodlashga qo'shish.
- O'qish mavzulari (Warm paper, Night, Clean light).

### 7-bosqich: Reader Ovozli O'qish Tizimi (Natural Speech Synthesis Engine)
- `SpeechSynthesisService`, `AudioAssetRepository`, `GlobalPlaybackController`, `AlignmentService`.
- 5 ta tabiiy ovoz: `Kore`, `Puck`, `Zephyr`, `Fenrir`, `Charon`.
- Tezliklar: `0.2x` dan `5.0x` gacha pitch preservation bilan. Gap darajasidagi (`sentence`) highlight sinxronlashuvi.

### 8-bosqich: Listening Kutubxonasi va Audio Boshqaruv Markazi
- Yagona va ommaviy audio yuklash.
- Qat'iy satrli `trackLabel` saqlanishi (masalan, `"3.23"`, `"1.03"` != `"1.3"`).
- A–B oraliqli takrorlash (A-B Loop), xatcho'plar, diktant tekshiruvi (Word diff) va AI Transkripsiya (`gemini-3.5-transcribe`).

### 9-bosqich: Grammatika PDF Darsliklari
- Ikki tomonlama sahifalash (`pdfPageIndex` vs `printedPageLabel`).
- Unitlar va mavzular strukturasi, rasmiy javob kaliti va AI Teacher yechimi.

### 10-bosqich: Book Listening Track Mapping & Audio Playback Flow
- **Deterministik track aniqlash (`trackMatcher.ts`)**:
  - Darslik sahifalari va mashqlardan "Track 3.23", "T 1.03", "Audio 2.4", "CD2 Track 7" kabi belgilarni ajratib olish.
  - Track label har doim qat'iy satr (`string`) sifatida saqlanadi ("1.03" va "1.3" aralashmaydi).
- **Nomzodlarni topish ustuvorligi**:
  1. Oldin tasdiqlangan mapping (`exerciseId` bo'yicha).
  2. Darslik kolleksiyasidagi aniq mos label.
  3. Boshqa kolleksiyalardagi aniq mos label.
  4. Normalizatsiya qilingan label / fayl nomi mosligi.
  5. Foydalanuvchining qo'lda tanlashi.
- **Mapping holatlari**: `unlinked`, `suggested`, `ambiguous`, `confirmed`, `unavailable`, `stale`. AI yoki fayl nomi asosidagi takliflar foydalanuvchi tasdiqlamaguncha hech qachon avtomatik `confirmed` bo'lmaydi.
- **Audio oraliqlari (`startSeconds`, `endSeconds`)**:
  - Bitta trek bir nechta mashqni qamrab olgan holatlar uchun oraliqni belgilash, sinab ko'rish va to'liq trekka qaytarish. Validatsiya: start >= 0, end > start, end <= duration, min 1s.
- **Teacher ovozi va Listening audiosi muvofiqligi**:
  - Listening boshlanishi bilan Teacher ovozi (TTS/Web Speech) darhol to'xtatiladi.
  - Listening yakunlangach, Teacher o'zboshimchalik bilan gapirib ketmaydi; foydalanuvchiga "Teacher bilan davom etish" tugmasi taqdim etiladi.
- **Listening dars oqimi (9 bosqich)**:
  1. Ko'rsatmani ko'rish → 2. Savollarni oldindan o'qish → 3. 1-tinglash → 4. Foydalanuvchi javobi → 5. Qayta tinglash → 6. Javobni tekshirish → 7. Ixtiyoriy transkriptni ochish (yordam sifatida qayd etiladi) → 8. Qiyin joyni qayta tinglash → 9. Ustoz izohi.
- **Dalillar monitoringi**: Tinglangan intervallar, seek, replay va yordam `ExerciseAudioEvidence` orqali saqlanadi.

### 11-bosqich: Yagona AI Teacher Dars Boshqaruv Tizimi (`TeacherView.tsx`)
- **Teacher shaxsiyati**: Sabrli, kamsitmaydigan, tushuntiruvchi, pedagogik, o'zbekcha tushuntirish va sodda inglizcha misollar. AI yordamchi ekanligi oshkora ko'rsatiladi.
- **6 ta dars boshlash nuqtasi**:
  - "Bugungi darsni boshlash" (`today_lesson`)
  - "Kitobdan davom etish" (`continue_book`)
  - "Shu mavzuni o'rganish" (`study_topic`)
  - "Qiyin so'zlarimni mashq qilish" (`hard_words`)
  - "Listeningni davom ettirish" (`continue_listening`)
  - "Kecha qilgan xatolarimni ko'rish" (`yesterday_mistakes`)
- **Sessiya holatlari (State Machine)**:
  `preparing` → `goalSetting` → `explaining` → `demonstrating` → `guidedPractice` → `independentPractice` → `checkingUnderstanding` → `reviewing` → `summarizing` → `completed` (va istalgan payt `paused`). Server-side o'tish tekshiruvi.
- **1–3 ta aniq dars maqsadi**: Masalan: Present Simple'da I/you/we/they bilan asosiy fe'l, he/she/it bilan -s/-es qo'shish.
- **Strukturalangan Teacher Actionlari**:
  - `explainTopic`, `showExample`, `askQuestion`, `openBookPage`, `prepareListeningExercise`, `proposeWritingTask`, `summarizeLesson`.
- **Exemplar ssenariy**:
  - O'quvchi: "He go to school every day."
  - Teacher: Fikr tushunarli ekanini aytadi, uchinchi shaxsda (he) -es qo'shilishini tushuntiradi, "He goes to school every day." namunasini beradi va darhol yangi sinov savolini uzatadi: "She ___ English every evening."
- **Moslashuv qoidalari**: Ketma-ket to'g'ri javoblar yordamni kamaytiradi; takror xatolar tushuntirishni soddalashtirib boshqariladigan savol beradi; javob ochilsa yangi transfer savoli taklif etiladi.
- **Sessiya xulosasi va dalillar**: O'tilgan mavzular, bajarilgan mashqlar, mustaqil to'g‘ri javoblar va xatolar aniq attempt va dalillarga asoslanadi. Checkpoint orqali sahifa yangilansa ham sessiya davom etadi.

### 13-bosqich: Media va O‘qituvchi Avatari Tizimi (`MediaPanel.tsx`, `TeacherRiggedAvatar.tsx`)
- **Qayta Ishlatiluvchi Universal Media Panel (`MediaPanel.tsx`)**:
  - Reader va AI Teacher modullari uchun umumiy interfeys.
  - 4 ta rejim: `none` (yashirilgan), `video` (foydalanuvchi videosi), `staticAvatar` (statik rasm), `animatedAvatar` (2D SVG anime interaktiv avatar).
  - Yig‘ilish (collapse) va kengayish, rejim tanlash va avatar almashtirish.
- **2D SVG Rigged Anime O‘qituvchi Avatari ("Ms. Laylo")**:
  - Bosh, ko‘zlar (miltillash), qoshlar, lablar, tana va harakatlanuvchi qo‘llar (left/right arms).
  - 8 ta holat: `idle`, `listening`, `thinking`, `speaking`, `explaining`, `encouraging`, `paused`, `error`.
  - Web Audio API amplitude lip-sync analyzer va xavfsiz fallback rejim.
- **Video Rejim**:
  - Video yuklash va ijro. Original video ovozi yoki muted + Teacher TTS audio tanlovi.

### 14-bosqich: Kunlik O‘quv Rejasi va Dashboard Integratsiyasi (`DailyPlanView.tsx`)
- **Deterministik Kunlik Reja Dvigateli (`studyPlanStorage.ts`)**:
  - 10, 20, 30, 45 daqiqalik kunlik vaqt byudjetiga moslashtirilgan o‘quv rejasi.
  - Ustuvorlik tartibi: 1. Lug‘at takrorlash (Due words) → 2. Yangi so‘zlar → 3. AI Teacher darsi → 4. Grammatika/Listening mashqi → 5. Writing va Revision → 6. Reader mutolaasi.
  - Dalillar bilan tasdiqlanish: `ExerciseAudioEvidence`, `WritingSubmission` va `ActivityEvent` orqali topshiriq bajarilishi avtomatik tekshiriladi.
- **Uzluksizlik (Streak) va Lokal Midnight Boundary**:
  - `Asia/Tashkent` vaqt zonasi bo‘yicha vaqt va kunlar hisobi, idempotent hodisa qaydlari.

### 15-bosqich: Responsivlik, Mobil, Samaradorlik, Accessibility va Cleanup
- **Interfeys Qulayligi (Touch & Layout)**:
  - Mobil qurilmalarda minimal 44x44px bosish maydoni.
  - Virtual klaviatura va chat kiritish muhitida ekran qirqilmasligi (`dvh` va padding protection).
  - Klaviatura navigatsiyasi, ARIA yorliqlar, ESC tugmasi orqali modallarni yopish.
- **Resurslarni Tozalash**:
  - Unmount bo‘lganda audio tugunlar, `AudioContext`, taymerlar va Object URL fayllari xotiradan to‘liq tozalanadi.

### 16-bosqich: Yakuniy Tekshiruv va Hujjatlashtirish
- **Barcha Avtomatlashtirilgan Testlar**: `12/12 PASSED` (`npx tsx --test src/tests/*.test.ts`).
- **Tur Tekshiruvi**: `tsc --noEmit` 0 xatolik.
- **Production Build**: `compile_applet` muvaffaqiyatli o‘tdi.
- **Ishlab Chiqish va Deploy Hujjatlari**: `RELEASE_READINESS.md`, `SETUP.md`, `DEPLOYMENT.md`.

### 17-bosqich: Bitta Yagona AI Teacher, Doimiy Erkin Chat va O‘quvchi Xotirasi
- **Bitta Yagona Ustoz va Server Promptlari**: `src/server/prompts/teacherPrompts.ts` faylida versiyalangan tizim directive-lari. Tabiiy, samimiy va "Siz" deb murojaat qiluvchi, har xabarda salomlashmaydigan, max 1 ta savol beradigan, xatoni qoida murakkabligiga bog'laydigan, 9 xil tushuntirish usulidan tanlaydigan va "tushunmadim" deganda boshqa soddaroq usulga o'tadigan ustoz.
- **Doimiy Chat (`PersistentTeacherChat.tsx`)**:
  - Suhbatlar ro'yxati, yangi suhbat ochish, nomini o'zgartirish va o'chirish.
  - Sahifalash (pagination: `page=1, pageSize=20`) va eski xabarlarni yuklash.
  - Xabar holatlari (`sending`, `sent`, `error`), double-click prevention (`requestId`), cancel/abort tugmasi va TTS ovozli eshitish.
- **O‘quvchi Xotirasi (`LearnerMemoryModal.tsx`)**:
  - Afzalliklar, o'quv maqsadlari, mashq dalillari va ustoz taxminlari. User ko'rishi, tahrirlashi va o'chirishi mumkin.

### 18-bosqich: Integratsiyalashgan Kundalik Uy Vazifalari Tizimi (`HomeworkView.tsx`)
- **Uy vazifasi modeli va oqimi (`homeworkStorage.ts`)**:
  - `HomeworkAssignment`, `HomeworkItem`, `HomeworkSubmission` modellari va statuslar (`assigned`, `inProgress`, `checking`, `needsRevision`, `completed`, `deferred`).
  - Javob topshirish, deterministik va AI schema bo'yicha baholash va versiyalangan qayta topshirish (`submissionVersion`).
  - Muddatni surish (deferral) va yengillashtirish (simplification) opsiyalari.
  - Ilovaga kirganda holatni yangilash haqida ochiq-oydin xabar ("Ilovaga kirganingizda holat yangilanadi").

### 19-bosqich: Tizimli Kunduzgi va Tungi Rejim Tizimi (`ThemeContext.tsx`, `index.css`)
- **Theme prefiks va boshqaruv**: `light` | `dark` | `system` va `prefers-color-scheme` tinglovchisi.
- **Fast Render & Flash Prevention**: `document.documentElement` da `.dark` va `color-scheme: dark` darhol o'rnatiladi.
- **Semantik tokenlar**: Background, surface, elevated, textPrimary, textSecondary, border, primary colors va focus rings. Reader va PDF viewer rejimlari bilan izchil uyg'unlik.

---

## Tekshiruv Natijalari:
- **Unit & Integration Test Suite** (`npx tsx --test src/tests/*.test.ts`):
  - 17 ta test: Barchasi 100% muvaffaqiyatli o'tdi (0 xato).
- **Linter Tekshiruvi** (`tsc --noEmit`): 0 xatolik.
- **Build Tekshiruvi** (`compile_applet`): Muvaffaqiyatli yig'ildi.
