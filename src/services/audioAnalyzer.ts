/**
 * Web Audio API Audio Analyzer with safe fallback
 * Analyzes audio element amplitude for avatar mouth lip-sync animations.
 */

export interface AudioAnalyzerHandle {
  getAmplitude: () => number;
  cleanup: () => void;
  isFallback: boolean;
}

let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    try {
      sharedAudioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }

  return sharedAudioCtx;
}

export function createAudioAnalyzer(
  mediaElement: HTMLAudioElement | HTMLVideoElement | null,
  isPlaying: boolean
): AudioAnalyzerHandle {
  let fallbackTimer: any = null;
  let fallbackAmplitude = 0;
  let analyserNode: AnalyserNode | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let isFallback = false;

  const ctx = getSharedAudioContext();

  if (mediaElement && ctx && isPlaying) {
    try {
      // Create media element source if not already connected
      sourceNode = ctx.createMediaElementSource(mediaElement);
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.6;

      sourceNode.connect(analyserNode);
      analyserNode.connect(ctx.destination);
    } catch (e) {
      // Cross-origin restriction or already connected source -> use smooth fallback
      isFallback = true;
    }
  } else {
    isFallback = true;
  }

  const dataArray = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;

  return {
    isFallback,
    getAmplitude: () => {
      if (!isPlaying) return 0;

      if (analyserNode && dataArray) {
        try {
          analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Normalize 0-255 to 0.0-1.0
          return Math.min(1.0, Math.max(0, avg / 128));
        } catch {
          // Fallback if audio node fails
        }
      }

      // Smooth programmatic fallback during speech
      const time = Date.now() / 150;
      // Syllables rhythmic pattern
      const raw = (Math.sin(time) * 0.5 + 0.5) * (Math.cos(time * 0.7) * 0.5 + 0.5);
      return Math.min(1.0, Math.max(0.15, raw * 0.85));
    },
    cleanup: () => {
      if (sourceNode && analyserNode) {
        try {
          sourceNode.disconnect();
          analyserNode.disconnect();
        } catch {
          // Ignore cleanup errors
        }
      }
      if (fallbackTimer) clearInterval(fallbackTimer);
    },
  };
}
