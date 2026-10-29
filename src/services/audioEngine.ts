/**
 * English Teacher AI - Audio Engine
 * Modular Audio Services:
 * 1. SpeechSynthesisService
 * 2. AudioAssetRepository
 * 3. PlaybackController
 * 4. AlignmentService
 */

import {
  TTSVoiceId,
  TTSVoiceOption,
  ReadingSpeechStyle,
  AlignmentLevel,
  SentenceAudioTiming,
  DocumentAudioSegment,
  PlaybackState,
} from '../types';
import { SentenceBlock } from './tokenizer';
import { speakTeacherVoice, stopCurrentAudio } from './audio';

// Official Gemini 3.8 Flash Lite TTS Voice Catalog
export const VOICE_CATALOG: TTSVoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore (Ayol)',
    gender: 'female',
    accentDesc: 'Standart Amerika — iliq, tushunarli pedagogik ohang',
    sampleText: 'Welcome to your English reading lesson.',
    isAvailable: true,
  },
  {
    id: 'Puck',
    name: 'Puck (Erkak)',
    gender: 'male',
    accentDesc: 'Standart Amerika — jonli va qiziqarli ohang',
    sampleText: 'Let us practice reading together.',
    isAvailable: true,
  },
  {
    id: 'Zephyr',
    name: 'Zephyr (Ayol)',
    gender: 'female',
    accentDesc: 'Sokin va ravon, britancha ohangga yaqin',
    sampleText: 'Listen carefully to the rhythm of the sentence.',
    isAvailable: true,
  },
  {
    id: 'Fenrir',
    name: 'Fenrir (Erkak)',
    gender: 'male',
    accentDesc: 'To‘q va vazmin erkak ovozi',
    sampleText: 'Clear pronunciation for attentive learners.',
    isAvailable: true,
  },
  {
    id: 'Charon',
    name: 'Charon (Erkak)',
    gender: 'male',
    accentDesc: 'Neytral va professional ohang',
    sampleText: 'Every story brings new vocabulary.',
    isAvailable: true,
  },
];

// Validated Playback Speeds with honesty about extremes (0.2x and 5x)
export const PLAYBACK_SPEEDS = [
  { value: 0.2, label: '0.2× (Juda sekin - sifat pasayishi mumkin)', isExtreme: true },
  { value: 0.5, label: '0.5× (Sekinlashtirilgan)', isExtreme: false },
  { value: 0.75, label: '0.75× (O‘rganish uchun qulay)', isExtreme: false },
  { value: 1.0, label: '1.0× (Oddiy tezlik)', isExtreme: false },
  { value: 1.25, label: '1.25× (Tezlashtirilgan)', isExtreme: false },
  { value: 1.5, label: '1.5× (Tez)', isExtreme: false },
  { value: 2.0, label: '2.0× (Ikki barobar)', isExtreme: false },
  { value: 5.0, label: '5.0× (Ekstremal tez - talaffuz buzilishi mumkin)', isExtreme: true },
];

/* =========================================================================
   1. AudioAssetRepository: Caches audio blobs, object URLs and metadata
   ========================================================================= */
class AudioAssetRepository {
  private cache = new Map<string, DocumentAudioSegment>();
  private inFlight = new Map<string, Promise<DocumentAudioSegment>>();

  public getCacheKey(
    text: string,
    voiceId: TTSVoiceId,
    style: ReadingSpeechStyle,
    version = 1
  ): string {
    const textSnippet = text.trim().slice(0, 80).toLowerCase().replace(/\s+/g, '_');
    return `tts_${voiceId}_${style}_v${version}_${textSnippet}`;
  }

  public get(key: string): DocumentAudioSegment | undefined {
    return this.cache.get(key);
  }

  public set(key: string, segment: DocumentAudioSegment): void {
    this.cache.set(key, segment);
  }

  public getInFlight(key: string): Promise<DocumentAudioSegment> | undefined {
    return this.inFlight.get(key);
  }

  public setInFlight(key: string, promise: Promise<DocumentAudioSegment>): void {
    this.inFlight.set(key, promise);
  }

  public clearInFlight(key: string): void {
    this.inFlight.delete(key);
  }

  public clearAll(): void {
    // Revoke object URLs to avoid memory leaks
    this.cache.forEach((seg) => {
      try {
        URL.revokeObjectURL(seg.audioUrl);
      } catch {
        // ignore
      }
    });
    this.cache.clear();
    this.inFlight.clear();
  }
}

export const assetRepository = new AudioAssetRepository();

/* =========================================================================
   2. SpeechSynthesisService: Requests audio from Server or Browser fallback
   ========================================================================= */
export class SpeechSynthesisService {
  /**
   * Synthesizes audio for a single sentence or text chunk
   */
  public static async synthesizeSentence(
    sentence: SentenceBlock,
    documentId: string,
    voiceId: TTSVoiceId = 'Kore',
    style: ReadingSpeechStyle = 'natural',
    contentVersion = 1
  ): Promise<DocumentAudioSegment> {
    const key = assetRepository.getCacheKey(sentence.text, voiceId, style, contentVersion);
    const cached = assetRepository.get(key);
    if (cached) return cached;

    const inFlight = assetRepository.getInFlight(key);
    if (inFlight) return inFlight;

    const promise = (async () => {
      try {
        // Map speech style into prompt guidance
        const stylePrompt =
          style === 'slow_clear'
            ? 'Very clear, slow, articulate English pronunciation for language learners'
            : style === 'story'
            ? 'Expressive, storytelling English audio with warm natural pauses'
            : 'Natural, clear English reading pronunciation';

        const res = await fetch('/api/tts/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sentence.text,
            voiceId,
            style: stylePrompt,
          }),
        });

        if (!res.ok) {
          throw new Error(`TTS server responded with ${res.status}`);
        }

        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);

        // Calculate duration via temporary Audio element
        const durationSeconds = await new Promise<number>((resolve) => {
          const tempAudio = new Audio(audioUrl);
          tempAudio.onloadedmetadata = () => {
            resolve(tempAudio.duration || 2.5);
          };
          tempAudio.onerror = () => resolve(2.5);
        });

        // Sentence-level alignment (honest: Gemini TTS unary returns sentence duration)
        const timing: SentenceAudioTiming = {
          sentenceId: sentence.id,
          startSeconds: 0,
          endSeconds: durationSeconds,
          text: sentence.text,
        };

        const segment: DocumentAudioSegment = {
          segmentId: `seg_${sentence.id}_${Date.now()}`,
          documentId,
          contentVersion,
          paragraphId: sentence.paragraphId,
          sentenceId: sentence.id,
          audioUrl,
          durationSeconds,
          alignmentLevel: 'sentence', // strictly sentence level
          timings: [timing],
          voiceId,
        };

        assetRepository.set(key, segment);
        return segment;
      } catch (err) {
        console.warn('Server TTS failed, falling back to Web Speech synthesis', err);
        // Fallback segment with mock duration for browser speech
        const fallbackSegment: DocumentAudioSegment = {
          segmentId: `seg_fallback_${sentence.id}`,
          documentId,
          contentVersion,
          paragraphId: sentence.paragraphId,
          sentenceId: sentence.id,
          audioUrl: '', // empty means use browser speech synthesis
          durationSeconds: Math.max(2, sentence.text.split(' ').length * 0.4),
          alignmentLevel: 'sentence',
          timings: [
            {
              sentenceId: sentence.id,
              startSeconds: 0,
              endSeconds: Math.max(2, sentence.text.split(' ').length * 0.4),
              text: sentence.text,
            },
          ],
          voiceId,
        };
        assetRepository.set(key, fallbackSegment);
        return fallbackSegment;
      } finally {
        assetRepository.clearInFlight(key);
      }
    })();

    assetRepository.setInFlight(key, promise);
    return promise;
  }
}

/* =========================================================================
   3. PlaybackController: Universal Audio Controller
   ========================================================================= */
type PlaybackStateListener = (state: PlaybackState) => void;

class GlobalPlaybackController {
  private audio: HTMLAudioElement | null = null;
  private listeners: Set<PlaybackStateListener> = new Set();
  private state: PlaybackState = {
    isPlaying: false,
    activeAudioSource: 'idle',
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    activeSentenceId: null,
    activeSegmentIndex: 0,
    volume: 1.0,
    autoScroll: true,
    voiceId: 'Kore',
    speechStyle: 'natural',
  };

  private sentences: SentenceBlock[] = [];
  private currentSentenceIndex = 0;
  private documentId = '';
  private contentVersion = 1;
  private isSynthesizing = false;
  private listeningIntervalEnd?: number;
  private listeningEndedCallback?: () => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preservesPitch = true;

      this.audio.ontimeupdate = () => {
        if (!this.audio) return;
        const current = this.audio.currentTime;
        this.updateState({ currentTime: current });

        // Interval trimming for mapped listening tracks
        if (
          this.state.activeAudioSource === 'listening' &&
          this.listeningIntervalEnd !== undefined &&
          current >= this.listeningIntervalEnd
        ) {
          this.audio.pause();
          this.updateState({ isPlaying: false, activeAudioSource: 'idle' });
          if (this.listeningEndedCallback) {
            this.listeningEndedCallback();
            this.listeningEndedCallback = undefined;
          }
        }
      };

      this.audio.onended = () => {
        if (this.state.activeAudioSource === 'reader') {
          this.handleSentenceEnded();
        } else if (this.state.activeAudioSource === 'listening') {
          this.updateState({ isPlaying: false, activeAudioSource: 'idle' });
          if (this.listeningEndedCallback) {
            this.listeningEndedCallback();
            this.listeningEndedCallback = undefined;
          }
        } else {
          this.updateState({ isPlaying: false, activeAudioSource: 'idle' });
        }
      };

      this.audio.onerror = (e) => {
        console.error('Audio playback error', e);
        this.updateState({ isPlaying: false, activeAudioSource: 'idle' });
      };
    }
  }

  public subscribe(listener: PlaybackStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<PlaybackState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn(this.state));
  }

  public getState(): PlaybackState {
    return this.state;
  }

  /**
   * Initializes player with document sentences
   */
  public loadDocument(
    docId: string,
    sentences: SentenceBlock[],
    startIndex = 0,
    version = 1
  ) {
    this.stop();
    this.documentId = docId;
    this.sentences = sentences;
    this.contentVersion = version;
    this.currentSentenceIndex = Math.max(0, Math.min(startIndex, sentences.length - 1));

    const initialSent = sentences[this.currentSentenceIndex];
    this.updateState({
      activeSentenceId: initialSent?.id || null,
      activeSegmentIndex: this.currentSentenceIndex,
      currentTime: 0,
      duration: 0,
    });
  }

  /**
   * Plays current or specific sentence
   */
  public async play(index?: number) {
    if (index !== undefined && index >= 0 && index < this.sentences.length) {
      this.currentSentenceIndex = index;
    }

    const currentSent = this.sentences[this.currentSentenceIndex];
    if (!currentSent) return;

    this.updateState({
      activeSentenceId: currentSent.id,
      activeSegmentIndex: this.currentSentenceIndex,
      isPlaying: true,
    });

    try {
      this.isSynthesizing = true;
      const segment = await SpeechSynthesisService.synthesizeSentence(
        currentSent,
        this.documentId,
        this.state.voiceId,
        this.state.speechStyle,
        this.contentVersion
      );
      this.isSynthesizing = false;

      if (!this.state.isPlaying) return; // cancelled while fetching

      if (segment.audioUrl && this.audio) {
        // Cancel any browser speech
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }

        if (this.audio.src !== segment.audioUrl) {
          this.audio.src = segment.audioUrl;
        }
        this.audio.playbackRate = this.state.playbackRate;
        this.audio.preservesPitch = true;
        this.audio.volume = this.state.volume;

        await this.audio.play();
        this.updateState({
          duration: segment.durationSeconds,
          isPlaying: true,
        });
      } else {
        // Fallback to browser Web Speech API
        this.playBrowserSpeechFallback(currentSent.text);
      }
    } catch (err) {
      console.error('Play error', err);
      this.updateState({ isPlaying: false });
    }
  }

  private playBrowserSpeechFallback(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.updateState({ isPlaying: false });
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = this.state.playbackRate;

    utterance.onend = () => {
      this.handleSentenceEnded();
    };

    utterance.onerror = () => {
      this.updateState({ isPlaying: false });
    };

    window.speechSynthesis.speak(utterance);
    this.updateState({ isPlaying: true, duration: text.split(' ').length * 0.4 });
  }

  private handleSentenceEnded() {
    if (this.currentSentenceIndex + 1 < this.sentences.length) {
      this.currentSentenceIndex++;
      this.play(this.currentSentenceIndex);
    } else {
      this.updateState({ isPlaying: false, currentTime: 0 });
    }
  }

  public pause() {
    if (this.audio) {
      this.audio.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.updateState({ isPlaying: false });
  }

  public resume() {
    if (this.audio && this.audio.src && this.audio.src !== window.location.href) {
      this.audio.play().catch(() => {});
      this.updateState({ isPlaying: true });
    } else {
      this.play(this.currentSentenceIndex);
    }
  }

  public stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.updateState({ isPlaying: false, currentTime: 0 });
  }

  public nextSentence() {
    if (this.currentSentenceIndex + 1 < this.sentences.length) {
      this.play(this.currentSentenceIndex + 1);
    }
  }

  public prevSentence() {
    if (this.currentSentenceIndex > 0) {
      this.play(this.currentSentenceIndex - 1);
    }
  }

  public restartSentence() {
    this.play(this.currentSentenceIndex);
  }

  public setSpeed(rate: number) {
    this.updateState({ playbackRate: rate });
    if (this.audio) {
      this.audio.playbackRate = rate;
      this.audio.preservesPitch = true;
    }
  }

  public setVolume(vol: number) {
    const safeVol = Math.max(0, Math.min(1, vol));
    this.updateState({ volume: safeVol });
    if (this.audio) {
      this.audio.volume = safeVol;
    }
  }

  public setVoice(voiceId: TTSVoiceId) {
    if (this.state.voiceId !== voiceId) {
      this.updateState({ voiceId });
      // Invalidate current audio element so new voice plays next
      if (this.audio) this.audio.src = '';
      if (this.state.isPlaying) {
        this.play(this.currentSentenceIndex);
      }
    }
  }

  public setSpeechStyle(style: ReadingSpeechStyle) {
    if (this.state.speechStyle !== style) {
      this.updateState({ speechStyle: style });
      if (this.audio) this.audio.src = '';
      if (this.state.isPlaying) {
        this.play(this.currentSentenceIndex);
      }
    }
  }

  public toggleAutoScroll() {
    this.updateState({ autoScroll: !this.state.autoScroll });
  }

  /**
   * Plays a mapped listening audio track with optional custom start/end interval.
   * Immediately silences and interrupts any ongoing Teacher voice or Reader audio!
   */
  public async playListeningTrack(options: {
    audioUrl?: string;
    fallbackText?: string;
    startSeconds?: number;
    endSeconds?: number;
    onEnded?: () => void;
  }): Promise<boolean> {
    const { audioUrl, fallbackText, startSeconds, endSeconds, onEnded } = options;

    // 1. Mutual Exclusion: Stop any Teacher voice or Web Speech immediately!
    this.stopTeacherVoice();
    this.stop();

    this.listeningIntervalEnd = endSeconds;
    this.listeningEndedCallback = onEnded;

    if (audioUrl && this.audio) {
      try {
        if (this.audio.src !== audioUrl) {
          this.audio.src = audioUrl;
        }
        this.audio.playbackRate = this.state.playbackRate;
        this.audio.preservesPitch = true;
        this.audio.volume = this.state.volume;

        if (startSeconds !== undefined && startSeconds > 0) {
          this.audio.currentTime = startSeconds;
        }

        this.updateState({
          isPlaying: true,
          activeAudioSource: 'listening',
        });

        await this.audio.play();
        return true;
      } catch (err) {
        console.warn('Audio play failed, falling back to speech synthesis', err);
        this.updateState({ isPlaying: false, activeAudioSource: 'idle' });
        if (fallbackText) {
          this.playTeacherVoice(fallbackText, onEnded);
        }
        return false;
      }
    } else if (fallbackText) {
      this.playTeacherVoice(fallbackText, onEnded);
      return true;
    }
    return false;
  }

  /**
   * Stops any teacher voice playback
   */
  public stopTeacherVoice() {
    stopCurrentAudio(); // Uses audio.ts stopCurrentAudio
    if (this.state.activeAudioSource === 'teacher') {
      this.updateState({ isPlaying: false, activeAudioSource: 'idle' });
    }
  }

  /**
   * Plays Teacher explanation voice (server TTS or Web Speech fallback).
   * Automatically stops if listening audio starts.
   */
  public async playTeacherVoice(text: string, onEnd?: () => void) {
    if (!text) return;
    this.stopTeacherVoice();

    this.updateState({
      isPlaying: true,
      activeAudioSource: 'teacher',
    });

    const success = await speakTeacherVoice(text, {
      voiceId: this.state.voiceId,
      speechRate: this.state.playbackRate,
      onEnd: () => {
        this.updateState({ isPlaying: false, activeAudioSource: 'idle' });
        if (onEnd) onEnd();
      },
      onError: () => {
        this.updateState({ isPlaying: false, activeAudioSource: 'idle' });
      },
    });

    if (!success) {
      this.updateState({ isPlaying: false, activeAudioSource: 'idle' });
    }
  }
}

export const playbackController = new GlobalPlaybackController();
