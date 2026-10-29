import React, { useState } from 'react';
import { AvatarAsset } from '../../types';
import { getAvatars, saveAvatar, deleteAvatar, DEFAULT_AVATAR } from '../../services/mediaStorage';
import { X, Upload, Check, Trash2, User, Sparkles, Image as ImageIcon } from 'lucide-react';

interface AvatarSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAvatarId: string;
  onSelectAvatar: (avatarId: string) => void;
}

export const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({
  isOpen,
  onClose,
  selectedAvatarId,
  onSelectAvatar,
}) => {
  const [avatars, setAvatars] = useState<AvatarAsset[]>(() => getAvatars());
  const [newAvatarName, setNewAvatarName] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadMode, setUploadMode] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const created: AvatarAsset = {
          id: `custom_avatar_${Date.now()}`,
          ownerId: 'default',
          name: newAvatarName.trim() || file.name.replace(/\.[^/.]+$/, ''),
          type: 'custom_upload',
          imageUrl: dataUrl,
          capabilities: {
            supportsRigging: false,
            supportsLipSync: false,
            supportsGesture: false,
          },
          createdAt: new Date().toISOString(),
        };
        const updated = saveAvatar(created);
        setAvatars(updated);
        onSelectAvatar(created.id);
        setNewAvatarName('');
        setUploadMode(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;

    const created: AvatarAsset = {
      id: `custom_url_avatar_${Date.now()}`,
      ownerId: 'default',
      name: newAvatarName.trim() || 'Custom Avatar',
      type: 'static_image',
      imageUrl: imageUrlInput.trim(),
      capabilities: {
        supportsRigging: false,
        supportsLipSync: false,
        supportsGesture: false,
      },
      createdAt: new Date().toISOString(),
    };

    const updated = saveAvatar(created);
    setAvatars(updated);
    onSelectAvatar(created.id);
    setNewAvatarName('');
    setImageUrlInput('');
    setUploadMode(false);
  };

  const handleDelete = (id: string) => {
    const updated = deleteAvatar(id);
    setAvatars(updated);
    if (selectedAvatarId === id) {
      onSelectAvatar(DEFAULT_AVATAR.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">O‘qituvchi Avatarini Tanlash</h3>
              <p className="text-xs text-slate-400">Interaktiv SVG animatsiyali yoki rasmli avatar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Avatar Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {avatars.map((av) => {
              const isSelected = av.id === selectedAvatarId;
              return (
                <div
                  key={av.id}
                  onClick={() => onSelectAvatar(av.id)}
                  className={`relative p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-700/80 overflow-hidden flex items-center justify-center shrink-0">
                    {av.type === 'preset_svg' ? (
                      <div className="text-indigo-400 flex flex-col items-center">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                        <span className="text-[9px] font-medium text-slate-400 mt-0.5">2D SVG</span>
                      </div>
                    ) : (
                      <img
                        src={av.imageUrl}
                        alt={av.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-medium text-slate-200 truncate">{av.name}</h4>
                      {isSelected && (
                        <span className="p-1 bg-indigo-500/20 text-indigo-400 rounded-full">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Capabilities Badges */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {av.capabilities.supportsRigging && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 rounded">
                          Rigged 2D
                        </span>
                      )}
                      {av.capabilities.supportsLipSync && (
                        <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 rounded">
                          Lip-Sync
                        </span>
                      )}
                      {!av.capabilities.supportsRigging && (
                        <span className="px-1.5 py-0.5 bg-slate-700/50 text-[10px] text-slate-400 rounded">
                          Statik Rasm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete custom avatar */}
                  {!av.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(av.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Upload / Add Form Toggle */}
          {!uploadMode ? (
            <button
              onClick={() => setUploadMode(true)}
              className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl text-xs font-medium text-slate-300 flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>O‘zingizning Avatar Rasmingizni Yuklang</span>
            </button>
          ) : (
            <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">Yangi Custom Avatar Yaratish</span>
                <button
                  onClick={() => setUploadMode(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Bekor qilish
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Avatar Nomi</label>
                <input
                  type="text"
                  value={newAvatarName}
                  onChange={(e) => setNewAvatarName(e.target.value)}
                  placeholder="Masalan: Men belgilagan rasm"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* File Upload Button */}
                <label className="cursor-pointer py-2 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 rounded-lg text-xs font-medium text-indigo-300 flex items-center justify-center gap-2 transition-colors">
                  <ImageIcon className="w-4 h-4" />
                  <span>Kompyuterdan Fayl Tanlash</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Direct URL Form */}
                <form onSubmit={handleUrlAdd} className="flex gap-1.5">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://... rasm linki"
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium text-white transition-colors"
                  >
                    Qo‘shish
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white rounded-lg transition-colors"
          >
            Saqlash va Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
