/**
 * Audio Service for English Teacher AI
 * Coordinates server-side TTS, browser speech, and background music channels with volume ducking.
 */

import { getUserSettings } from './storage';
import { normalizeTextForSpeech } from './speechNormalizer';

export interface AudioPlayOptions {
  accent?: 'us' | 'uk';
  voiceId?: string;
  speechRate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

let currentAudioElement: HTMLAudioElement | null = null;
let musicAudioElement: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
const audioCache = new Map<string, string>(); // cacheKey -> ObjectURL
let ttsQuotaExceeded = false; // Flag to track API quota status

// Ducking state
let musicVolumeBeforeDucking = 1.0;
let isDucking = false;

export function stopCurrentAudio() {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch {}
    currentAudioElement = null;
  }
  
  // Also stop ducking if foreground stops
  if (isDucking && musicAudioElement) {
      musicAudioElement.volume = musicVolumeBeforeDucking;
      isDucking = false;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    currentUtterance = null;
  }
}

// Background Music Control
export function playBackgroundMusic(url: string, volume: number = 0.3, loop: boolean = true) {
    if (!musicAudioElement) {
        musicAudioElement = new Audio(url);
    } else {
        musicAudioElement.src = url;
    }
    musicAudioElement.volume = volume;
    musicVolumeBeforeDucking = volume;
    musicAudioElement.loop = loop;
    musicAudioElement.play().catch(console.error);
}

export function pauseBackgroundMusic() {
    musicAudioElement?.pause();
}

export function setMusicVolume(volume: number) {
    if (musicAudioElement) {
        musicAudioElement.volume = volume;
        musicVolumeBeforeDucking = volume;
    }
}

export async function speakTeacherVoice(
  text: string,
  options: AudioPlayOptions = {}
): Promise<boolean> {
  stopCurrentAudio();
  
  // Apply ducking
  if (musicAudioElement && !musicAudioElement.paused) {
      musicVolumeBeforeDucking = musicAudioElement.volume;
      musicAudioElement.volume = Math.max(0, musicVolumeBeforeDucking * 0.2);
      isDucking = true;
  }

  const trimmed = text.trim();
  if (!trimmed) return false;

  if (ttsQuotaExceeded) {
    return fallbackBrowserSpeech(trimmed, options);
  }

  const settings = getUserSettings();
  const voiceId = options.voiceId || settings.teacherVoiceId || 'Kore';
  const speechRate = options.speechRate || settings.teacherSpeechRate || 1.0;
  const normalized = normalizeTextForSpeech(trimmed);

  const cacheKey = `${voiceId}_${speechRate}_${normalized}`;
  if (audioCache.has(cacheKey)) {
    const cachedUrl = audioCache.get(cacheKey)!;
    return playAudioUrl(cachedUrl, speechRate, options);
  }

  try {
    const res = await fetch('/api/tts/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: normalized,
        voiceId,
        style: 'Clear, articulate, natural Uzbek and English teacher pronunciation with friendly warm tone',
      }),
    });

    if (res.status === 429) {
      ttsQuotaExceeded = true;
      return fallbackBrowserSpeech(trimmed, options);
    }

    if (res.ok) {
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      audioCache.set(cacheKey, audioUrl);
      return playAudioUrl(audioUrl, speechRate, options);
    }
  } catch (e) {
    console.error("TTS fetch failed", e);
  }

  return fallbackBrowserSpeech(trimmed, options);
}

function playAudioUrl(
  audioUrl: string,
  speechRate: number,
  options: AudioPlayOptions = {}
): Promise<boolean> {
  const audio = new Audio(audioUrl);
  audio.playbackRate = speechRate;
  currentAudioElement = audio;

  return new Promise<boolean>((resolve) => {
    audio.onplay = () => {
      options.onStart?.();
    };

    audio.onended = () => {
      // Restore music volume
      if (isDucking && musicAudioElement) {
          musicAudioElement.volume = musicVolumeBeforeDucking;
          isDucking = false;
      }
      currentAudioElement = null;
      options.onEnd?.();
      resolve(true);
    };

    audio.onerror = (e) => {
      console.error("Audio playback error", e);
      // Restore music volume
      if (isDucking && musicAudioElement) {
          musicAudioElement.volume = musicVolumeBeforeDucking;
          isDucking = false;
      }
      currentAudioElement = null;
      fallbackBrowserSpeech(audioUrl, options).then(resolve);
    };

    audio.play().catch((e) => {
      console.error("Audio play rejection", e);
      fallbackBrowserSpeech(audioUrl, options).then(resolve);
    });
  });
}
// ... (keep the rest of the functions fallbackBrowserSpeech etc)

export async function playVoiceSample(
  voiceId: string,
  sampleText: string,
  options: AudioPlayOptions = {}
): Promise<boolean> {
  return speakTeacherVoice(sampleText, { ...options, voiceId });
}

export async function speakEnglishText(
  text: string,
  options: AudioPlayOptions = {}
): Promise<boolean> {
  return speakTeacherVoice(text, options);
}

function fallbackBrowserSpeech(
  text: string,
  options: AudioPlayOptions = {}
): Promise<boolean> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    const err = new Error("Brauzeringizda ovozli eshittirish (TTS) qo'llab-quvvatlanmaydi.");
    options.onError?.(err);
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      currentUtterance = utterance;
      utterance.lang = 'uz-UZ';
      utterance.rate = options.speechRate || 1.0;

      utterance.onstart = () => {
        options.onStart?.();
      };

      utterance.onend = () => {
        currentUtterance = null;
        options.onEnd?.();
        resolve(true);
      };

      utterance.onerror = (e) => {
        currentUtterance = null;
        options.onError?.(new Error(`Ovoz xatosi: ${e.error}`));
        resolve(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e: any) {
      options.onError?.(e);
      resolve(false);
    }
  });
}
