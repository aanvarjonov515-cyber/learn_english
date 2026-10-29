import React, { useState, useEffect, useRef } from 'react';
import {
  AudioAsset,
  AudioCollection,
  AudioBookmark,
  DictationSubmission,
} from '../../types';
import {
  getAudioAssets,
  saveAudioAsset,
  deleteAudioAsset,
  getAudioCollections,
  saveAudioCollection,
  parseSuggestedTrackLabel,
  evaluateDictation,
} from '../../services/listeningStorage';
import { FileUploadModal } from '../common/FileUploadModal';
import {
  Headphones,
  Upload,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Bookmark,
  Repeat,
  FileText,
  PenTool,
  Sparkles,
  Check,
  Trash2,
  Plus,
  ArrowLeft,
  Volume2,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Tag,
  Search,
} from 'lucide-react';
import { speakEnglishText, stopCurrentAudio } from '../../services/audio';

interface ListeningViewProps {
  ownerId: string;
}

type ListeningTab = 'free' | 'transcript' | 'hidden_transcript' | 'dictation';

export const ListeningView: React.FC<ListeningViewProps> = ({ ownerId }) => {
  const [tracks, setTracks] = useState<AudioAsset[]>([]);
  const [collections, setCollections] = useState<AudioCollection[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColFilter, setSelectedColFilter] = useState<string>('all');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewTrackModal, setShowNewTrackModal] = useState(false);

  // Active track playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // A-B Loop states
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isLoopingAB, setIsLoopingAB] = useState(false);

  // Audio Bookmark form
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [showBookmarkInput, setShowBookmarkInput] = useState(false);

  // Tab & Dictation
  const [activeTab, setActiveTab] = useState<ListeningTab>('free');
  const [isTranscriptRevealed, setIsTranscriptRevealed] = useState(false);
  const [dictationInput, setDictationInput] = useState('');
  const [dictationResult, setDictationResult] = useState<DictationSubmission | null>(null);

  // AI Transcription state
  const [transcribing, setTranscribing] = useState(false);

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadData = () => {
    setTracks(getAudioAssets());
    setCollections(getAudioCollections());
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) || null;

  // Cleanup on track change
  useEffect(() => {
    stopCurrentAudio();
    setIsPlaying(false);
    setCurrentTime(0);
    setLoopA(null);
    setLoopB(null);
    setIsLoopingAB(false);
    setDictationResult(null);
    setDictationInput('');
    setIsTranscriptRevealed(false);
  }, [selectedTrackId]);

  // Audio timeupdate and A-B loop enforcement
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    setCurrentTime(cur);

    if (isLoopingAB && loopA !== null && loopB !== null && loopB > loopA) {
      if (cur >= loopB) {
        audioRef.current.currentTime = loopA;
      }
    }
  };

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSkipSeconds = (delta: number) => {
    if (audioRef.current) {
      const next = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
      audioRef.current.currentTime = next;
      setCurrentTime(next);
    }
  };

  const handleChangeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      audioRef.current.preservesPitch = true;
    }
  };

  // Set A-B Points
  const handleSetPointA = () => {
    setLoopA(currentTime);
    if (loopB !== null && loopB <= currentTime) {
      setLoopB(null);
      setIsLoopingAB(false);
    }
  };

  const handleSetPointB = () => {
    if (loopA === null) {
      alert("Avval 'A nuqtasi'ni belgilang.");
      return;
    }
    if (currentTime <= loopA) {
      alert("B nuqtasi A nuqtasidan keyin bo'lishi kerak.");
      return;
    }
    setLoopB(currentTime);
    setIsLoopingAB(true);
  };

  const handleClearLoop = () => {
    setLoopA(null);
    setLoopB(null);
    setIsLoopingAB(false);
  };

  // Add bookmark
  const handleAddBookmark = () => {
    if (!selectedTrack || !bookmarkLabel.trim()) return;
    const newBm: AudioBookmark = {
      id: `bm_${Date.now()}`,
      audioAssetId: selectedTrack.id,
      timeSeconds: Math.floor(currentTime),
      label: bookmarkLabel.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = {
      ...selectedTrack,
      bookmarks: [...(selectedTrack.bookmarks || []), newBm],
    };
    saveAudioAsset(updated);
    setBookmarkLabel('');
    setShowBookmarkInput(false);
    loadData();
  };

  // Evaluate Dictation
  const handleCheckDictation = () => {
    if (!selectedTrack?.transcriptText) return;
    const result = evaluateDictation(dictationInput, selectedTrack.transcriptText);
    setDictationResult(result);
  };

  // Transcribe with AI
  const handleTranscribeWithAI = async () => {
    if (!selectedTrack) return;
    setTranscribing(true);

    try {
      // Simulate/call transcription
      const res = await fetch('/api/listening/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: 'mock_audio_sample',
          mimeType: selectedTrack.mimeType,
        }),
      });

      const data = await res.json();
      const text = data.transcript || "Transkripsiya xizmati audio tahlilini yakunladi.";

      const updated = {
        ...selectedTrack,
        hasTranscript: true,
        transcriptText: text,
        transcriptStatus: 'ready' as const,
      };
      saveAudioAsset(updated);
      loadData();
    } catch (e) {
      console.error('Transcription error', e);
    } finally {
      setTranscribing(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtered tracks
  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.trackLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.originalFilename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCol =
      selectedColFilter === 'all' || t.collectionId === selectedColFilter;
    return matchesSearch && matchesCol;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. LIBRARY OVERVIEW */}
      {!selectedTrack && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D9]">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">
                Listening Kutubxonasi
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Kitob va darsliklarning audio tracklarini yuklang, A–B takrorlash va diktant mashqlarini bajaring.
              </p>
            </div>

            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Audio Yuklash</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Track nomi, raqami (masalan: 3.23) yoki fayl nomi bo‘yicha qidiring..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#D5D1C6] rounded-xl text-xs text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <select
              value={selectedColFilter}
              onChange={(e) => setSelectedColFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-[#D5D1C6] rounded-xl text-xs text-gray-800 w-full sm:w-auto"
            >
              <option value="all">Barcha to‘plamlar</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Tracks List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
                className="bg-white border border-[#E5E2D9] rounded-2xl p-5 shadow-2xs hover:border-teal-700 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      Track: {track.trackLabel}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Haqiqatan ham bu audioni o‘chirmoqchimisiz?")) {
                          deleteAudioAsset(track.id);
                          loadData();
                        }
                      }}
                      className="text-gray-300 hover:text-rose-600 p-1 rounded cursor-pointer transition-colors"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-serif font-bold text-base text-gray-900 group-hover:text-teal-800 transition-colors">
                    {track.title}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono truncate">
                    {track.originalFilename}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {track.durationSeconds ? `${track.durationSeconds} son` : "Audio"}
                  </span>
                  <span className="font-semibold text-teal-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Tinglash &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. DETAILED AUDIO PLAYER & PRACTICE VIEW */}
      {selectedTrack && (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedTrackId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Kutubxonaga qaytish
          </button>

          {/* Player Container */}
          <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Hidden audio element */}
            <audio
              ref={audioRef}
              src={selectedTrack.storagePath || '/sample-audio.mp3'}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => {
                if (audioRef.current) setDuration(audioRef.current.duration || selectedTrack.durationSeconds || 30);
              }}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Track Info Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E2D9]">
              <div>
                <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  Kitob belgisi: {selectedTrack.trackLabel}
                </span>
                <h2 className="font-serif font-bold text-xl sm:text-2xl text-gray-900 mt-1">
                  {selectedTrack.title}
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Fayl: {selectedTrack.originalFilename}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                  Kitob mashqiga bog‘lanmagan
                </span>
              </div>
            </div>

            {/* Waveform / Progress Slider */}
            <div className="space-y-1.5">
              <input
                type="range"
                min={0}
                max={duration || selectedTrack.durationSeconds || 30}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-800"
              />
              <div className="flex justify-between text-xs font-mono text-gray-500">
                <span>{formatSeconds(currentTime)}</span>
                <span>{formatSeconds(duration || selectedTrack.durationSeconds || 30)}</span>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSkipSeconds(-5)}
                  className="p-2.5 rounded-xl text-gray-700 hover:bg-gray-100 cursor-pointer"
                  title="5 soniya orqaga"
                >
                  <Rewind className="w-5 h-5" />
                </button>

                <button
                  onClick={handleTogglePlay}
                  className="p-4 rounded-full bg-teal-800 hover:bg-teal-900 text-white shadow-xs cursor-pointer transition-transform active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => handleSkipSeconds(5)}
                  className="p-2.5 rounded-xl text-gray-700 hover:bg-gray-100 cursor-pointer"
                  title="5 soniya oldinga"
                >
                  <FastForward className="w-5 h-5" />
                </button>
              </div>

              {/* Speeds */}
              <div className="flex items-center gap-1 bg-[#FAF9F5] p-1 rounded-xl border border-gray-200 text-xs font-semibold">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleChangeSpeed(rate)}
                    className={`px-2 py-1 rounded-lg cursor-pointer ${
                      playbackSpeed === rate
                        ? 'bg-teal-800 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {rate}×
                  </button>
                ))}
              </div>
            </div>

            {/* A-B Loop Section */}
            <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <Repeat className="w-4 h-4 text-teal-800" />
                <span className="font-semibold text-teal-950">A–B Takrorlash:</span>
                <span className="font-mono text-teal-800">
                  A: {loopA !== null ? formatSeconds(loopA) : '--:--'} | B:{' '}
                  {loopB !== null ? formatSeconds(loopB) : '--:--'}
                </span>
                {isLoopingAB && (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                    Loop faol
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSetPointA}
                  className="px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-teal-900 font-semibold hover:bg-teal-50 cursor-pointer"
                >
                  [A] boshlash
                </button>
                <button
                  onClick={handleSetPointB}
                  className="px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-teal-900 font-semibold hover:bg-teal-50 cursor-pointer"
                >
                  [B] tugash
                </button>
                {(loopA !== null || loopB !== null) && (
                  <button
                    onClick={handleClearLoop}
                    className="px-2 py-1 text-gray-500 hover:text-rose-600 cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                )}
              </div>
            </div>

            {/* Audio Bookmarks List */}
            <div className="space-y-2 pt-2 border-t border-[#E5E2D9]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-teal-700" /> Audio Bookmarks (Belgilar)
                </span>
                <button
                  onClick={() => setShowBookmarkInput(!showBookmarkInput)}
                  className="text-xs text-teal-800 font-semibold hover:underline cursor-pointer"
                >
                  + Belgi qo‘shish ({formatSeconds(currentTime)})
                </button>
              </div>

              {showBookmarkInput && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bookmarkLabel}
                    onChange={(e) => setBookmarkLabel(e.target.value)}
                    placeholder="Belgi nomi (masalan: 2-mashq boshlanishi)..."
                    className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                  <button
                    onClick={handleAddBookmark}
                    className="px-3 py-1.5 bg-teal-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Saqlash
                  </button>
                </div>
              )}

              {selectedTrack.bookmarks && selectedTrack.bookmarks.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedTrack.bookmarks.map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => handleSeek(bm.timeSeconds)}
                      className="px-2.5 py-1 rounded-lg bg-[#FAF9F5] border border-gray-200 text-xs text-gray-800 hover:border-teal-700 cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="font-mono text-teal-700 font-bold">
                        {formatSeconds(bm.timeSeconds)}
                      </span>
                      <span>{bm.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. TINGLASH REJIMLARI VA MASHQLAR */}
          <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-sm space-y-5">
            {/* Tabs */}
            <div className="flex border-b border-[#E5E2D9] gap-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('free')}
                className={`pb-2.5 border-b-2 cursor-pointer ${
                  activeTab === 'free'
                    ? 'border-teal-800 text-teal-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Erkin tinglash
              </button>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`pb-2.5 border-b-2 cursor-pointer ${
                  activeTab === 'transcript'
                    ? 'border-teal-800 text-teal-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Transkript bilan
              </button>
              <button
                onClick={() => setActiveTab('hidden_transcript')}
                className={`pb-2.5 border-b-2 cursor-pointer ${
                  activeTab === 'hidden_transcript'
                    ? 'border-teal-800 text-teal-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Yashirilgan transkript
              </button>
              <button
                onClick={() => setActiveTab('dictation')}
                className={`pb-2.5 border-b-2 cursor-pointer ${
                  activeTab === 'dictation'
                    ? 'border-teal-800 text-teal-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Diktant mashqi
              </button>
            </div>

            {/* Tab 1: Free */}
            {activeTab === 'free' && (
              <div className="py-4 text-center space-y-2 text-xs text-gray-500">
                <Headphones className="w-8 h-8 text-teal-800 mx-auto" />
                <p className="font-semibold text-gray-800">
                  Diqqatingizni faqat talaffuz va intonatsiyaga qarating.
                </p>
                <p>Audioni qayta-qayta eshiting, so‘zlarni daftarga yozib ko‘rishingiz mumkin.</p>
              </div>
            )}

            {/* Tab 2: With Transcript */}
            {activeTab === 'transcript' && (
              <div className="space-y-3">
                {selectedTrack.hasTranscript && selectedTrack.transcriptText ? (
                  <div className="p-4 rounded-xl bg-[#FAF9F5] border border-gray-200 font-serif text-sm leading-relaxed text-gray-800 whitespace-pre-line">
                    {selectedTrack.transcriptText}
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-xs text-gray-500">Ushbu trackda hozircha transkript yo‘q.</p>
                    <button
                      onClick={handleTranscribeWithAI}
                      disabled={transcribing}
                      className="px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      {transcribing ? 'Transkripsiya qilinmoqda...' : 'AI orqali transkripsiya qilish'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Hidden Transcript */}
            {activeTab === 'hidden_transcript' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Avval audioni 2 marta tinglang. So‘ngra matnni ochib, to‘g‘ri tushunganingizni tekshiring.
                </p>

                {isTranscriptRevealed ? (
                  <div className="p-4 rounded-xl bg-[#FAF9F5] border border-gray-200 font-serif text-sm leading-relaxed text-gray-800 whitespace-pre-line animate-in fade-in duration-200">
                    {selectedTrack.transcriptText || "Matn mavjud emas"}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-gray-100 border border-dashed border-gray-300 text-center space-y-3">
                    <p className="text-xs font-semibold text-gray-600">Matn yashirilgan</p>
                    <button
                      onClick={() => setIsTranscriptRevealed(true)}
                      className="px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Transkriptni Ko‘rish
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Dictation Exercise */}
            {activeTab === 'dictation' && (
              <div className="space-y-4">
                <div className="text-xs text-gray-600">
                  <span className="font-semibold text-gray-900">Diktant vazifasi:</span> Audioni tinglang va eshitgan gaplaringizni ingliz tilida yozing. So‘ngra tekshirish tugmasini bosing.
                </div>

                <textarea
                  rows={4}
                  value={dictationInput}
                  onChange={(e) => setDictationInput(e.target.value)}
                  placeholder="Eshitgan jumlalaringizni shu yerga yozing..."
                  className="w-full p-3.5 bg-white border border-[#D5D1C6] rounded-xl text-sm font-serif text-gray-900 leading-relaxed focus:ring-1 focus:ring-teal-700"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleCheckDictation}
                    disabled={!dictationInput.trim()}
                    className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-40"
                  >
                    Diktantni Tekshirish
                  </button>
                </div>

                {/* Dictation Evaluation Output */}
                {dictationResult && (
                  <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E5E2D9] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 uppercase tracking-wider">
                        Diktant Natijasi:
                      </span>
                      <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                        Aniqlik: {dictationResult.accuracyScore}%
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-sm font-serif">
                      {dictationResult.wordDifferences.map((item, i) => (
                        <span
                          key={i}
                          className={`px-1.5 py-0.5 rounded ${
                            item.status === 'correct'
                              ? 'bg-emerald-100 text-emerald-900'
                              : item.status === 'missing'
                              ? 'bg-amber-100 text-amber-900 line-through'
                              : item.status === 'extra'
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-rose-100 text-rose-900 font-semibold'
                          }`}
                        >
                          {item.word}
                        </span>
                      ))}
                    </div>

                    <p className="text-[11px] text-gray-500">
                      Yashil — to‘g‘ri, sariq chiziqli — tushib qolgan so‘z, qizil — orfografik yoki ortiqcha so‘z.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Upload Modal for MP3/WAV/M4A */}
      <FileUploadModal
        category="audio"
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFileProcessed={(file) => {
          const suggestedLabel = parseSuggestedTrackLabel(file.name) || '1.1';
          const newAsset: AudioAsset = {
            id: `aud_${Date.now()}`,
            ownerId,
            title: file.name.replace(/\.[^/.]+$/, ''),
            originalFilename: file.name,
            trackLabel: suggestedLabel, // STRICTLY string
            normalizedTrackLabel: suggestedLabel.toLowerCase(),
            storagePath: file.content, // data URL
            mimeType: file.mimeType || 'audio/mp3',
            sizeBytes: file.size,
            durationSeconds: 45,
            hasTranscript: false,
            transcriptStatus: 'none',
            transcriptAlignmentLevel: 'none',
            bookmarks: [],
            processingStatus: 'ready',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveAudioAsset(newAsset);
          loadData();
          setSelectedTrackId(newAsset.id);
        }}
      />
    </div>
  );
};
