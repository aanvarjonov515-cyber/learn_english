import React from 'react';
import { Headphones, Compass, PenTool, Bot, Clock, AlertCircle } from 'lucide-react';
import { NavRoute } from '../layout/Sidebar';

interface UpcomingModuleViewProps {
  route: NavRoute;
}

const MODULE_INFO: Record<
  string,
  {
    title: string;
    stage: string;
    icon: React.FC<{ className?: string }>;
    description: string;
    features: string[];
    statusNote: string;
  }
> = {
  listening: {
    title: 'Listening Audiolari',
    stage: '7-bosqichda to‘liq ulanadi',
    icon: Headphones,
    description:
      "Listening audiolarini yuklash, nomlash, kitob matnlari bilan sinxron ijro qilish va audio topshiriqlarni bajarish moduli.",
    features: [
      'Audio fayllarni MP3/WAV formatida yuklash va metama’lumotlarini saqlash',
      'Matn va kitob qatorlari bilan real vaqtli audio highlight alignment',
      'Tinglash orqali savol-javob topshiriqlari',
      '0.75x, 1x, 1.25x tezlikda tinglash boshqaruvi',
    ],
    statusNote:
      "Hozirda audio arxitekturasi va Web Speech / Server TTS integratsiyasi tayyorlangan. To'liq audio asset saqlash va sinxronlash 7-bosqichda ulanadi.",
  },
  grammar: {
    title: 'Grammatika Kitoblari',
    stage: '8-bosqichda to‘liq ulanadi',
    icon: Compass,
    description:
      "PDF formatidagi grammatika kitoblarini yuklash, mavzular bo'yicha bo'limlarga ajratish va AI Teacher bilan qoidalarni o'rganish.",
    features: [
      'Grammatika PDF qo‘llanmalarini yuklash',
      'Har bir unit (bo‘lim) bo‘yicha AI tushuntirishlari (o‘zbek tilida)',
      'Interaktiv grammatika testlari va bo‘sh joyni to‘ldirish mashqlari',
      'Kitobdagi listening topshirig‘ini tegishli audio bilan ochish',
    ],
    statusNote:
      "GrammarBook va AudioTrackMapping modellari tizim arxitekturasiga kiritilgan. PDF parser va mavzuli darslar 8-bosqichda ulanadi.",
  },
  writing: {
    title: 'Daily Writing (Yozma Mashqlar)',
    stage: '9-bosqichda to‘liq ulanadi',
    icon: PenTool,
    description:
      "O'tilgan so'zlar va mavzular asosida kundalik insho va erkin gaplar yozish, AI Teacher tomonidan grammatika va so'z qo'llanishini tekshirish.",
    features: [
      "Bugungi o'rganilgan so'zlarni ishlatib 3-5 ta jumla yoki qisqa matn yozish",
      "Grammatik va orfografik xatolarni tushuntirib berish",
      "Yaxshiroq sinonimlar va tabiiy iboralar taklif qilish",
      "Yozma progress tarixi va revision boshqaruvi",
    ],
    statusNote:
      "WritingSubmission modeli domen turlarida tayyorlangan. Yozma tahlil va AI feedback 9-bosqichda ulanadi.",
  },
  teacher: {
    title: 'AI Teacher Sessiyasi',
    stage: '10-bosqichda to‘liq ulanadi',
    icon: Bot,
    description:
      "Ingliz tili metodisti va o'qituvchi avatar bilan jonli interaktiv darslar va tushuntirishlar.",
    features: [
      "Har qanday qiyin so'z yoki grammatika qoidasini o'zbek tilida so'rab o'rganish",
      "Real vaqtli ovozli suhbat (Gemini Live API integratsiyasi)",
      "Tanlangan o'qituvchi avatari bilan dars ko'rish",
      "Shaxsiy xatolarga asoslangan tavsiyalar",
    ],
    statusNote:
      "AI so'rovlarining server xavfsizligi va Gemini 3.8 Flash arxitekturasi tayyor. Avatar va ovozli jonli sessiya 10-bosqichda to'liq ulanadi.",
  },
};

export const UpcomingModuleView: React.FC<UpcomingModuleViewProps> = ({ route }) => {
  const info = MODULE_INFO[route] || MODULE_INFO.listening;
  const Icon = info.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center">
          <Icon className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
            {info.stage}
          </span>
          <h2 className="font-serif font-bold text-2xl text-gray-900 pt-2">
            {info.title}
          </h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            {info.description}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E5E2D9] text-left space-y-2">
          <h4 className="font-semibold text-xs text-gray-900 uppercase tracking-wider">
            Rejalashtirilgan asosiy imkoniyatlar:
          </h4>
          <ul className="space-y-1.5 text-xs text-gray-600">
            {info.features.map((feat, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-teal-700 font-bold">•</span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
          <div>
            <p className="font-semibold">Hozirgi holat:</p>
            <p className="text-[11px] mt-0.5">{info.statusNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
