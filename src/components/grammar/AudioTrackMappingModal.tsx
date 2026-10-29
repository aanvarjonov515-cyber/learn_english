import React, { useState, useEffect } from 'react';
import {
  AudioTrackMapping,
  GrammarExercise,
  TrackCandidate,
  AudioAsset,
} from '../../types';
import {
  findTrackCandidates,
  validateAudioInterval,
  extractTrackReferences,
} from '../../services/trackMatcher';
import {
  getAudioAssets,
  getAudioCollections,
} from '../../services/listeningStorage';
import {
  getMappingForExercise,
  saveAudioTrackMapping,
  unlinkAudioTrackMapping,
} from '../../services/mappingStorage';
import { playbackController } from '../../services/audioEngine';
import {
  Link2,
  Unlink,
  CheckCircle2,
  Volume2,
  Play,
  Pause,
  Clock,
  Sparkles,
  Search,
  Upload,
  AlertCircle,
  X,
  FileAudio,
} from 'lucide-react';
import { FileUploadModal } from '../common/FileUploadModal';

interface AudioTrackMappingModalProps {
  exercise: GrammarExercise;
  bookId: string;
  bookTitle: string;
  bookEdition?: string;
  isOpen: boolean;
  onClose: () => void;
  onMappingUpdated?: (mapping: AudioTrackMapping | null) => void;
}

export const AudioTrackMappingModal: React.FC<AudioTrackMappingModalProps> = ({
  exercise,
  bookId,
  bookTitle,
  bookEdition,
  isOpen,
  onClose,
  onMappingUpdated,
}) => {
  const [candidates, setCandidates] = useState<TrackCandidate[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [startSeconds, setStartSeconds] = useState<string>('');
  const [endSeconds, setEndSeconds] = useState<string>('');
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const existingMapping = getMappingForExercise(exercise.id);
  const allAssets = getAudioAssets();
  const allCollections = getAudioCollections();

  // Extract detected track from exercise or page
  const detectedReferences = extractTrackReferences(
    exercise.instruction + ' ' + exercise.contentText,
    exercise.pageIndex,
    exercise.printedPageLabel
  );
  const defaultTrackLabel =
    exercise.linkedTrackLabel ||
    detectedReferences[0]?.cleanTrackLabel ||
    '1.03';

  useEffect(() => {
    if (!isOpen) return;

    const list = findTrackCandidates({
      targetLabel: defaultTrackLabel,
      bookId,
      bookEdition,
      exerciseId: exercise.id,
      allAssets,
      allCollections,
      existingMappings: existingMapping ? [existingMapping] : [],
    });

    setCandidates(list);

    if (existingMapping && existingMapping.status === 'confirmed') {
      setSelectedAssetId(existingMapping.audioAssetId);
      setStartSeconds(
        existingMapping.startSeconds !== undefined
          ? String(existingMapping.startSeconds)
          : ''
      );
      setEndSeconds(
        existingMapping.endSeconds !== undefined
          ? String(existingMapping.endSeconds)
          : ''
      );
    } else if (list.length > 0) {
      setSelectedAssetId(list[0].asset.id);
    }
  }, [isOpen, exercise.id, defaultTrackLabel]);

  if (!isOpen) return null;

  const handlePreview = (asset: AudioAsset) => {
    if (isPlayingPreview === asset.id) {
      playbackController.stopTeacherVoice();
      playbackController.stop();
      setIsPlayingPreview(null);
    } else {
      setIsPlayingPreview(asset.id);
      playbackController.playListeningTrack({
        audioUrl: asset.storagePath,
        fallbackText: asset.transcriptText || `Track ${asset.trackLabel}. Audio preview.`,
        onEnded: () => setIsPlayingPreview(null),
      });
    }
  };

  const handleTestInterval = () => {
    const asset = allAssets.find((a) => a.id === selectedAssetId);
    if (!asset) return;

    const start = startSeconds ? parseFloat(startSeconds) : 0;
    const end = endSeconds ? parseFloat(endSeconds) : asset.durationSeconds || 30;

    const validation = validateAudioInterval(start, end, asset.durationSeconds);
    if (!validation.isValid) {
      setValidationError(validation.errorUz || 'Oraliq noto‘g‘ri.');
      return;
    }
    setValidationError(null);

    setIsPlayingPreview(asset.id);
    playbackController.playListeningTrack({
      audioUrl: asset.storagePath,
      fallbackText: asset.transcriptText || `Testing interval from ${start} to ${end} seconds.`,
      startSeconds: start,
      endSeconds: end,
      onEnded: () => setIsPlayingPreview(null),
    });
  };

  const handleConfirmMapping = () => {
    if (!selectedAssetId) return;

    const chosenAsset = allAssets.find((a) => a.id === selectedAssetId);
    const start = startSeconds ? parseFloat(startSeconds) : undefined;
    const end = endSeconds ? parseFloat(endSeconds) : undefined;

    const validation = validateAudioInterval(start, end, chosenAsset?.durationSeconds);
    if (!validation.isValid) {
      setValidationError(validation.errorUz || 'Oraliq noto‘g‘ri.');
      return;
    }
    setValidationError(null);

    const mapping: AudioTrackMapping = {
      id: existingMapping?.id || `map_${exercise.id}_${Date.now()}`,
      ownerId: 'usr_current',
      bookId,
      bookEdition,
      audioCollectionId: chosenAsset?.collectionId,
      unitId: exercise.unitId,
      exerciseId: exercise.id,
      pageReference: exercise.printedPageLabel,
      trackLabel: chosenAsset?.trackLabel || defaultTrackLabel,
      audioAssetId: selectedAssetId,
      startSeconds: start,
      endSeconds: end,
      status: 'confirmed',
      mappingSource: candidates.some((c) => c.asset.id === selectedAssetId)
        ? 'exactLabel'
        : 'manual',
      confirmedBy: 'user',
      confirmedAt: new Date().toISOString(),
      bookContentVersion: 1,
      revision: (existingMapping?.revision || 0) + 1,
      createdAt: existingMapping?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveAudioTrackMapping(mapping);
    if (onMappingUpdated) onMappingUpdated(mapping);
    onClose();
  };

  const handleUnlink = () => {
    unlinkAudioTrackMapping(exercise.id);
    if (onMappingUpdated) onMappingUpdated(null);
    onClose();
  };

  const filteredAssets = searchFilter
    ? allAssets.filter(
        (a) =>
          a.trackLabel.toLowerCase().includes(searchFilter.toLowerCase()) ||
          a.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
          a.originalFilename.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#FAF9F5] border border-[#E5E2D9] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-gray-900">
                Listening Audiosini Mashqqa Biriktirish
              </h3>
              <p className="text-xs text-gray-500">
                {bookTitle} ({exercise.exerciseNumber}-mashq, {exercise.printedPageLabel}-bet)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Detected Info in Textbook */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-900 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" /> Darslikdan aniqlangan track:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 font-bold text-xs">
              Track {defaultTrackLabel}
            </span>
          </div>
          <p className="text-xs text-gray-700 italic">
            "{detectedReferences[0]?.rawMatchedText || `Track ${defaultTrackLabel}`}" — {exercise.instruction}
          </p>
        </div>

        {/* Existing Mapping Status Banner */}
        {existingMapping && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E5E2D9] text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`w-4 h-4 ${
                  existingMapping.status === 'confirmed'
                    ? 'text-emerald-700'
                    : 'text-amber-600'
                }`}
              />
              <span className="font-semibold text-gray-800">
                Holat:{' '}
                <span className="uppercase text-[11px] font-bold text-teal-800">
                  {existingMapping.status}
                </span>{' '}
                (Track {existingMapping.trackLabel})
              </span>
            </div>
            <button
              onClick={handleUnlink}
              className="px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1 cursor-pointer font-medium"
            >
              <Unlink className="w-3.5 h-3.5" /> Biriktirishni bekor qilish
            </button>
          </div>
        )}

        {/* Suggested Candidates */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700 uppercase">
            Mos Keluvchi Nomzod Audiolar ({candidates.length} ta topildi):
          </label>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {candidates.map((cand) => (
              <div
                key={cand.asset.id}
                onClick={() => setSelectedAssetId(cand.asset.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedAssetId === cand.asset.id
                    ? 'bg-teal-50 border-teal-600 ring-1 ring-teal-600'
                    : 'bg-white border-[#E5E2D9] hover:border-gray-300'
                }`}
              >
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">
                      Track {cand.asset.trackLabel}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      {cand.matchReasonUz}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate font-medium">
                    {cand.asset.title} ({cand.asset.originalFilename})
                  </p>
                  {cand.previewSnippet && (
                    <p className="text-[11px] text-gray-400 italic truncate font-serif">
                      "{cand.previewSnippet}..."
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(cand.asset);
                  }}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-teal-800 hover:text-white transition-colors cursor-pointer text-gray-700"
                  title="Qisqa tinglab ko‘rish"
                >
                  {isPlayingPreview === cand.asset.id ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button>
              </div>
            ))}

            {candidates.length === 0 && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                <p className="text-xs text-gray-600 font-medium">
                  "{defaultTrackLabel}" belgisi bo‘yicha avtomatik audio topilmadi.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Custom Audio Interval (startSeconds, endSeconds) */}
        <div className="p-3.5 bg-white border border-[#E5E2D9] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-800" /> Audio Oralig‘ini Cheklash (Ixtiyoriy)
            </span>
            <span className="text-[11px] text-gray-500">
              Bitta trek bir nechta mashqni o‘z ichiga olganda
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-gray-600 mb-1">Boshlanish (soniya):</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={startSeconds}
                onChange={(e) => setStartSeconds(e.target.value)}
                placeholder="0"
                className="w-full p-2 bg-[#FAF9F5] border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Tugash (soniya):</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={endSeconds}
                onChange={(e) => setEndSeconds(e.target.value)}
                placeholder="Masalan, 45"
                className="w-full p-2 bg-[#FAF9F5] border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {validationError && (
            <p className="text-xs text-rose-700 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {validationError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleTestInterval}
              disabled={!selectedAssetId}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <Play className="w-3 h-3 fill-current" /> Tanlangan oraliqni sinash
            </button>
            {(startSeconds || endSeconds) && (
              <button
                type="button"
                onClick={() => {
                  setStartSeconds('');
                  setEndSeconds('');
                  setValidationError(null);
                }}
                className="px-2 py-1 text-xs text-gray-500 hover:underline cursor-pointer"
              >
                Butun trekka qaytarish
              </button>
            )}
          </div>
        </div>

        {/* Search from full library or Upload New Track */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 uppercase">
              Kutubxonadan Qidirish yoki Yangi Audio Yuklash:
            </span>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-2.5 py-1 bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-teal-900"
            >
              <Upload className="w-3.5 h-3.5" /> Audio Yuklash
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Track raqami yoki fayl nomi bo‘yicha qidirish..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#D5D1C6] rounded-xl text-xs focus:ring-1 focus:ring-teal-700"
            />
          </div>

          {searchFilter && (
            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-white rounded-xl border border-gray-200">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer ${
                    selectedAssetId === asset.id
                      ? 'bg-teal-50 border-teal-600 font-bold'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileAudio className="w-4 h-4 text-teal-800 shrink-0" />
                    <span className="truncate">
                      Track {asset.trackLabel}: {asset.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {Math.round(asset.durationSeconds || 0)}s
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E2D9]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleConfirmMapping}
            disabled={!selectedAssetId}
            className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" /> Bog‘lanishni Tasdiqlash
          </button>
        </div>
      </div>

      {/* Direct Audio Upload Integration (reuses Stage 8 FileUploadModal) */}
      {showUploadModal && (
        <FileUploadModal
          category="audio"
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onFileProcessed={(file) => {
            setShowUploadModal(false);
          }}
        />
      )}
    </div>
  );
};
