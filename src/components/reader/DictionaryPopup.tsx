import React, { useState, useEffect } from 'react';
import { DictionaryLookupResult } from '../../types';
import { speakEnglishText } from '../../services/audio';
import { getLookupCacheKey } from '../../services/tokenizer';
import { isDemoModeActive } from '../../services/storage';
import {
  Volume2,
  BookmarkPlus,
  Check,
  Sparkles,
  Loader2,
  AlertTriangle,
  X,
  HelpCircle,
} from 'lucide-react';

interface DictionaryPopupProps {
  word: string;
  contextSentence: string;
  contextBefore?: string;
  contextAfter?: string;
  phrase?: string;
  position?: { x: number; y: number } | null;
  isKnown: boolean;
  onToggleKnown: (word: string) => void;
  onAddToVocabulary: (result: DictionaryLookupResult) => void;
  onClose: () => void;
}

// In-memory cache to avoid duplicate API calls during the same session
const lookupCache = new Map<string, DictionaryLookupResult>();

export const DictionaryPopup: React.FC<DictionaryPopupProps> = ({
  word,
  contextSentence,
  contextBefore,
  contextAfter,
  phrase,
  position,
  isKnown,
  onToggleKnown,
  onAddToVocabulary,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DictionaryLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const cacheKey = getLookupCacheKey(phrase || word, contextSentence);

  useEffect(() => {
    let isCancelled = false;

    // Check cache first
    if (lookupCache.has(cacheKey)) {
      setData(lookupCache.get(cacheKey)!);
      return;
    }

    async function fetchLookup() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/dictionary/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: word.trim(),
            sentence: contextSentence.trim(),
            contextBefore,
            contextAfter,
            phrase,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Lug'at ma'lumotini olishda xatolik yuz berdi.");
        }

        const json = await res.json();
        if (json.data && !isCancelled) {
          setData(json.data);
          lookupCache.set(cacheKey, json.data);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Dictionary lookup error:', err);
          // Fallback minimal result so the user is never stuck
          const fallback: DictionaryLookupResult = {
            word: phrase || word,
            lemma: (phrase || word).toLowerCase(),
            partOfSpeech: 'word',
            contextualTranslationUz: "Tarjima kutilmoqda (AI xatosi)",
            shortDefinitionEn: 'Definition unavailable offline',
            contextSentence,
            exampleEn: contextSentence,
            exampleUz: "Gap kontekstida o'rganilmoqda.",
            source: 'dictionary',
          };
          setData(fallback);
          setError(err.message || 'Tarjima yuklanmadi.');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchLookup();

    return () => {
      isCancelled = true;
    };
  }, [cacheKey, word, phrase, contextSentence]);

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    speakEnglishText(phrase || word, {
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 md:hidden backdrop-blur-2xs"
        onClick={onClose}
      />

      {/* Popover container */}
      <div
        className="fixed md:absolute z-50 bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto md:w-96 bg-[#FAF9F5] border border-[#D5D1C6] rounded-t-2xl md:rounded-2xl p-5 shadow-2xl text-gray-900 animate-in slide-in-from-bottom md:zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto"
        style={
          position && typeof window !== 'undefined' && window.innerWidth >= 768
            ? {
                top: Math.min(window.innerHeight - 380, Math.max(70, position.y + 25)),
                left: Math.min(window.innerWidth - 410, Math.max(20, position.x - 180)),
              }
            : {}
        }
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#E5E2D9]">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-xl text-gray-900 truncate">
                {data?.word || phrase || word}
              </h3>
              <button
                type="button"
                onClick={handlePlayAudio}
                className="p-1 rounded-full text-teal-800 hover:bg-teal-50 cursor-pointer"
                title="Talaffuzni tinglash"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            {data?.partOfSpeech && (
              <span className="text-[11px] font-mono text-gray-500 italic">
                {data.partOfSpeech} {data.lemma && data.lemma !== data.word ? `(asos: ${data.lemma})` : ''}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-8 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-teal-800 mx-auto" />
            <p className="text-xs text-gray-500">Kontekstual ma'no aniqlanmoqda...</p>
          </div>
        )}

        {/* Content */}
        {!loading && data && (
          <div className="py-3 space-y-3.5 text-xs">
            {/* Contextual Translation Highlight */}
            <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-100 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-teal-800 font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Shu gapdagi ma'nosi
                </span>
                {data.isPhrase && (
                  <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[10px]">
                    Ibora
                  </span>
                )}
              </div>
              <p className="font-bold text-base text-teal-950 font-serif">
                {data.contextualTranslationUz}
              </p>
              {data.shortDefinitionEn && (
                <p className="text-[11px] text-teal-800/80">{data.shortDefinitionEn}</p>
              )}
            </div>

            {/* Context Sentence */}
            <div className="p-2.5 rounded-lg bg-white border border-[#E5E2D9] space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400">
                Matndagi jumla:
              </span>
              <p className="text-xs text-gray-800 italic">
                "{contextSentence}"
              </p>
            </div>

            {/* AI Example */}
            {data.exampleEn && (
              <div className="space-y-1 text-gray-600">
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  Sodda misol:
                </span>
                <p className="text-gray-900 font-medium">"{data.exampleEn}"</p>
                {data.exampleUz && <p className="text-gray-500">"{data.exampleUz}"</p>}
              </div>
            )}

            {/* Error notice if fallback used */}
            {error && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
              </p>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAddToVocabulary(data)}
                className="flex-1 py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>Yodlashga qo'shish</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleKnown(word)}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  isKnown
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white text-gray-700 border-[#D5D1C6] hover:bg-gray-50'
                }`}
                title={isKnown ? "Bilaman deb belgilangan" : "Bu so'zni bilaman deb belgilash"}
              >
                <Check className={`w-3.5 h-3.5 ${isKnown ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span>{isKnown ? 'Bilaman' : 'Bilaman'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
