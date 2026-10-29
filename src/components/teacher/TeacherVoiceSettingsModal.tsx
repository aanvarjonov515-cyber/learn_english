/**
 * Teacher Voice Settings Modal & Panel (Part 4)
 * Allows selecting voice gender, voice ID, speech rate, auto-speak, and listening to sample pronunciation.
 */

import React, { useState } from 'react';
import { UserSettings } from '../../types';
import { playVoiceSample, stopCurrentAudio } from '../../services/audio';
import { Volume2, Play, Check, X, Sparkles, Mic, Loader2 } from 'lucide-react';

interface TeacherVoiceSettingsModalProps {
  settings: UserSettings;
  onUpdate: (newSettings: UserSettings) => void;
  onClose: () => void;
}

interface VoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male';
  descriptionUz: string;
}

const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Kore (Ayol - Muloyim va Tiniq)', gender: 'female', descriptionUz: 'Ingliz va o‘zbek tillari uchun eng tabiiy ayol ovozi.' },
  { id: 'Zephyr', name: 'Zephyr (Ayol - Ravshan va Do‘stona)', gender: 'female', descriptionUz: 'Qulay dars tushuntirishlari uchun mos yorqin ovoz.' },
  { id: 'Fenrir', name: 'Fenrir (Erkak - Chuqur va Professional)', gender: 'male', descriptionUz: 'Grammatika va qoidalar uchun vazmin erkak ovozi.' },
  { id: 'Puck', name: 'Puck (Erkak - Faol va Shijoatli)', gender: 'male', descriptionUz: 'Tezkor mashqlar uchun dinamik ovoz.' },
  { id: 'Charon', name: 'Charon (Erkak - Xotirjam va Vazin)', gender: 'male', descriptionUz: 'Listening va hikoyalar o‘qishga mos sokin ovoz.' },
];

export const TeacherVoiceSettingsModal: React.FC<TeacherVoiceSettingsModalProps> = ({
  settings,
  onUpdate,
  onClose,
}) => {
  const [selectedGender, setSelectedGender] = useState<'female' | 'male'>(
    settings.teacherVoiceGender || 'female'
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(
    settings.teacherVoiceId || 'Kore'
  );
  const [speechRate, setSpeechRate] = useState<number>(
    settings.teacherSpeechRate || 1.0
  );
  const [autoSpeak, setAutoSpeak] = useState<boolean>(
    settings.teacherAutoSpeak ?? true
  );

  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [sampleVoiceId, setSampleVoiceId] = useState<string | null>(null);

  const filteredVoices = AVAILABLE_VOICES.filter((v) => v.gender === selectedGender);

  const handleTestSample = async (voiceId: string) => {
    stopCurrentAudio();
    setSampleVoiceId(voiceId);
    setIsPlayingSample(true);

    const sampleText = "Assalomu alaykum! Bugun ingliz tilini birga mashq qilamiz. Tushunmagan joyingizni bemalol so'rang. She goes to school every day.";

    await playVoiceSample(voiceId, sampleText, {
      speechRate,
      onEnd: () => {
        setIsPlayingSample(false);
        setSampleVoiceId(null);
      },
      onError: () => {
        setIsPlayingSample(false);
        setSampleVoiceId(null);
      },
    });
  };

  const handleSave = () => {
    const updated: UserSettings = {
      ...settings,
      teacherVoiceProvider: 'gemini_tts',
      teacherVoiceGender: selectedGender,
      teacherVoiceId: selectedVoiceId,
      teacherSpeechRate: speechRate,
      teacherAutoSpeak: autoSpeak,
    };

    // Save in storage
    const storageKey = 'eta_user_settings'; // or standard
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    onUpdate(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border w-full max-w-lg rounded-3xl p-6 shadow-xl space-y-6 text-textPrimary animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-textPrimary">
                Ustoz Ovozi va Nutq Sozlamalari
              </h3>
              <p className="text-xs text-textSecondary">
                AI Teacher va dars tushuntirishlari uchun tabiiy ovoz va tezlikni tanlang.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-textSecondary hover:text-textPrimary rounded-lg hover:bg-surface-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 text-xs">
          {/* Gender Selector */}
          <div className="space-y-2">
            <label className="font-semibold text-textPrimary block">Ovoz Turi (Jinsi):</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedGender('female');
                  const firstFemale = AVAILABLE_VOICES.find((v) => v.gender === 'female');
                  if (firstFemale) setSelectedVoiceId(firstFemale.id);
                }}
                className={`py-2.5 px-4 rounded-xl border font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedGender === 'female'
                    ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                    : 'bg-background border-border text-textSecondary hover:bg-surface-muted'
                }`}
              >
                <span>👩 Ayol Ovozi</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedGender('male');
                  const firstMale = AVAILABLE_VOICES.find((v) => v.gender === 'male');
                  if (firstMale) setSelectedVoiceId(firstMale.id);
                }}
                className={`py-2.5 px-4 rounded-xl border font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedGender === 'male'
                    ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                    : 'bg-background border-border text-textSecondary hover:bg-surface-muted'
                }`}
              >
                <span>👨 Erkak Ovozi</span>
              </button>
            </div>
          </div>

          {/* Specific Voice List */}
          <div className="space-y-2">
            <label className="font-semibold text-textPrimary block">Mavjud Ovoz Variantlari:</label>
            <div className="space-y-2.5">
              {filteredVoices.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVoiceId(v.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedVoiceId === v.id
                      ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-600 shadow-xs'
                      : 'bg-background border-border hover:border-teal-400'
                  }`}
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-textPrimary text-sm">{v.name}</span>
                      {selectedVoiceId === v.id && (
                        <span className="px-2 py-0.5 bg-teal-800 text-white rounded-full text-[10px] font-bold">
                          Tanlangan
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-textSecondary">{v.descriptionUz}</p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestSample(v.id);
                    }}
                    className="px-3 py-1.5 bg-surface border border-border hover:bg-surface-muted rounded-xl text-xs font-semibold text-teal-800 dark:text-teal-300 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {isPlayingSample && sampleVoiceId === v.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Tinglanmoqda...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" /> Namuna
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Speech Rate */}
          <div className="space-y-2">
            <label className="font-semibold text-textPrimary block">O‘qish Tezligi:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sekin (0.85x)', value: 0.85 },
                { label: 'Oddiy (1.0x)', value: 1.0 },
                { label: 'Tezroq (1.15x)', value: 1.15 },
              ].map((rate) => (
                <button
                  key={rate.value}
                  type="button"
                  onClick={() => setSpeechRate(rate.value)}
                  className={`py-2 px-3 rounded-xl border font-medium text-center transition-colors cursor-pointer ${
                    speechRate === rate.value
                      ? 'bg-teal-800 text-white border-teal-800'
                      : 'bg-background border-border text-textSecondary hover:bg-surface-muted'
                  }`}
                >
                  {rate.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-Speak Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <span className="font-semibold text-textPrimary block">Avtomatik Ovozli O‘qish</span>
              <span className="text-[11px] text-textSecondary">AI Teacher javob yozganda ovoz bilan birga o‘qish.</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`w-12 h-6 rounded-full transition-colors relative p-1 cursor-pointer ${
                autoSpeak ? 'bg-teal-800' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  autoSpeak ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-border text-textSecondary text-xs font-semibold cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Saqlash
          </button>
        </div>
      </div>
    </div>
  );
};
