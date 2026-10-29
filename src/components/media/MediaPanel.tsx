import React, { useState, useEffect, useRef } from 'react';
import {
  MediaPanelMode,
  AvatarAnimationState,
  MediaPreferences,
  VideoAsset,
  AvatarAsset,
} from '../../types';
import {
  getMediaPreferences,
  saveMediaPreferences,
  getAvatars,
  getVideos,
  saveVideo,
} from '../../services/mediaStorage';
import { TeacherRiggedAvatar } from './TeacherRiggedAvatar';
import { AvatarSelectionModal } from './AvatarSelectionModal';
import {
  Video,
  User,
  EyeOff,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Upload,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
} from 'lucide-react';

interface MediaPanelProps {
  avatarState?: AvatarAnimationState;
  isPlaying?: boolean;
  audioElement?: HTMLAudioElement | HTMLVideoElement | null;
  currentSubtitles?: string;
  reduceMotion?: boolean;
  className?: string;
  onModeChange?: (mode: MediaPanelMode) => void;
}

export const MediaPanel: React.FC<MediaPanelProps> = ({
  avatarState = 'idle',
  isPlaying = false,
  audioElement = null,
  currentSubtitles = '',
  reduceMotion = false,
  className = '',
  onModeChange,
}) => {
  const [prefs, setPrefs] = useState<MediaPreferences>(() => getMediaPreferences());
  const [avatars, setAvatars] = useState<AvatarAsset[]>(() => getAvatars());
  const [videos, setVideos] = useState<VideoAsset[]>(() => getVideos());
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<VideoAsset | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sync active video if set
  useEffect(() => {
    if (prefs.activeVideoId) {
      const found = videos.find((v) => v.id === prefs.activeVideoId);
      setActiveVideo(found || null);
    } else if (videos.length > 0) {
      setActiveVideo(videos[0]);
    }
  }, [prefs.activeVideoId, videos]);

  // Handle mode updates
  const handleModeSwitch = (mode: MediaPanelMode) => {
    const updated = saveMediaPreferences({ activeMode: mode });
    setPrefs(updated);
    if (onModeChange) onModeChange(mode);
  };

  const handleToggleCollapse = () => {
    const updated = saveMediaPreferences({ isCollapsed: !prefs.isCollapsed });
    setPrefs(updated);
  };

  const handleSelectAvatar = (avatarId: string) => {
    const updated = saveMediaPreferences({ selectedAvatarId: avatarId });
    setPrefs(updated);
    setAvatars(getAvatars());
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const newVideo: VideoAsset = {
      id: `video_${Date.now()}`,
      ownerId: 'default',
      title: file.name,
      videoUrl: url,
      durationSeconds: 120,
      uploadedAt: new Date().toISOString(),
      hasOriginalAudio: true,
    };

    const updatedList = saveVideo(newVideo);
    setVideos(updatedList);
    const updatedPrefs = saveMediaPreferences({ activeVideoId: newVideo.id, activeMode: 'video' });
    setPrefs(updatedPrefs);
  };

  const currentAvatar = avatars.find((a) => a.id === prefs.selectedAvatarId) || avatars[0];

  if (prefs.activeMode === 'none') {
    return (
      <div className={`p-2 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400 ${className}`}>
        <span className="flex items-center gap-1.5">
          <EyeOff className="w-4 h-4 text-slate-500" />
          <span>Media paneli yashirilgan</span>
        </span>
        <button
          onClick={() => handleModeSwitch('animatedAvatar')}
          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg font-medium transition-colors min-h-[36px]"
        >
          Avatar Ko‘rsatish
        </button>
      </div>
    );
  }

  return (
    <div className={`relative bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ${className}`}>
      {/* Panel Top Control Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-slate-950/50">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => handleModeSwitch('animatedAvatar')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors min-h-[36px] ${
              prefs.activeMode === 'animatedAvatar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Animatsiyali Interaktiv Avatar"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2D Avatar</span>
          </button>

          <button
            onClick={() => handleModeSwitch('staticAvatar')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors min-h-[36px] ${
              prefs.activeMode === 'staticAvatar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Statik Rasm Avatar"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rasm</span>
          </button>

          <button
            onClick={() => handleModeSwitch('video')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors min-h-[36px] ${
              prefs.activeMode === 'video'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Video Darslik"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Video</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {prefs.activeMode !== 'video' && (
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              className="px-2 py-1 text-xs text-indigo-300 hover:text-indigo-100 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg flex items-center gap-1 transition-colors min-h-[36px]"
              title="Avatar almashtirish yoki yuklash"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Almashtirish</span>
            </button>
          )}

          <button
            onClick={handleToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title={prefs.isCollapsed ? 'Kengaytirish' : 'Yig‘ish'}
          >
            {prefs.isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <button
            onClick={() => handleModeSwitch('none')}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Media panelini yashirish"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      {!prefs.isCollapsed && (
        <div className="relative p-3 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 min-h-[220px]">
          {/* MODE 1: Animated 2D SVG Avatar */}
          {prefs.activeMode === 'animatedAvatar' && (
            <div className="w-full flex flex-col items-center">
              {currentAvatar.type === 'preset_svg' ? (
                <TeacherRiggedAvatar
                  state={avatarState}
                  isPlaying={isPlaying}
                  audioElement={audioElement}
                  reduceMotion={reduceMotion}
                  subtitles={currentSubtitles}
                  className="w-full max-w-xs"
                />
              ) : (
                <div className="relative flex flex-col items-center">
                  <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-lg bg-slate-950">
                    <img
                      src={currentAvatar.imageUrl}
                      alt={currentAvatar.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="mt-2 text-xs font-medium text-slate-300">{currentAvatar.name}</span>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: Static Image Avatar */}
          {prefs.activeMode === 'staticAvatar' && (
            <div className="flex flex-col items-center py-2">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-slate-700 shadow-md bg-slate-950">
                <img
                  src={currentAvatar.imageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop'}
                  alt={currentAvatar.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-2 text-center">
                <h4 className="text-xs font-medium text-slate-200">{currentAvatar.name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Statik Avatar Rasm</p>
              </div>
            </div>
          )}

          {/* MODE 3: Video Player */}
          {prefs.activeMode === 'video' && (
            <div className="w-full max-w-md flex flex-col items-center">
              {activeVideo ? (
                <div className="w-full relative rounded-xl overflow-hidden bg-black border border-slate-800 shadow-lg group">
                  <video
                    ref={videoRef}
                    src={activeVideo.videoUrl}
                    controls
                    muted={prefs.videoAudioMode === 'muted_with_teacher_tts'}
                    className="w-full h-48 object-contain"
                  />

                  {/* Video Audio Mode Controls Overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 p-1 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/60">
                    <button
                      onClick={() => {
                        const newAudioMode =
                          prefs.videoAudioMode === 'original' ? 'muted_with_teacher_tts' : 'original';
                        const updated = saveMediaPreferences({ videoAudioMode: newAudioMode });
                        setPrefs(updated);
                        if (videoRef.current) {
                          videoRef.current.muted = newAudioMode === 'muted_with_teacher_tts';
                        }
                      }}
                      className="px-2 py-1 text-[11px] font-medium text-slate-200 flex items-center gap-1 hover:text-white"
                      title="Video ovozi va Teacher TTS audio tanlovi"
                    >
                      {prefs.videoAudioMode === 'original' ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Original Ovoz</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                          <span>Teacher TTS Ovoz</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* No Video Placeholder / Upload Button */
                <div className="w-full p-6 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/40 text-center flex flex-col items-center">
                  <Video className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-300 font-medium mb-1">Dars uchun Video Yuklanmagan</p>
                  <p className="text-[11px] text-slate-500 mb-3">O‘z videongizni yuklab, dars bilan birga tomosha qiling</p>
                  <label className="cursor-pointer px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors min-h-[44px]">
                    <Upload className="w-4 h-4" />
                    <span>Video Fayl Tanlash</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Avatar Selection Modal */}
      <AvatarSelectionModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        selectedAvatarId={prefs.selectedAvatarId}
        onSelectAvatar={handleSelectAvatar}
      />
    </div>
  );
};
