import React, { useState, useEffect } from 'react';
import {
  playbackController,
  VOICE_CATALOG,
  PLAYBACK_SPEEDS,
} from '../../services/audioEngine';
import { PlaybackState, TTSVoiceId, ReadingSpeechStyle } from '../../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Gauge,
  Sliders,
  Sparkles,
  ArrowDown,
  Info,
} from 'lucide-react';

interface ReaderAudioBarProps {
  totalSentences: number;
  currentSentenceNumber: number;
  onScrollToActiveSentence: () => void;
}

export const ReaderAudioBar: React.FC<ReaderAudioBarProps> = ({
  totalSentences,
  currentSentenceNumber,
  onScrollToActiveSentence,
}) => {
  const [state, setState] = useState<PlaybackState>(playbackController.getState());
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    return playbackController.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  const handleTogglePlay = () => {
    if (state.isPlaying) {
      playbackController.pause();
    } else {
      playbackController.resume();
    }
  };

  const handleSelectSpeed = (speed: number) => {
    playbackController.setSpeed(speed);
    setShowSpeedMenu(false);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-[#E5E2D9] rounded-2xl p-4 shadow-sm space-y-3">
      {/* Primary Audio Player Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Transport controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Restart sentence */}
          <button
            onClick={() => playbackController.restartSentence()}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors"
            title="Ushbu gapni qaytadan tinglash"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Prev Sentence */}
          <button
            onClick={() => playbackController.prevSentence()}
            disabled={currentSentenceNumber <= 1}
            className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 disabled:opacity-30 cursor-pointer transition-colors"
            title="Oldingi gap"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Main Play / Pause */}
          <button
            onClick={handleTogglePlay}
            className="p-3 rounded-full bg-teal-800 hover:bg-teal-900 text-white shadow-xs cursor-pointer transition-transform active:scale-95"
            title={state.isPlaying ? 'Pauza' : 'Ovozli o‘qishni boshlash'}
          >
            {state.isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Next Sentence */}
          <button
            onClick={() => playbackController.nextSentence()}
            disabled={currentSentenceNumber >= totalSentences}
            className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 disabled:opacity-30 cursor-pointer transition-colors"
            title="Keyingi gap"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Sentence Progress & Time */}
          <div className="hidden sm:flex flex-col ml-2">
            <span className="text-xs font-semibold text-gray-800">
              Gap: {currentSentenceNumber} / {totalSentences}
            </span>
            <span className="text-[11px] text-gray-500 font-mono">
              {formatSeconds(state.currentTime)} / {formatSeconds(state.duration)}
            </span>
          </div>
        </div>

        {/* Center: Scroll to Active Sentence Button */}
        <button
          onClick={onScrollToActiveSentence}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-medium cursor-pointer transition-colors"
          title="Ovoz o‘qiyotgan joriy gapga o‘tish"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Ovoz o‘qiyotgan joyga o‘tish</span>
          <span className="md:hidden">Joyga o‘tish</span>
        </button>

        {/* Right: Speed, Voice settings, and Auto-scroll */}
        <div className="flex items-center gap-2">
          {/* Speed Selector Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSpeedMenu(!showSpeedMenu);
                setShowVoiceSettings(false);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Gauge className="w-3.5 h-3.5 text-teal-700" />
              <span>{state.playbackRate}×</span>
            </button>

            {/* Speed Dropdown Menu */}
            {showSpeedMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-64 bg-white border border-[#E5E2D9] rounded-2xl p-2 shadow-xl z-30 space-y-1">
                <div className="px-2 py-1 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase">
                  Ijro Tezligi
                </div>
                {PLAYBACK_SPEEDS.map((sp) => (
                  <button
                    key={sp.value}
                    onClick={() => handleSelectSpeed(sp.value)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                      state.playbackRate === sp.value
                        ? 'bg-teal-50 text-teal-900 font-bold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{sp.label}</span>
                    {sp.isExtreme && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded">
                        Ehtiyotkorlik
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Voice & Style Settings Trigger */}
          <button
            onClick={() => {
              setShowVoiceSettings(!showVoiceSettings);
              setShowSpeedMenu(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
              showVoiceSettings
                ? 'bg-teal-800 text-white border-teal-900'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ovoz: {state.voiceId}</span>
          </button>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => playbackController.toggleAutoScroll()}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
              state.autoScroll
                ? 'bg-teal-50 text-teal-800 border-teal-200'
                : 'bg-white text-gray-400 border-gray-200'
            }`}
            title={state.autoScroll ? "Avtomatik kuzatish yoqilgan" : "Avtomatik kuzatish o‘chirilgan"}
          >
            Auto-scroll
          </button>
        </div>
      </div>

      {/* Voice & Speech Style Dropdown Panel */}
      {showVoiceSettings && (
        <div className="pt-3 border-t border-[#E5E2D9] space-y-4 animate-in fade-in duration-150">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Ovoz tanlash (Gemini 3.8 TTS rasmiy ovozlari)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {VOICE_CATALOG.map((v) => (
                <div
                  key={v.id}
                  onClick={() => playbackController.setVoice(v.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    state.voiceId === v.id
                      ? 'border-teal-700 bg-teal-50/70 shadow-2xs ring-1 ring-teal-700'
                      : 'border-gray-200 bg-[#FAF9F5] hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900">{v.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono uppercase">
                      {v.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1">{v.accentDesc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              O‘qish uslubi
            </label>
            <div className="flex items-center gap-2">
              {[
                { id: 'natural', label: 'Oddiy (Natural)' },
                { id: 'slow_clear', label: 'Sekin va aniq (O‘rganuvchi uchun)' },
                { id: 'story', label: 'Hikoyaviy (Storytelling)' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => playbackController.setSpeechStyle(st.id as ReadingSpeechStyle)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    state.speechStyle === st.id
                      ? 'bg-teal-800 text-white border-teal-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-teal-50/50 border border-teal-100 text-[11px] text-teal-900 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-teal-700 mt-0.5" />
            <span>
              Sinxronlash darajasi: <strong>Gap darajasida (sentence-level)</strong>. Ovoz yangraganda faol gap yorug‘ rangda ajratiladi va matn bo‘ylab avtomatik kuzatib boriladi.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
