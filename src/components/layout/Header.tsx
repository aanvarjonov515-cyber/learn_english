import React from 'react';
import { NavRoute } from './Sidebar';
import { UserProfile } from '../../types';
import { SaveStatusIndicator } from '../common/SaveStatusIndicator';
import { Sparkles, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  currentRoute: NavRoute;
  profile: UserProfile;
}

const ROUTE_TITLES: Record<NavRoute, { title: string; subtitle: string }> = {
  home: { title: 'Bosh sahifa', subtitle: "Bugungi o'quv rejasi va tezkor faoliyatlar" },
  vocabulary: { title: "So'z yodlash", subtitle: "To'plamlar va 40 talik o'rganish bo'limlari" },
  practice: { title: 'Faol Mashq Sessiyasi', subtitle: "Bosqichma-bosqich 6 turdagi interaktiv mashqlar" },
  'spaced-repetition': { title: 'Spaced Repetition (Takrorlash)', subtitle: "Bosqichli takrorlash v1: Muddati kelgan va qiyin so'zlar" },
  reader: { title: "Kitob va Matn O'qish", subtitle: "Interaktiv matn, kontekstli lug'at va iboralar" },
  listening: { title: 'Listening Audiolari', subtitle: 'Kitob va darslar bilan bog‘langan audio markazi' },
  grammar: { title: 'Grammatika Kitoblari', subtitle: 'AI Teacher bilan grammatika tahlili' },
  writing: { title: 'Daily Writing', subtitle: "O'tilgan mavzular bo'yicha mustaqil yozma mashqlar" },
  teacher: { title: 'AI Teacher Sessiyasi', subtitle: "Ingliz tili o'qituvchisi bilan jonli yordam" },
  analytics: { title: 'Natijalar va Progress', subtitle: 'Xotirada saqlanish va faol o‘rganish tahlili' },
  settings: { title: 'Sozlamalar va Profil', subtitle: "O'quv maqsadlari, daraja va qulayliklar" },
};

export const Header: React.FC<HeaderProps> = ({ currentRoute, profile }) => {
  const info = ROUTE_TITLES[currentRoute] || { title: 'English Teacher AI', subtitle: '' };
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <div className="min-w-0 pr-4">
        <h1 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white truncate">
          {info.title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate mt-0.5">
          {info.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <SaveStatusIndicator />

        {/* Theme Quick Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'Kunduzgi rejimga o‘tish' : 'Tungi rejimga o‘tish'}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          title={resolvedTheme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'}
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* Level Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold">
          <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
          <span>Daraja: {profile.estimatedLevel}</span>
        </div>
      </div>
    </header>
  );
};
