# English Teacher AI - Project Specification

## 1. Mahsulotning Asosiy Maqsadi
“English Teacher AI” — o‘zbek tilida so‘zlashuvchi foydalanuvchilar uchun ingliz tilini o‘rgatishga mo‘ljallangan sun'iy intellekt asosidagi keng qamrovli ta'limiy web-ilova.

### Asosiy Foydalanuvchi Imkoniyatlari:
1. **So'z kiritish va import**:
   - Har bir qatorda bitta so'z yoki ibora kiritish.
   - O'zbekcha tarjimasi bilan birga kiritish (apple — olma).
   - TXT va RFC 4180 talablariga mos CSV fayllarni yuklash.
2. **AI Teacher orqali boyitish**:
   - Asosiy shakl (lemma), so'z turkumi, kontekstga mos o'zbekcha tarjima, A2/B1 darajasidagi inglizcha misol va o'zbekcha tarjimasi.
3. **40 talik bo'limlar**:
   - Standart bo'lim hajmi: 40 ta so'z (sozlanishi mumkin: 20, 30, 40, 50).
4. **Bosqichma-bosqich Faol Eslash Mashqlari (Exercise Engine)**:
   - Tanishish, O'zbekcha ma'noni tanlash, Audiodan so'zni tanlash, Harflardan yig'ish, Eshitib yozish (Dictation), Mustaqil yozish (Free production).
5. **Oraliqli Takrorlash Tizimi ("Bosqichli takrorlash v1")**:
   - Alohida Recognition va Production o'lchovlari. Intervallar: 1, 3, 7, 14, 30, 60 kun.
6. **Interaktiv Reader (Kitob va Matn O'qish)**:
   - Istalgan so'zga bosib aniq gapdagi o'zbekcha ma'nosini ko'rish.
   - Iboralarni tushuntirish, yodlashga qo'shish, mavzular (Paper, Night, Light).
7. **Reader Ovozli O'qish Tizimi (Natural Speech Synthesis)**:
   - Gapma-gap tabiiy ovozda o'qish (Gemini TTS: `Kore`, `Puck`, `Zephyr`, `Fenrir`, `Charon`).
   - Tezlik boshqaruvi (`0.2x` dan `5.0x` gacha) pitch preservation bilan.
   - Gap darajasidagi moslik (`alignmentLevel: 'sentence'`) va faol gapni real vaqtda ajratib ko'rsatish.
8. **Listening Kutubxonasi va Audio Markaz**:
   - Audio fayllarni boshqarish va yuklash.
   - Qat'iy satrli `trackLabel` (masalan, `"3.23"`, `"1.03"` kasr son emas, string saqlanadi).
   - A–B oraliq takrorlash, xatcho'plar va AI audio transkripsiya.
9. **Grammatika PDF Kitoblari**:
   - Ikki tomonlama sahifalash (`pdfPageIndex` vs `printedPageLabel`).
   - Rasmiy kalit va AI Teacher tahlili.
10. **Kitob Listening Track Mapping & Audio Playback Flow (10-bosqich)**:
   - Darslikdan deterministik track aniqlash ("Track 3.23", "T 1.03", "CD2 Track 7").
   - Nomzodlarni ustuvorlik bo'yicha saralash va tasdiqlash modali (`AudioTrackMappingModal`).
   - Bitta trekdagi mashqlarga mos vaqt oralig'ini qirqish (`startSeconds`, `endSeconds`).
   - Listening va Teacher ovozi muvofiqligi: Listening boshlanganda Teacher ovozi to'xtatiladi; listening tugagach "Teacher bilan davom etish" tugmasi chiqadi.
   - 9 bosqichli listening dars oqimi va dalillar (`ExerciseAudioEvidence`) hisobi.
11. **Yagona AI Teacher Dars Boshqaruv Tizimi (11-bosqich)**:
   - 6 ta dars boshlash nuqtasi: Bugungi dars, Kitobdan davom etish, Mavzuni o'rganish, Qiyin so'zlar, Listening, Kechagi xatolar.
   - 10 bosqichli pedagogik State Machine (`preparing` → `completed`).
   - 1-3 ta aniq dars maqsadi (e.g. Present Simple affirmative with -s/-es).
   - Strukturalangan actionlar: `explainTopic`, `showExample`, `askQuestion`, `openBookPage`, `prepareListeningExercise`, `proposeWritingTask`.
   - Adaptiv qoidalar va sessiya yakunida strukturaviy xulosa.
12. **Daily Writing va AI Feedback Tizimi (12-bosqich)**:
   - Bugungi topshiriq, Yozish muhiti (Editor), Qayta yozish, Tarix, Takroriy xatolar profili.
   - Avtosaqlash, yordamchi reja va o'zgarmas submission snapshotlar.
   - AI Feedback: Kuchli jihatlar, xatolarning matndagi aniq spani va qayta kalibrlangan offsetlari, o'zbekcha izoh, bitta ustoz tavsiyasi va yangi vaziyatdagi mustaqil transfer topshiriq.
   - Kanonik xatolar taksonomiyasi (`thirdPersonSingular`, `doDoes`, `articleUsage`, `wordOrder`, `subjectVerbAgreement`, `tenseChoice`, `spelling`, `other`).
13. **Kelgusi Bosqichlar**:
   - 13-bosqich: AI Avatar Teacher bilan jonli ovozli suhbat (Gemini Live API).
   - 14-bosqich: Firebase Firestore bulutli sinxronizatsiyasi.
