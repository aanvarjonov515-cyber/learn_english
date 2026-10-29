import { AvatarAsset, VideoAsset, VideoTextMapping, MediaPreferences, MediaPanelMode } from '../types';

const AVATAR_KEY = 'english_teacher_avatars_v1';
const VIDEO_KEY = 'english_teacher_videos_v1';
const MAPPING_KEY = 'english_teacher_video_mappings_v1';
const PREFS_KEY = 'english_teacher_media_prefs_v1';

export const DEFAULT_AVATAR: AvatarAsset = {
  id: 'preset_laylo_svg',
  ownerId: 'default',
  name: 'Ms. Laylo (Anime Teacher)',
  type: 'preset_svg',
  isDefault: true,
  capabilities: {
    supportsRigging: true,
    supportsLipSync: true,
    supportsGesture: true,
  },
  createdAt: new Date().toISOString(),
};

export const DEFAULT_PREFERENCES: MediaPreferences = {
  activeMode: 'animatedAvatar',
  selectedAvatarId: DEFAULT_AVATAR.id,
  videoAudioMode: 'muted_with_teacher_tts',
  isCollapsed: false,
  heightPx: 260,
};

function safeGetStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', key, e);
  }
}

export function getAvatars(): AvatarAsset[] {
  const stored = safeGetStorage<AvatarAsset[]>(AVATAR_KEY, []);
  if (!stored.some((a) => a.id === DEFAULT_AVATAR.id)) {
    const updated = [DEFAULT_AVATAR, ...stored];
    safeSetStorage(AVATAR_KEY, updated);
    return updated;
  }
  return stored;
}

export function saveAvatar(avatar: AvatarAsset): AvatarAsset[] {
  const list = getAvatars();
  const idx = list.findIndex((a) => a.id === avatar.id);
  let updated: AvatarAsset[];
  if (idx >= 0) {
    updated = [...list];
    updated[idx] = avatar;
  } else {
    updated = [...list, avatar];
  }
  safeSetStorage(AVATAR_KEY, updated);
  return updated;
}

export function deleteAvatar(avatarId: string): AvatarAsset[] {
  if (avatarId === DEFAULT_AVATAR.id) return getAvatars(); // Protect default
  const list = getAvatars().filter((a) => a.id !== avatarId);
  safeSetStorage(AVATAR_KEY, list);
  return list;
}

export function getVideos(): VideoAsset[] {
  return safeGetStorage<VideoAsset[]>(VIDEO_KEY, []);
}

export function saveVideo(video: VideoAsset): VideoAsset[] {
  const list = getVideos();
  const idx = list.findIndex((v) => v.id === video.id);
  let updated: VideoAsset[];
  if (idx >= 0) {
    updated = [...list];
    updated[idx] = video;
  } else {
    updated = [...list, video];
  }
  safeSetStorage(VIDEO_KEY, updated);
  return updated;
}

export function deleteVideo(videoId: string): VideoAsset[] {
  const list = getVideos().filter((v) => v.id !== videoId);
  safeSetStorage(VIDEO_KEY, list);
  return list;
}

export function getVideoMappings(): VideoTextMapping[] {
  return safeGetStorage<VideoTextMapping[]>(MAPPING_KEY, []);
}

export function saveVideoMapping(mapping: VideoTextMapping): VideoTextMapping[] {
  const list = getVideoMappings();
  const idx = list.findIndex((m) => m.id === mapping.id);
  let updated: VideoTextMapping[];
  if (idx >= 0) {
    updated = [...list];
    updated[idx] = mapping;
  } else {
    updated = [...list, mapping];
  }
  safeSetStorage(MAPPING_KEY, updated);
  return updated;
}

export function getMediaPreferences(): MediaPreferences {
  return safeGetStorage<MediaPreferences>(PREFS_KEY, DEFAULT_PREFERENCES);
}

export function saveMediaPreferences(prefs: Partial<MediaPreferences>): MediaPreferences {
  const current = getMediaPreferences();
  const updated = { ...current, ...prefs };
  safeSetStorage(PREFS_KEY, updated);
  return updated;
}
