# Production Deployment Guide: English Teacher AI

Production muhitiga (Cloud Run, Vercel, Node.js server) joylashtirish bo‘yicha qo‘llanma.

## Build Jarayoni
Ilovani build qilish uchun:

```bash
npm run build
```

Bu buyruq:
1. `tsc --noEmit` orqali tur (type) xatolarini tekshiradi.
2. Vite orqali frontend statik fayllarini `dist` papkasiga yig‘adi.

## Production Serverni Ishga Tushirish
Express server `server.ts` orqali frontend va backend so‘rovlarini boshqaradi:

```bash
npm start
```

## Salomatlikni Tekshirish (Health Check)
Server ishga tushgach, server salomatligini tekshirish uchun:

```http
GET /api/health
```

Javob:
```json
{
  "status": "ok",
  "hasApiKey": true
}
```

## Xavfsizlik bo‘yicha Maslahatlar
1. `GEMINI_API_KEY` muhit o‘zgaruvchisi faqat backend serverda saqlanishi va hech qachon mijoz kodida oshkor bo‘lmasligi kerak.
2. Node.js server porti standart 3000 yoki `PORT` o‘zgaruvchisi orqali boshqariladi.
