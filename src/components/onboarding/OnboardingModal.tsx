import React, { useState } from 'react';
import { UserProfile, UserSettings, EnglishLevel, AccentPreference } from '../../types';
import { saveUserProfile, saveUserSettings } from '../../services/storage';
import { Sparkles, Globe, Clock, Volume2, Target } from 'lucide-react';

interface OnboardingModalProps {
  initialProfile: UserProfile;
  initialSettings: UserSettings;
  onComplete: (profile: UserProfile, settings: UserSettings) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialProfile,
  initialSettings,
  onComplete,
}) => {
  // Detect browser timezone or fallback to Asia/Tashkent
  const browserTimezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tashkent'
      : 'Asia/Tashkent';

  const [displayName, setDisplayName] = useState(initialProfile.displayName || '');
  const [level, setLevel] = useState<EnglishLevel>(initialProfile.estimatedLevel || 'A2');
  const [dailyMinutes, setDailyMinutes] = useState<10 | 20 | 30 | 45>(
    initialSettings.dailyStudyMinutes || 20
  );
  const [newWordsTarget, setNewWordsTarget] = useState(initialSettings.dailyNewWordTarget || 10);
  const [accent, setAccent] = useState<AccentPreference>(initialSettings.preferredAccent || 'us');
  const [timezone, setTimezone] = useState(initialProfile.timezone || browserTimezone);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile: UserProfile = {
      ...initialProfile,
      displayName: displayName.trim() || "O'quvchi",
      estimatedLevel: level,
      timezone: timezone || 'Asia/Tashkent',
      isOnboarded: true,
      updatedAt: new Date().toISOString(),
    };

    const updatedSettings: UserSettings = {
      ...initialSettings,
      dailyStudyMinutes: dailyMinutes,
      dailyNewWordTarget: newWordsTarget,
      preferredAccent: accent,
    };

    saveUserProfile(updatedProfile);
    saveUserSettings(updatedSettings);
    onComplete(updatedProfile, updatedSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FAF9F5] border border-[#E5E2D9] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-100 text-teal-800 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 font-serif">English Teacher AI ga xush kelibsiz!</h2>
          <p className="text-sm text-gray-600 mt-1">
            Darslarni sizning maqsadingiz va darajangizga moslashtirish uchun qisqa sozlamalarni tanlang.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Ism */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Ismingiz
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Masalan: Ali, Malika..."
              className="w-full px-3.5 py-2.5 bg-white border border-[#D5D1C6] rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
            />
          </div>

          {/* Taxminiy daraja */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Taxminiy ingliz tili darajangiz
              </label>
              <span className="text-[11px] text-gray-500">(O'zingiz tanlagan dastlabki daraja)</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(['A1', 'A2', 'B1', 'B2', 'C1'] as EnglishLevel[]).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`py-2 text-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    level === lvl
                      ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Kunlik o'rganish vaqti */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-700" /> Kunlik o'rganish maqsadi
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 45].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setDailyMinutes(mins as 10 | 20 | 30 | 45)}
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

          {/* Kuniga yangi so'zlar maqsadi */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-teal-700" /> Kuniga yangi so'zlar soni
            </label>
            <div className="flex items-center gap-3">
              {[5, 10, 15, 20].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setNewWordsTarget(num)}
                  className={`flex-1 py-2 text-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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

          {/* Talaffuz afzalligi */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-teal-700" /> Talaffuz afzalligi
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccent('us')}
                className={`py-2.5 px-3 text-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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
                className={`py-2.5 px-3 text-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  accent === 'uk'
                    ? 'bg-teal-700 text-white border-teal-800'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                🇬🇧 Britaniya (UK)
              </button>
            </div>
          </div>

          {/* Vaqt mintaqasi */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-700" /> Vaqt mintaqasi (Timezone)
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-[#D5D1C6] rounded-lg text-xs text-gray-800"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Kunlik takrorlash vaqtlari aynan shu soat mintaqasi bo'yicha hisoblanadi.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-teal-800 hover:bg-teal-900 text-white font-medium rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
            >
              Darslarni Boshlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
