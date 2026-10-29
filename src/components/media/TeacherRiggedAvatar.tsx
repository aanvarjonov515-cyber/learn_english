import React, { useEffect, useState, useRef } from 'react';
import { AvatarAnimationState } from '../../types';
import { createAudioAnalyzer } from '../../services/audioAnalyzer';

interface TeacherRiggedAvatarProps {
  state?: AvatarAnimationState;
  isPlaying?: boolean;
  audioElement?: HTMLAudioElement | HTMLVideoElement | null;
  reduceMotion?: boolean;
  className?: string;
  subtitles?: string;
}

export const TeacherRiggedAvatar: React.FC<TeacherRiggedAvatarProps> = ({
  state = 'idle',
  isPlaying = false,
  audioElement = null,
  reduceMotion = false,
  className = '',
  subtitles = '',
}) => {
  const [blink, setBlink] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [isFallbackAudio, setIsFallbackAudio] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  // Blinking effect
  useEffect(() => {
    if (reduceMotion) return;

    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3800 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [reduceMotion]);

  // Audio amplitude tracking for mouth movement
  useEffect(() => {
    if (reduceMotion || !isPlaying) {
      setAmplitude(0);
      return;
    }

    const analyzer = createAudioAnalyzer(audioElement, isPlaying);
    setIsFallbackAudio(analyzer.isFallback);

    const updateFrame = () => {
      const amp = analyzer.getAmplitude();
      setAmplitude(amp);
      animationFrameRef.current = requestAnimationFrame(updateFrame);
    };

    animationFrameRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      analyzer.cleanup();
    };
  }, [audioElement, isPlaying, reduceMotion]);

  // Head transform & pose angles based on state
  let headRotation = 0;
  let headY = 0;
  let armLeftAngle = 0;
  let armRightAngle = 0;
  let eyeType: 'normal' | 'thinking' | 'encouraging' | 'listening' | 'error' = 'normal';
  let statusBadge = '';

  switch (state) {
    case 'listening':
      headRotation = 4;
      headY = 1;
      armLeftAngle = -5;
      armRightAngle = 10;
      eyeType = 'listening';
      statusBadge = 'Tinglamoqda...';
      break;

    case 'thinking':
      headRotation = -6;
      headY = -2;
      armLeftAngle = -25; // Hand near chin
      armRightAngle = 0;
      eyeType = 'thinking';
      statusBadge = 'O‘ylamoqda...';
      break;

    case 'speaking':
    case 'explaining':
      headRotation = Math.sin(Date.now() / 400) * 2;
      headY = Math.cos(Date.now() / 400) * 2;
      armLeftAngle = -15 + Math.sin(Date.now() / 300) * 8;
      armRightAngle = 15 - Math.sin(Date.now() / 300) * 8;
      eyeType = 'normal';
      statusBadge = 'Gapirmoqda...';
      break;

    case 'encouraging':
      headRotation = 2;
      headY = 2;
      armLeftAngle = -35; // Thumbs up gesture
      armRightAngle = 20;
      eyeType = 'encouraging';
      statusBadge = 'Barakalla!';
      break;

    case 'paused':
      headRotation = 0;
      headY = 0;
      armLeftAngle = 0;
      armRightAngle = 0;
      eyeType = 'normal';
      statusBadge = 'Pauzada';
      break;

    case 'error':
      headRotation = -8;
      headY = 2;
      armLeftAngle = -10;
      armRightAngle = -10;
      eyeType = 'error';
      statusBadge = 'Diqqat!';
      break;

    case 'idle':
    default:
      headRotation = reduceMotion ? 0 : Math.sin(Date.now() / 1000) * 1.5;
      headY = reduceMotion ? 0 : Math.cos(Date.now() / 1000) * 1;
      armLeftAngle = 0;
      armRightAngle = 0;
      eyeType = 'normal';
      statusBadge = 'Tayyor';
      break;
  }

  // Calculate mouth height and curve based on amplitude / speaking
  const mouthOpenAmount = isPlaying ? Math.max(3, amplitude * 22) : 2;

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Active Status Badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-700/60 text-xs font-medium text-slate-200">
        <span
          className={`w-2 h-2 rounded-full ${
            isPlaying || state === 'speaking' || state === 'explaining'
              ? 'bg-emerald-400 animate-pulse'
              : state === 'thinking'
              ? 'bg-amber-400 animate-ping'
              : 'bg-indigo-400'
          }`}
        />
        <span>Ms. Laylo</span>
        {statusBadge && <span className="text-slate-400">· {statusBadge}</span>}
      </div>

      {/* Code-Based 2D SVG Anime Teacher Avatar */}
      <svg
        viewBox="0 0 280 320"
        className="w-full h-full max-h-[280px] drop-shadow-xl"
        aria-label="Ms. Laylo AI Avatar"
      >
        <defs>
          <linearGradient id="jacketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#3730a3" />
          </linearGradient>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2e1065" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#fecdd3" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Aura Background Glow */}
        <circle cx="140" cy="140" r="110" fill="url(#jacketGrad)" opacity="0.12" />

        {/* Base Body & Torso */}
        <g id="torso">
          {/* Shirt Collar */}
          <path d="M 110 210 L 140 240 L 170 210 L 140 280 Z" fill="#ffffff" />
          {/* Jacket */}
          <path
            d="M 80 230 C 80 200, 110 195, 140 195 C 170 195, 200 200, 200 230 L 210 320 L 70 320 Z"
            fill="url(#jacketGrad)"
          />
          {/* Inner Shirt V-Neck */}
          <polygon points="125,195 155,195 140,230" fill="#f8fafc" />
          {/* Red Teacher Badge / Scarf accent */}
          <path d="M 136 215 L 144 215 L 142 245 L 138 245 Z" fill="#e11d48" />
        </g>

        {/* Left Arm Layer */}
        <g
          id="leftArm"
          transform={`rotate(${armLeftAngle}, 85, 220)`}
          className="transition-transform duration-300 ease-out"
        >
          <path
            d="M 85 210 C 65 230, 60 260, 75 290"
            stroke="url(#jacketGrad)"
            strokeWidth="24"
            strokeLinecap="round"
            fill="none"
          />
          {/* Hand */}
          <circle cx="75" cy="295" r="10" fill="#fecdd3" />
        </g>

        {/* Right Arm Layer */}
        <g
          id="rightArm"
          transform={`rotate(${armRightAngle}, 195, 220)`}
          className="transition-transform duration-300 ease-out"
        >
          <path
            d="M 195 210 C 215 230, 220 260, 205 290"
            stroke="url(#jacketGrad)"
            strokeWidth="24"
            strokeLinecap="round"
            fill="none"
          />
          {/* Hand */}
          <circle cx="205" cy="295" r="10" fill="#fecdd3" />
        </g>

        {/* Head Assembly (Head, Face, Eyes, Mouth, Hair, Glasses) */}
        <g
          id="headAssembly"
          transform={`translate(0, ${headY}) rotate(${headRotation}, 140, 130)`}
          className="transition-transform duration-200 ease-out"
        >
          {/* Back Hair */}
          <path
            d="M 85 100 C 70 140, 70 180, 85 210 C 100 200, 180 200, 195 210 C 210 180, 210 140, 195 100 Z"
            fill="url(#hairGrad)"
          />

          {/* Neck */}
          <rect x="126" y="160" width="28" height="40" rx="8" fill="#fecdd3" />

          {/* Face Structure */}
          <path
            d="M 95 100 C 95 60, 185 60, 185 100 C 185 145, 160 175, 140 175 C 120 175, 95 145, 95 100 Z"
            fill="#ffe4e6"
          />

          {/* Cheeks blush */}
          <circle cx="112" cy="138" r="8" fill="#f43f5e" opacity="0.25" />
          <circle cx="168" cy="138" r="8" fill="#f43f5e" opacity="0.25" />

          {/* Eyes Group */}
          <g id="eyes">
            {blink ? (
              // Closed Eyes
              <>
                <path d="M 110 125 Q 120 120 130 125" stroke="#1e293b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <path d="M 150 125 Q 160 120 170 125" stroke="#1e293b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              </>
            ) : eyeType === 'thinking' ? (
              // Looking Up/Side Eyes
              <>
                <ellipse cx="120" cy="122" rx="9" ry="11" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
                <circle cx="123" cy="118" r="4.5" fill="#4338ca" />
                <ellipse cx="160" cy="122" rx="9" ry="11" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
                <circle cx="163" cy="118" r="4.5" fill="#4338ca" />
              </>
            ) : eyeType === 'encouraging' ? (
              // Joyful Arc Eyes
              <>
                <path d="M 110 126 Q 120 114 130 126" stroke="#4338ca" strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M 150 126 Q 160 114 170 126" stroke="#4338ca" strokeWidth="4" fill="none" strokeLinecap="round" />
              </>
            ) : eyeType === 'error' ? (
              // Concerned Eyes
              <>
                <circle cx="120" cy="125" r="7" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
                <circle cx="120" cy="125" r="3" fill="#0f172a" />
                <circle cx="160" cy="125" r="7" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
                <circle cx="160" cy="125" r="3" fill="#0f172a" />
              </>
            ) : (
              // Standard Anime Eyes
              <>
                <ellipse cx="120" cy="125" rx="10" ry="12" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
                <circle cx="120" cy="125" r="5" fill="#312e81" />
                <circle cx="122" cy="123" r="2" fill="#ffffff" />

                <ellipse cx="160" cy="125" rx="10" ry="12" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
                <circle cx="160" cy="125" r="5" fill="#312e81" />
                <circle cx="162" cy="123" r="2" fill="#ffffff" />
              </>
            )}

            {/* Eyebrows */}
            {eyeType === 'thinking' ? (
              <>
                <path d="M 110 108 Q 120 112 130 110" stroke="#1e1b4b" strokeWidth="3" fill="none" />
                <path d="M 150 106 Q 160 104 170 108" stroke="#1e1b4b" strokeWidth="3" fill="none" />
              </>
            ) : (
              <>
                <path d="M 110 112 Q 120 106 130 112" stroke="#1e1b4b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M 150 112 Q 160 106 170 112" stroke="#1e1b4b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </>
            )}
          </g>

          {/* Teacher Glasses */}
          <g id="glasses">
            <rect x="106" y="114" width="28" height="20" rx="6" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
            <rect x="146" y="114" width="28" height="20" rx="6" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
            <line x1="134" y1="122" x2="146" y2="122" stroke="#e2e8f0" strokeWidth="2.5" />
          </g>

          {/* Nose */}
          <path d="M 140 135 L 138 143 L 142 143" stroke="#fda4af" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Dynamic Mouth Shape with Lip-Sync Amplitude */}
          <g id="mouth">
            {mouthOpenAmount > 4 ? (
              // Open Mouth for Speaking
              <path
                d={`M 130 155 Q 140 ${155 + mouthOpenAmount} 150 155 Z`}
                fill="#e11d48"
                stroke="#9f1239"
                strokeWidth="1.5"
              />
            ) : eyeType === 'encouraging' ? (
              // Smiling Mouth
              <path d="M 128 152 Q 140 164 152 152" stroke="#be123c" strokeWidth="3" fill="none" strokeLinecap="round" />
            ) : (
              // Closed Gentle Smile
              <path d="M 132 154 Q 140 158 148 154" stroke="#be123c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}
          </g>

          {/* Front Hair Bangs */}
          <path
            d="M 95 90 C 110 110, 130 80, 140 105 C 150 80, 170 110, 185 90 C 180 60, 100 60, 95 90 Z"
            fill="url(#hairGrad)"
          />
        </g>
      </svg>

      {/* Dynamic Subtitle Banner */}
      {subtitles && (
        <div className="w-full mt-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-center text-indigo-200 line-clamp-2 max-w-sm">
          "{subtitles}"
        </div>
      )}
    </div>
  );
};
