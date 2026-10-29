import React, { useState } from 'react';
import {
  UserProfile,
  UserSettings,
  EnglishLevel,
  AccentPreference,
  ReaderTheme,
  ReaderFontSize,
} from '../../types';
import {
  saveUserProfile,
  saveUserSettings,
  isDemoModeActive,
  setDemoModeActive,
} from '../../services/storage';
import {
  User,
  Settings,
  Target,
  Globe,
  Volume2,
  Sliders,
  LogOut,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react';
import { ThemeSettingsSection } from './ThemeSettingsSection';

interface SettingsViewProps {
  profile: UserProfile;
  settings: UserSettings;
  onUpdate: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  settings,
  onUpdate,
}) => {
  const isDemo = isDemoModeActive();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [level, setLevel] = useState<EnglishLevel>(profile.estimatedLevel);
  const [timezone, setTimezone] = useState(profile.timezone || 'Asia/Tashkent');

  const [dailyMinutes, setDailyMinutes] = useState<10 | 20 | 30 | 45>(
    settings.dailyStudyMinutes
  );
  const [newWordsTarget, setNewWordsTarget] = useState(settings.dailyNewWordTarget);
  const [accent, setAccent] = useState<AccentPreference>(settings.preferredAccent);
  const [reduceMotion, setReduceMotion] = useState(settings.reduceMotion);
  const [autoPlayAudio, setAutoPlayAudio] = useState(settings.autoPlayMappedAudio);

  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedProfile: UserProfile = {
      ...profile,
      displayName: displayName.trim() || "O'quvchi",
      estimatedLevel: level,
      timezone: timezone.trim() || 'Asia/Tashkent',
      updatedAt: new Date().toISOString(),
    };

    const updatedSettings: UserSettings = {
      ...settings,
      dailyStudyMinutes: dailyMinutes,
      dailyNewWordTarget: newWordsTarget,
      preferredAccent: accent,
      reduceMotion,
      autoPlayMappedAudio: autoPlayAudio,
    };

    saveUserProfile(updatedProfile);
    saveUserSettings(updatedSettings);

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
    onUpdate();
  };

  const handleToggleDemo = () => {
    setDemoModeActive(!isDemo);
    onUpdate();
  };

  const handleResetData = () => {
    if (confirm("Diqqat! Barcha shaxsiy to'plamlar va progress ma'lumotlari tozalanadi. Tasdiqlaysizmi?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-[#E5E2D9]">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">
          Sozlamalar va Profil
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          O'quv maqsadlaringiz, til darajasi va qulayliklarni o'zingizga moslang.
        </p>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-teal-800" />
            <h3 className="font-serif font-bold text-base text-gray-900">
              Shaxsiy Profil
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 uppercase mb-1.5">
                Ismingiz
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#D5D1C6] rounded-xl text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-gray-700 uppercase">
                  Taxminiy ingliz tili darajangiz
                </label>
                <span className="text-[11px] text-gray-400">(O'zingiz tanlagan dastlabki daraja)</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(['A1', 'A2', 'B1', 'B2', 'C1'] as EnglishLevel[]).map((lvl) => (
                  <button
                    type="button"
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={`py-2 text-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      level === lvl
                        ? 'bg-teal-700 text-white border-teal-800'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 uppercase mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-700" /> Vaqt mintaqasi (Timezone)
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#D5D1C6] rounded-xl text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Kundalik takrorlash navbati aynan shu soat mintaqasi bo'yicha hisoblanadi.
              </p>
            </div>
          </div>
        </div>

        {/* Study Goals */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-800" />
            <h3 className="font-serif font-bold text-base text-gray-900">
              O'quv Maqsadlari
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 uppercase mb-1.5">
                Kunlik o'rganish vaqti
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 45].map((mins) => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => setDailyMinutes(mins as any)}
                    className={`py-2 text-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      dailyMinutes === mins
                        ? 'bg-teal-700 text-white border-teal-800'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {mins} daqiqa
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 uppercase mb-1.5">
                Kunlik yangi so'zlar maqsadi
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((num) => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => setNewWordsTarget(num)}
                    className={`py-2 text-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      newWordsTarget === num
                        ? 'bg-teal-700 text-white border-teal-800'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {num} ta
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stage 19: Theme & Color Preferences */}
        <ThemeSettingsSection />

        {/* Audio & Accessibility */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-800" />
            <h3 className="font-serif font-bold text-base text-gray-900">
              Talaffuz va Interfeys
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 uppercase mb-1.5 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-teal-700" /> Talaffuz afzalligi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccent('us')}
                  className={`py-2 px-3 text-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    accent === 'us'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🇺🇸 Amerika (US)
                </button>
                <button
                  type="button"
                  onClick={() => setAccent('uk')}
                  className={`py-2 px-3 text-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    accent === 'uk'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🇬🇧 Britaniya (UK)
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPlayAudio}
                  onChange={(e) => setAutoPlayAudio(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-800 focus:ring-teal-700 cursor-pointer"
                />
                <span className="text-gray-800 font-medium">
                  So'z ochilganda avtomatik talaffuz qilish
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-800 focus:ring-teal-700 cursor-pointer"
                />
                <span className="text-gray-800 font-medium">
                  Harakatli animatsiyalarni kamaytirish (Reduce Motion)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Demo Mode & Reset */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="font-serif font-bold text-base text-gray-900">
            Rejim va Boshqaruv
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-semibold text-gray-900">
                Namuna Rejimi: {isDemo ? 'Yoqilgan' : "O'chirilgan"}
              </p>
              <p className="text-gray-500 text-[11px]">
                Ilovani namunaviy so'zlar va hikoyalar bilan sinab ko'rish imkoniyati.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleDemo}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                isDemo
                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {isDemo ? "Haqiqiy rejimga o'tish" : "Namuna rejimini yoqish"}
            </button>
          </div>

          <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-between text-xs">
            <span className="text-gray-500">Barcha ma'lumotlarni tozalash:</span>
            <button
              type="button"
              onClick={handleResetData}
              className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
            >
              Ma'lumotlarni tozalash
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {savedNotice ? (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> Sozlamalar saqlandi!
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
          >
            Sozlamalarni Saqlash
          </button>
        </div>
      </form>
    </div>
  );
};
