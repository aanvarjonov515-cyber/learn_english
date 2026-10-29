import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ReadingDocument,
  ReadingToken,
  ReaderTheme,
  ReaderFontSize,
  DictionaryLookupResult,
} from '../../types';
import {
  getReadingDocuments,
  saveReadingDocument,
  deleteReadingDocument,
  getKnownWords,
  toggleKnownWord,
} from '../../services/storage';
import { tokenizeText, ParagraphBlock } from '../../services/tokenizer';
import { DictionaryPopup } from './DictionaryPopup';
import { AddToVocabModal } from './AddToVocabModal';
import { ReaderAudioBar } from './ReaderAudioBar';
import { MediaPanel } from '../media/MediaPanel';
import { FileUploadModal } from '../common/FileUploadModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ContextMenu } from '../common/ContextMenu';
import { speakEnglishText, stopCurrentAudio } from '../../services/audio';
import { playbackController } from '../../services/audioEngine';
import { PlaybackState } from '../../types';
import {
  BookOpen,
  Plus,
  Upload,
  ArrowLeft,
  Volume2,
  Bookmark,
  CheckCircle2,
  Trash2,
  Clock,
  Sparkles,
  Settings,
  Type,
  Sun,
  Moon,
  Coffee,
  HelpCircle,
  MoreVertical,
} from 'lucide-react';

interface ReaderViewProps {
  ownerId: string;
}

export const ReaderView: React.FC<ReaderViewProps> = ({ ownerId }) => {
  const [documents, setDocuments] = useState<ReadingDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  // Reader Settings
  const [theme, setTheme] = useState<ReaderTheme>('warm');
  const [fontSize, setFontSize] = useState<ReaderFontSize>('base');

  // Token & Popup states
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    sentence: string;
    position: { x: number; y: number } | null;
  } | null>(null);

  // Selected phrase lookup state
  const [selectedPhrase, setSelectedPhrase] = useState<{
    phrase: string;
    sentence: string;
    position: { x: number; y: number } | null;
  } | null>(null);

  // Add to vocab modal
  const [addToVocabData, setAddToVocabData] = useState<DictionaryLookupResult | null>(null);

  // New text modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newLevel, setNewLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1'>('A2');
  const [newText, setNewText] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [knownWords, setKnownWords] = useState<Set<string>>(new Set());
  const [playbackState, setPlaybackState] = useState<PlaybackState>(playbackController.getState());
  const [importMode, setImportMode] = useState<'manual' | 'url'>('manual');
  const [importUrl, setImportUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; docId: string | null }>({ isOpen: false, x: 0, y: 0, docId: null });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; docId: string | null }>({ isOpen: false, docId: null });

  // Text container ref for position restoration
  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Load documents and known words
  useEffect(() => {
    setDocuments(getReadingDocuments());
    setKnownWords(getKnownWords());

    return playbackController.subscribe((st) => {
      setPlaybackState(st);
    });
  }, []);

  const activeDoc = useMemo(() => {
    return documents.find((d) => d.id === activeDocId) || null;
  }, [documents, activeDocId]);

  // Tokenize paragraphs with memoization
  const paragraphBlocks: ParagraphBlock[] = useMemo(() => {
    if (!activeDoc) return [];
    return tokenizeText(activeDoc.id, activeDoc.text, activeDoc.contentVersion);
  }, [activeDoc?.id, activeDoc?.text, activeDoc?.contentVersion]);

  // Flatten all sentences in order
  const allSentences = useMemo(() => {
    return paragraphBlocks.flatMap((p) => p.sentences);
  }, [paragraphBlocks]);

  // Load sentences into playbackController when active document changes
  useEffect(() => {
    if (activeDoc && allSentences.length > 0) {
      playbackController.loadDocument(activeDoc.id, allSentences, 0, activeDoc.contentVersion);
    } else {
      playbackController.stop();
    }
  }, [activeDoc?.id, allSentences.length]);

  // Handle auto-scroll to active sentence if enabled
  useEffect(() => {
    if (playbackState.isPlaying && playbackState.autoScroll && playbackState.activeSentenceId) {
      const el = document.getElementById(playbackState.activeSentenceId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [playbackState.activeSentenceId, playbackState.isPlaying, playbackState.autoScroll]);

  // Restore reading scroll position when opening a document
  useEffect(() => {
    if (!activeDoc || !readerContainerRef.current) return;
    if (activeDoc.progress?.paragraphId) {
      const el = document.getElementById(activeDoc.progress.paragraphId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeDocId]);

  // Clean audio on doc exit
  useEffect(() => {
    return () => {
      playbackController.stop();
      stopCurrentAudio();
    };
  }, [activeDocId]);

  const scrollToActiveSentence = () => {
    if (playbackState.activeSentenceId) {
      const el = document.getElementById(playbackState.activeSentenceId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Handle word click (Requirement 12: Pauses main audio when word lookup opens)
  const handleWordClick = (
    token: ReadingToken,
    sentenceText: string,
    e: React.MouseEvent
  ) => {
    if (token.tokenType !== 'word') return;

    if (playbackState.isPlaying) {
      playbackController.pause();
    }

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setSelectedPhrase(null);
    setSelectedWord({
      word: token.cleanWord,
      sentence: sentenceText,
      position: { x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY },
    });
  };

  // Handle phrase selection (highlighting text with mouse)
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (text.split(/\s+/).length >= 2 && text.length <= 50) {
      // Find parent sentence if possible
      const node = selection.anchorNode;
      const sentenceEl = node?.parentElement?.closest('[data-sentence]');
      const sentenceText =
        sentenceEl?.getAttribute('data-sentence') || activeDoc?.text.slice(0, 200) || text;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedWord(null);
      setSelectedPhrase({
        phrase: text,
        sentence: sentenceText,
        position: { x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY },
      });
    }
  };

  // Toggle Known status
  const handleToggleKnown = (word: string) => {
    toggleKnownWord(word);
    setKnownWords(getKnownWords());
  };

  // Save new reading document
  const handleCreateDocument = () => {
    if (!newTitle.trim() || !newText.trim()) {
      alert("Iltimos, sarlavha va matnni to'ldiring.");
      return;
    }

    const docId = `doc_${Date.now()}`;
    const wordCount = newText.trim().split(/\s+/).length;
    const nowIso = new Date().toISOString();

    const doc: ReadingDocument = {
      id: docId,
      ownerId,
      title: newTitle.trim(),
      author: newAuthor.trim() || undefined,
      estimatedLevel: newLevel,
      text: newText.trim(),
      wordCount,
      contentVersion: 1,
      processingStatus: 'ready',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    saveReadingDocument(doc);
    setDocuments(getReadingDocuments());
    setShowAddModal(false);
    setNewTitle('');
    setNewAuthor('');
    setNewText('');
    setActiveDocId(docId);
  };

  const handleContextMenu = (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, docId });
  };

  const initiateDelete = (docId: string) => {
    setConfirmDialog({ isOpen: true, docId });
  };

  const performDelete = () => {
    if (!confirmDialog.docId) return;
    const docId = confirmDialog.docId;

    if (activeDocId === docId) {
      playbackController.stop();
      stopCurrentAudio();
      setActiveDocId(null);
    }
    deleteReadingDocument(docId);
    setDocuments(getReadingDocuments());
    setConfirmDialog({ isOpen: false, docId: null });
    alert("Material o'chirildi.");
  };

  const handleDeleteDocument = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    initiateDelete(id);
  };

  // Theme styling helpers
  const getThemeClasses = () => {
    switch (theme) {
      case 'warm':
        return 'bg-[#FAF9F5] text-[#1F2937] border-[#E5E2D9]';
      case 'night':
        return 'bg-[#0F172A] text-[#E2E8F0] border-slate-800';
      case 'light':
        return 'bg-[#FFFFFF] text-[#111827] border-gray-200';
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'sm':
        return 'text-base leading-relaxed';
      case 'base':
        return 'text-lg leading-loose';
      case 'lg':
        return 'text-xl leading-loose';
      case 'xl':
        return 'text-2xl leading-loose';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. DOCUMENT LIBRARY VIEW */}
      {!activeDoc && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D9]">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">
                Kitob va Matn O'qish
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Inglizcha matnlarni o'qing, istalgan so'zga bosib shu gapdagi aniq ma'nosini ko'ring va lug'atingizga qo'shing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> TXT Yuklash
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-xs font-semibold text-white transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Yangi Matn Qo'shish
              </button>
            </div>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setActiveDocId(doc.id)}
                onContextMenu={(e) => handleContextMenu(e, doc.id)}
                className="bg-white border border-[#E5E2D9] rounded-2xl p-5 shadow-2xs hover:border-teal-700 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                      Daraja: {doc.estimatedLevel || 'A2'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e as any, doc.id);
                      }}
                      className="text-gray-400 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100 transition-colors"
                      title="Menyu"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-serif font-bold text-base text-gray-900 group-hover:text-teal-800 transition-colors">
                    {doc.title}
                  </h3>

                  {doc.author && (
                    <p className="text-xs text-gray-500 italic">Muallif: {doc.author}</p>
                  )}

                  <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                    {doc.text}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-between text-xs text-gray-500">
                  <span>{doc.wordCount} ta so'z</span>
                  <span className="font-semibold text-teal-800 flex items-center gap-1">
                    Mutolaa qilish &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ACTIVE READER VIEW */}
      {activeDoc && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Top Reader Controls Bar */}
          <div className="bg-white border border-[#E5E2D9] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <button
              onClick={() => setActiveDocId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Kutubxonaga qaytish
            </button>

            {/* Formatting & Theme controls */}
            <div className="flex items-center gap-4">
              {/* Theme Picker */}
              <div className="flex items-center gap-1 bg-[#FAF9F5] p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setTheme('warm')}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    theme === 'warm' ? 'bg-amber-100 text-amber-900 font-bold' : 'text-gray-600'
                  }`}
                  title="Qog'oz mavzusi"
                >
                  <Coffee className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    theme === 'light' ? 'bg-white text-gray-900 font-bold shadow-2xs' : 'text-gray-600'
                  }`}
                  title="Oq mavzu"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTheme('night')}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    theme === 'night' ? 'bg-slate-800 text-white font-bold' : 'text-gray-600'
                  }`}
                  title="Tungi mavzu"
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>

              {/* Font Size */}
              <div className="flex items-center gap-1 bg-[#FAF9F5] p-1 rounded-xl border border-gray-200 text-xs font-semibold">
                {(['sm', 'base', 'lg', 'xl'] as ReaderFontSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`px-2 py-1 rounded-lg uppercase cursor-pointer ${
                      fontSize === size ? 'bg-teal-800 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stage 13: Reusable Media Panel */}
          <MediaPanel
            avatarState={playbackState.isPlaying ? 'speaking' : 'idle'}
            isPlaying={playbackState.isPlaying}
            currentSubtitles={allSentences[playbackState.activeSegmentIndex]?.text}
          />

          {/* Stage 7: Natural TTS Reader Audio Bar */}
          <ReaderAudioBar
            totalSentences={allSentences.length}
            currentSentenceNumber={playbackState.activeSegmentIndex + 1}
            onScrollToActiveSentence={scrollToActiveSentence}
          />

          {/* Reader Document Header */}
          <div className="text-center space-y-1.5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              CEFR {activeDoc.estimatedLevel || 'A2'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
              {activeDoc.title}
            </h1>
            {activeDoc.author && (
              <p className="text-xs text-gray-500 italic">Muallif: {activeDoc.author}</p>
            )}
            <p className="text-[11px] text-gray-400">
              Maslahat: So'z ustiga bir marta bosing yoki iboralarni belgilang.
            </p>
          </div>

          {/* Reader Main Content Container */}
          <div
            ref={readerContainerRef}
            onMouseUp={handleTextSelection}
            className={`rounded-2xl p-6 sm:p-12 border shadow-sm transition-colors max-w-2xl mx-auto ${getThemeClasses()}`}
          >
            <div className={`font-serif space-y-6 ${getFontSizeClass()}`}>
              {paragraphBlocks.map((para) => (
                <p key={para.id} id={para.id} className="text-justify leading-relaxed">
                  {para.sentences.map((sent) => {
                    const isSentenceActive = playbackState.activeSentenceId === sent.id;
                    return (
                      <span
                        key={sent.id}
                        id={sent.id}
                        data-sentence={sent.text}
                        className={`transition-colors duration-200 rounded px-0.5 ${
                          isSentenceActive
                            ? 'bg-amber-100 text-amber-950 border-b-2 border-amber-600 font-normal'
                            : ''
                        }`}
                      >
                        {sent.tokens.map((token) => {
                        if (token.tokenType === 'whitespace') {
                          return <span key={token.tokenId}>{token.surfaceForm}</span>;
                        }
                        if (token.tokenType === 'punctuation') {
                          return <span key={token.tokenId}>{token.surfaceForm}</span>;
                        }

                        const isWordSelected = selectedWord?.word === token.cleanWord;
                        const isWordKnown = knownWords.has(token.cleanWord);

                        return (
                          <span
                            key={token.tokenId}
                            onClick={(e) => handleWordClick(token, sent.text, e)}
                            className={`cursor-pointer rounded-xs px-0.5 transition-all select-text hover:bg-teal-200/50 hover:underline decoration-teal-600 decoration-1 underline-offset-3 ${
                              isWordSelected
                                ? 'bg-amber-300 text-gray-950 font-medium'
                                : isWordKnown
                                ? 'text-teal-900 font-normal'
                                : ''
                            }`}
                          >
                            {token.surfaceForm}
                          </span>
                        );
                      })}
                    </span>
                  );
                })}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DICTIONARY POPUP (Single Word Lookup) */}
      {selectedWord && (
        <DictionaryPopup
          word={selectedWord.word}
          contextSentence={selectedWord.sentence}
          position={selectedWord.position}
          isKnown={knownWords.has(selectedWord.word.toLowerCase())}
          onToggleKnown={handleToggleKnown}
          onAddToVocabulary={(data) => setAddToVocabData(data)}
          onClose={() => setSelectedWord(null)}
        />
      )}

      {/* PHRASE DICTIONARY POPUP (Multi-word Lookup) */}
      {selectedPhrase && (
        <DictionaryPopup
          word={selectedPhrase.phrase}
          phrase={selectedPhrase.phrase}
          contextSentence={selectedPhrase.sentence}
          position={selectedPhrase.position}
          isKnown={false}
          onToggleKnown={handleToggleKnown}
          onAddToVocabulary={(data) => setAddToVocabData(data)}
          onClose={() => setSelectedPhrase(null)}
        />
      )}

      {/* ADD TO VOCABULARY MODAL */}
      {addToVocabData && activeDoc && (
        <AddToVocabModal
          ownerId={ownerId}
          lookupData={addToVocabData}
          documentTitle={activeDoc.title}
          documentId={activeDoc.id}
          isOpen={Boolean(addToVocabData)}
          onClose={() => setAddToVocabData(null)}
          onAdded={() => {
            alert("So'z muvaffaqiyatli lug'atingizga qo'shildi!");
          }}
        />
      )}

      {/* NEW DOCUMENT CREATION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FAF9F5] border border-[#E5E2D9] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-serif font-bold text-lg text-gray-900">
              Yangi Inglizcha Matn Qo'shish
            </h3>

            {/* Import Mode Toggle */}
            <div className="flex bg-gray-200 p-1 rounded-xl text-xs">
              <button
                className={`flex-1 py-1.5 rounded-lg font-semibold ${
                  importMode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
                onClick={() => setImportMode('manual')}
              >
                Qo‘lda kiritish
              </button>
              <button
                className={`flex-1 py-1.5 rounded-lg font-semibold ${
                  importMode === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
                onClick={() => setImportMode('url')}
              >
                Havola orqali (URL)
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {importMode === 'url' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-gray-700 uppercase mb-1">Havola (URL) *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 bg-white border border-[#D5D1C6] rounded-xl text-gray-900"
                      />
                      <button
                        onClick={async () => {
                          if (!importUrl) return;
                          setIsFetchingUrl(true);
                          try {
                            const res = await fetch('/api/reader/fetch-url', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ url: importUrl }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              setNewTitle(data.title);
                              setNewText(data.text);
                            } else {
                              alert(data.error || 'Xatolik yuz berdi');
                            }
                          } catch (e) {
                            alert('Xatolik: ' + e);
                          } finally {
                            setIsFetchingUrl(false);
                          }
                        }}
                        disabled={isFetchingUrl}
                        className="px-4 py-2 bg-gray-800 text-white rounded-xl font-semibold cursor-pointer"
                      >
                        {isFetchingUrl ? '...' : 'Yuklash'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Matn sarlavhasi *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Masalan: The Old Library, Travel in London..."
                  className="w-full px-3 py-2 bg-white border border-[#D5D1C6] rounded-xl text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 uppercase mb-1">
                    Muallif (Ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="Masalan: Arthur Conan Doyle"
                    className="w-full px-3 py-2 bg-white border border-[#D5D1C6] rounded-xl text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 uppercase mb-1">
                    Taxminiy Daraja
                  </label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#D5D1C6] rounded-xl text-gray-900"
                  >
                    <option value="A1">A1 (Beginner)</option>
                    <option value="A2">A2 (Elementary)</option>
                    <option value="B1">B1 (Intermediate)</option>
                    <option value="B2">B2 (Upper-Intermediate)</option>
                    <option value="C1">C1 (Advanced)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Inglizcha Matn *
                </label>
                <textarea
                  rows={8}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Matnni shu yerga kiriting yoki joylashtiring..."
                  className="w-full p-3 bg-white border border-[#D5D1C6] rounded-xl text-sm font-serif leading-relaxed text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E2D9]">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => {
                  handleCreateDocument();
                  // Additional: Start playback immediately
                }}
                disabled={!newTitle.trim() || !newText.trim()}
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                ▶ Run — O'qishni boshlash
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu.isOpen && contextMenu.docId && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
          actions={[
            { label: 'O‘chirish', icon: <Trash2 className="w-4 h-4" />, onClick: () => initiateDelete(contextMenu.docId!), danger: true }
          ]}
        />
      )}

      {confirmDialog.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={documents.find(d => d.id === confirmDialog.docId)?.title || 'Material'}
          onConfirm={performDelete}
          onCancel={() => setConfirmDialog({ isOpen: false, docId: null })}
        />
      )}

      {/* File Upload Modal for TXT */}
      <FileUploadModal
        category="text"
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFileProcessed={(file) => {
          setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
          setNewText(file.content);
          setShowAddModal(true);
        }}
      />
    </div>
  );
};
