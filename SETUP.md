# Local Setup Guide: English Teacher AI

O‘rnatish va mahalliy kompyuterda ishga tushirish bo‘yicha qo‘llanma.

## Requirements (Talablar)
- **Node.js**: v18.0.0 yoki undan yuqori
- **npm**: v9.0.0 yoki undan yuqori

## Step 1: O‘rnatish (Dependencies)
Terminalda loyiha papkasiga kiring va quyidagi buyruqni bajaring:

```bash
npm install
```

## Step 2: Atrof-muhit o‘zgaruvchilari (.env)
Kompaniyangiz yoki AI Studio tomonidan taqdim etilgan Gemini API kalitini sozlashingiz mumkin:

`.env.example` faylidan nusxa olib `.env` faylini yarating:

```bash
cp .env.example .env
```

`.env` fayli ichida:
```env
GEMINI_API_KEY="Sening_Gemini_API_Kaliting"
PORT=3000
```

## Step 3: Ishga Tushirish (Development Mode)
Ilovani Express server va Vite dev middlewares bilan birga ishga tushiring:

```bash
npm run dev
```

Brauzeringizda quyidagi manzilni oching:
`http://localhost:3000`

## Step 4: Testlarni Bajarish
Barcha 12 ta birlik va integratsion testlarni tekshirish uchun:

```bash
npx tsx --test src/tests/*.test.ts
```

Type check va sintaksis xatolarini tekshirish uchun:

```bash
npm run lint
```
