import React from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ThemePreference } from '../../types';

export const ThemeSettingsSection: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options: { key: ThemePreference; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      key: 'light',
      label: 'Kunduzgi (Light)',
      desc: 'Iliq oq va qulay ravshan fon',
      icon: <Sun className="w-5 h-5 text-amber-500" />,
    },
    {
      key: 'dark',
      label: 'Tungi (Dark)',
      desc: 'To‘q slate va ko‘zni toliqtirmaydigan rejim',
      icon: <Moon className="w-5 h-5 text-indigo-400" />,
    },
    {
      key: 'system',
      label: 'Qurilmaga mos (System)',
      desc: 'Qurilmangiz sozlamalariga avtomatik moslashadi',
      icon: <Monitor className="w-5 h-5 text-slate-500 dark:text-slate-400" />,
    },
  ];

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Mavzu va Rejim (App Theme)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ilovaning ko‘rinish rejimini va tungi dizayn sozlamalarini belgilang.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setTheme(opt.key)}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
              theme === opt.key
                ? 'border-teal-600 dark:border-teal-400 bg-teal-50/50 dark:bg-teal-900/20 ring-2 ring-teal-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              {opt.icon}
              {theme === opt.key && (
                <div className="p-1 rounded-full bg-teal-600 text-white">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                {opt.label}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                {opt.desc}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
        <span>Faol qo‘llanilgan rejim: <strong>{resolvedTheme === 'dark' ? 'Tungi (Dark)' : 'Kunduzgi (Light)'}</strong></span>
      </div>
    </div>
  );
};
