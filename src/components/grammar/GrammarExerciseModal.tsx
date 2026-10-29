import React, { useState, useEffect } from 'react';
import { GrammarExercise, AudioAsset, AudioTrackMapping } from '../../types';
import { getAudioAssets } from '../../services/listeningStorage';
import {
  getMappingForExercise,
  logExerciseAudioEvidence,
} from '../../services/mappingStorage';
import { playbackController } from '../../services/audioEngine';
import { AudioTrackMappingModal } from './AudioTrackMappingModal';
import {
  PenTool,
  Volume2,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  X,
  Play,
  Pause,
  RotateCcw,
  Link2,
  Eye,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface GrammarExerciseModalProps {
  exercise: GrammarExercise;
  bookId: string;
  bookTitle: string;
  bookEdition?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveAnswer: (exerciseId: string, answer: string) => void;
}

export const GrammarExerciseModal: React.FC<GrammarExerciseModalProps> = ({
  exercise,
  bookId,
  bookTitle,
  bookEdition,
  isOpen,
  onClose,
  onSaveAnswer,
}) => {
  const [userAnswer, setUserAnswer] = useState(exercise.userDraftAnswer || '');
  const [showSolution, setShowSolution] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [listenCount, setListenCount] = useState(0);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [currentMapping, setCurrentMapping] = useState<AudioTrackMapping | null>(null);
  const [teacherInterrupted, setTeacherInterrupted] = useState(false);

  const audioTracks = getAudioAssets();

  useEffect(() => {
    if (isOpen) {
      const mapping = getMappingForExercise(exercise.id) || null;
      setCurrentMapping(mapping);
      setUserAnswer(exercise.userDraftAnswer || '');
      setShowSolution(false);
      setShowTranscript(false);
      setIsPlayingAudio(false);
      setTeacherInterrupted(false);
    }
  }, [isOpen, exercise.id]);

  if (!isOpen) return null;

  const linkedTrack: AudioAsset | undefined = currentMapping?.audioAssetId
    ? audioTracks.find((t) => t.id === currentMapping.audioAssetId)
    : audioTracks.find(
        (t) =>
          t.id === exercise.linkedAudioAssetId ||
          t.trackLabel === exercise.linkedTrackLabel
      );

  const handlePlayListening = async () => {
    if (isPlayingAudio) {
      playbackController.stop();
      setIsPlayingAudio(false);
      return;
    }

    setTeacherInterrupted(true);
    setIsPlayingAudio(true);
    setListenCount((c) => c + 1);

    // Mutual exclusion: Stop any Teacher speech before starting listening!
    playbackController.stopTeacherVoice();

    const start = currentMapping?.startSeconds;
    const end = currentMapping?.endSeconds;

    const played = await playbackController.playListeningTrack({
      audioUrl: linkedTrack?.storagePath,
      fallbackText:
        linkedTrack?.transcriptText ||
        exercise.contentText.slice(0, 300) ||
        `Listening exercise. Track ${linkedTrack?.trackLabel || '1.1'}.`,
      startSeconds: start,
      endSeconds: end,
      onEnded: () => {
        setIsPlayingAudio(false);
      },
    });

    if (!played) {
      setIsPlayingAudio(false);
    }

    // Evidence log
    logExerciseAudioEvidence({
      id: `ev_${Date.now()}`,
      exerciseId: exercise.id,
      audioAssetId: linkedTrack?.id || 'synthetic_fallback',
      mappingId: currentMapping?.id || 'unmapped',
      playStartedAt: new Date().toISOString(),
      listenedIntervals: [{ start: start || 0, end: end || 30 }],
      totalListenedSeconds: (end || 30) - (start || 0),
      seekCount: 0,
      replayCount: listenCount,
      transcriptOpened: showTranscript,
      helpUsed: showSolution,
    });
  };

  const handleRevealTranscript = () => {
    setShowTranscript(true);
    logExerciseAudioEvidence({
      id: `ev_tr_${Date.now()}`,
      exerciseId: exercise.id,
      audioAssetId: linkedTrack?.id || 'synthetic_fallback',
      mappingId: currentMapping?.id || 'unmapped',
      playStartedAt: new Date().toISOString(),
      listenedIntervals: [],
      totalListenedSeconds: 0,
      seekCount: 0,
      replayCount: listenCount,
      transcriptOpened: true,
      helpUsed: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveAnswer(exercise.id, userAnswer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-[#FAF9F5] border border-[#E5E2D9] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-teal-800" />
            <div>
              <h3 className="font-serif font-bold text-base text-gray-900">
                {exercise.exerciseNumber}-Mashq (Sahifa: {exercise.printedPageLabel})
              </h3>
              <p className="text-[11px] text-gray-500">{bookTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instruction & Content */}
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-white border border-[#E5E2D9] rounded-xl space-y-1">
            <span className="font-semibold text-gray-500 uppercase text-[10px]">
              Ko‘rsatma:
            </span>
            <p className="font-semibold text-gray-900">{exercise.instruction}</p>
          </div>

          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-serif text-sm leading-relaxed text-gray-800 whitespace-pre-line">
            {exercise.contentText}
          </div>

          {/* 10-bosqich: Mapped Listening Audio Bar & Lesson Flow */}
          {(exercise.exerciseType === 'listening' ||
            linkedTrack ||
            exercise.linkedTrackLabel ||
            currentMapping) && (
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-teal-800" />
                  <span className="font-semibold text-teal-900 text-xs">
                    Tinglash audiosi: Track{' '}
                    {currentMapping?.trackLabel ||
                      exercise.linkedTrackLabel ||
                      linkedTrack?.trackLabel ||
                      '1.03'}
                  </span>
                  {currentMapping ? (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        currentMapping.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {currentMapping.status === 'confirmed'
                        ? 'Tasdiqlangan'
                        : currentMapping.status}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold uppercase">
                      Biriktirilmagan
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowMappingModal(true)}
                  className="text-xs text-teal-800 hover:text-teal-950 font-semibold flex items-center gap-1 cursor-pointer underline"
                >
                  <Link2 className="w-3.5 h-3.5" /> Biriktirish
                </button>
              </div>

              {/* Playback Controls & Listen Counter */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-teal-100">
                <button
                  type="button"
                  onClick={handlePlayListening}
                  className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pauza</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {listenCount === 0
                          ? 'Tinglashni boshlash (1-tinglash)'
                          : `Qayta tinglash (${listenCount + 1}-marta)`}
                      </span>
                    </>
                  )}
                </button>

                {currentMapping?.startSeconds !== undefined &&
                  currentMapping?.endSeconds !== undefined && (
                    <span className="text-[10px] text-teal-700 font-medium">
                      Oraliq: {currentMapping.startSeconds}s – {currentMapping.endSeconds}s
                    </span>
                  )}
              </div>

              {/* Teacher Interruption Status Notice */}
              {teacherInterrupted && !isPlayingAudio && (
                <div className="p-2 rounded-lg bg-teal-100/60 border border-teal-200 text-[11px] text-teal-900 flex items-center justify-between">
                  <span>Listening yakunlandi. Teacher bilan davom etishga tayyormisiz?</span>
                  <button
                    type="button"
                    onClick={() => {
                      playbackController.playTeacherVoice(
                        'Ajoyib! Endi javobingizni tekshirib ko‘ramiz.'
                      );
                      setTeacherInterrupted(false);
                    }}
                    className="px-2 py-0.5 rounded-md bg-teal-800 text-white font-semibold text-[10px] hover:bg-teal-900 cursor-pointer"
                  >
                    Teacher bilan davom etish
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User Answer Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block font-semibold text-gray-700 uppercase mb-1 text-[11px]">
                Sizning javobingiz:
              </label>
              <textarea
                rows={3}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Savollarga javobingizni yozing..."
                className="w-full p-3 bg-white border border-[#D5D1C6] rounded-xl text-xs font-serif text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
              />
            </div>

            {/* Answer Key & AI Solution Distinction */}
            {showSolution && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                {exercise.officialAnswerKey && (
                  <div>
                    <span className="font-bold text-[10px] text-amber-900 uppercase">
                      Kitobdagi rasmiy javob kaliti:
                    </span>
                    <p className="font-semibold text-amber-950 font-serif">
                      {exercise.officialAnswerKey}
                    </p>
                  </div>
                )}
                {exercise.aiSuggestedSolution && (
                  <div>
                    <span className="font-bold text-[10px] text-teal-900 uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" /> AI Teacher taklif qilgan yechim:
                    </span>
                    <p className="text-gray-800 font-serif">
                      {exercise.aiSuggestedSolution}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Optional Transcript Section (Logged as assistance) */}
            {showTranscript && linkedTrack?.transcriptText && (
              <div className="p-3 bg-gray-100 border border-gray-300 rounded-xl space-y-1 animate-in fade-in">
                <span className="text-[10px] font-bold text-gray-600 uppercase flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Audio Transkripti (Yordam tariqasida ochildi):
                </span>
                <p className="text-xs text-gray-800 font-serif leading-relaxed italic">
                  "{linkedTrack.transcriptText}"
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSolution(!showSolution)}
                  className="text-xs text-amber-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showSolution ? 'Yechimni yashirish' : 'Yechim / Javob kaliti'}</span>
                </button>

                {!showTranscript && linkedTrack?.transcriptText && (
                  <button
                    type="button"
                    onClick={handleRevealTranscript}
                    className="text-xs text-gray-500 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Transcriptni ochish</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Yopish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Javobni Saqlash
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Audio Track Mapping Modal */}
      {showMappingModal && (
        <AudioTrackMappingModal
          exercise={exercise}
          bookId={bookId}
          bookTitle={bookTitle}
          bookEdition={bookEdition}
          isOpen={showMappingModal}
          onClose={() => setShowMappingModal(false)}
          onMappingUpdated={(newMap) => {
            setCurrentMapping(newMap);
          }}
        />
      )}
    </div>
  );
};
