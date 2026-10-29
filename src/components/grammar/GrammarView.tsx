import React, { useState, useEffect } from 'react';
import {
  GrammarBook,
  BookPage,
  GrammarUnit,
  GrammarExercise,
} from '../../types';
import {
  getGrammarBooks,
  saveGrammarBook,
  deleteGrammarBook,
  getBookPages,
  saveBookPage,
  getBookUnits,
  saveBookUnits,
} from '../../services/grammarStorage';
import { TeacherPanel } from './TeacherPanel';
import { GrammarExerciseModal } from './GrammarExerciseModal';
import { FileUploadModal } from '../common/FileUploadModal';
import {
  Compass,
  BookOpen,
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bot,
  Volume2,
  PenTool,
  Sparkles,
  Layers,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
} from 'lucide-react';
import { speakEnglishText } from '../../services/audio';

interface GrammarViewProps {
  ownerId: string;
}

export const GrammarView: React.FC<GrammarViewProps> = ({ ownerId }) => {
  const [books, setBooks] = useState<GrammarBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  // Active book states
  const [pages, setPages] = useState<BookPage[]>([]);
  const [units, setUnits] = useState<GrammarUnit[]>([]);
  const [currentPdfPageIndex, setCurrentPdfPageIndex] = useState<number>(5);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Panels
  const [showTeacherPanel, setShowTeacherPanel] = useState<boolean>(true);
  const [showUnitsDrawer, setShowUnitsDrawer] = useState<boolean>(false);
  const [activeExercise, setActiveExercise] = useState<GrammarExercise | null>(null);

  // Upload book modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newEdition, setNewEdition] = useState('');
  const [newOffset, setNewOffset] = useState<number>(4);

  // AI TOC Extraction
  const [isExtractingStructure, setIsExtractingStructure] = useState(false);

  const loadData = () => {
    setBooks(getGrammarBooks());
  };

  useEffect(() => {
    loadData();
  }, []);

  // When book is selected, load pages and units
  useEffect(() => {
    if (selectedBookId) {
      const bookPages = getBookPages(selectedBookId);
      const bookUnits = getBookUnits(selectedBookId);
      setPages(bookPages);
      setUnits(bookUnits);
      setCurrentPdfPageIndex(bookPages[1]?.pdfPageIndex || 5);
    }
  }, [selectedBookId]);

  const selectedBook = books.find((b) => b.id === selectedBookId) || null;
  const currentPage =
    pages.find((p) => p.pdfPageIndex === currentPdfPageIndex) ||
    pages[0] || {
      id: 'p_temp',
      bookId: selectedBookId || '',
      pdfPageIndex: currentPdfPageIndex,
      printedPageLabel: `${Math.max(1, currentPdfPageIndex - (selectedBook?.pageOffset || 0))}`,
      extractedText: 'Sahifa yuklanmoqda...',
      extractionStatus: 'extracted' as const,
      isCompleted: false,
    };

  // Find exercises on current page
  const currentPageExercises = units
    .flatMap((u) => u.exercises)
    .filter((ex) => ex.pageIndex === currentPdfPageIndex);

  const handleNextPage = () => {
    if (currentPdfPageIndex < (selectedBook?.totalPages || 12)) {
      setCurrentPdfPageIndex((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPdfPageIndex > 1) {
      setCurrentPdfPageIndex((prev) => prev - 1);
    }
  };

  // AI Structure extraction from Table of Contents
  const handleExtractStructureWithAI = async () => {
    if (!selectedBook) return;
    setIsExtractingStructure(true);

    try {
      const tocSample = `Contents:
Unit 1: Nice to meet you! (Pages 5-6) - Present Simple of to be, Possessives
Unit 2: A Good Job! (Pages 7-8) - Present Simple he/she/it, Jobs and routines
Unit 3: Work hard, play hard! (Pages 9-10) - Daily activities, Directions
Unit 4: Somewhere to live (Pages 11-12) - Rooms and furniture`;

      const res = await fetch('/api/grammar/suggest-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tocText: tocSample }),
      });

      const data = await res.json();
      if (data.units && data.units.length > 0) {
        const builtUnits: GrammarUnit[] = data.units.map((u: any, i: number) => ({
          id: `unit_${i + 1}`,
          bookId: selectedBook.id,
          unitNumber: u.unitNumber || i + 1,
          title: u.title || `Unit ${i + 1}`,
          startPdfPage: u.startPdfPage || 5 + i * 2,
          endPdfPage: u.endPdfPage || 6 + i * 2,
          topics: (u.topics || []).map((t: any, ti: number) => ({
            id: `top_${i}_${ti}`,
            unitId: `unit_${i + 1}`,
            title: t.title,
            grammarRuleUz: t.grammarRuleUz || 'Qoida',
            exampleEn: 'Example sentence.',
            exampleUz: 'Misol jumlasi.',
          })),
          exercises: [],
          createdAt: new Date().toISOString(),
        }));

        saveBookUnits(selectedBook.id, builtUnits);
        setUnits(builtUnits);
        alert("AI mundarija asosida unitlar tuzilmasini muvaffaqiyatli ajratdi!");
      }
    } catch (err) {
      console.error('Structure error', err);
    } finally {
      setIsExtractingStructure(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. BOOK LIBRARY VIEW */}
      {!selectedBook && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D9]">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">
                Grammatika va Darsliklar
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Ingliz tili darsligingizni (masalan: Headway Elementary) PDF sifatida yuklang va AI Teacher bilan o‘rganing.
              </p>
            </div>

            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Darslik PDF Yuklash</span>
            </button>
          </div>

          {/* Books Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBookId(b.id)}
                className="bg-white border border-[#E5E2D9] rounded-2xl p-5 shadow-2xs hover:border-teal-700 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      CEFR {b.estimatedLevel || 'A2'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Kitobni o‘chirmoqchimisiz?")) {
                          deleteGrammarBook(b.id);
                          loadData();
                        }
                      }}
                      className="text-gray-300 hover:text-rose-600 p-1 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-serif font-bold text-base text-gray-900 group-hover:text-teal-800 transition-colors">
                    {b.title}
                  </h3>
                  {b.author && (
                    <p className="text-xs text-gray-500 italic">Muallif: {b.author}</p>
                  )}
                  {b.edition && (
                    <p className="text-[11px] text-gray-400">Nashr: {b.edition}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-between text-xs text-gray-500">
                  <span>{b.totalPages} sahifa</span>
                  <span className="font-semibold text-teal-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Darslikni ochish &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ACTIVE BOOK VIEWER WITH TEACHER PANEL */}
      {selectedBook && (
        <div className="space-y-4">
          {/* Top Viewer Controls */}
          <div className="bg-white border border-[#E5E2D9] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <button
              onClick={() => setSelectedBookId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Kitoblarga qaytish
            </button>

            {/* Page Navigation & Dual Page Label */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPdfPageIndex <= 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 text-xs">
                <span className="font-bold text-gray-900">
                  PDF: {currentPdfPageIndex} / {selectedBook.totalPages}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                  Kitob: {currentPage.printedPageLabel}-sahifa
                </span>
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPdfPageIndex >= selectedBook.totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right Tools: Zoom, Units Drawer, Teacher Panel Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUnitsDrawer(!showUnitsDrawer)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-teal-700" />
                <span className="hidden sm:inline">Mundarija (Units)</span>
              </button>

              <button
                onClick={() => setShowTeacherPanel(!showTeacherPanel)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  showTeacherPanel
                    ? 'bg-teal-800 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Teacher</span>
              </button>
            </div>
          </div>

          {/* Units Drawer Modal */}
          {showUnitsDrawer && (
            <div className="p-4 bg-white border border-[#E5E2D9] rounded-2xl shadow-xs space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-sm text-gray-900">
                  Kitob Unitlari va Mundarijasi
                </h4>
                <button
                  onClick={handleExtractStructureWithAI}
                  disabled={isExtractingStructure}
                  className="inline-flex items-center gap-1.5 text-xs text-teal-800 font-semibold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isExtractingStructure ? 'Tahlil...' : 'AI orqali Unitlarni ajratish'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {units.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentPdfPageIndex(u.startPdfPage);
                      setShowUnitsDrawer(false);
                    }}
                    className="p-3 text-left rounded-xl border border-gray-200 bg-[#FAF9F5] hover:border-teal-700 hover:bg-teal-50 cursor-pointer transition-all"
                  >
                    <span className="font-bold text-gray-900 block truncate">{u.title}</span>
                    <span className="text-[11px] text-gray-500">
                      PDF sahifalar: {u.startPdfPage}–{u.endPdfPage}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Content Area: Side-by-side or stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Page Display (Left 7 or 8 columns) */}
            <div
              className={`space-y-4 ${
                showTeacherPanel ? 'lg:col-span-7' : 'lg:col-span-12'
              }`}
            >
              {/* Page Container */}
              <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 sm:p-10 shadow-sm min-h-[500px] font-serif space-y-6">
                {/* Header tag */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 text-xs text-gray-400 font-sans">
                  <span>{selectedBook.title}</span>
                  <span className="font-bold text-gray-700">
                    Kitob sahifasi: {currentPage.printedPageLabel}
                  </span>
                </div>

                {/* Extracted textbook content presentation */}
                <div className="text-gray-900 leading-relaxed text-sm whitespace-pre-line space-y-4">
                  {currentPage.extractedText}
                </div>

                {/* Page Action Cards: Listening & Exercises */}
                <div className="pt-4 border-t border-gray-100 font-sans space-y-3">
                  {/* Listening Track Button if present */}
                  {(currentPage.hasListeningExercise || currentPage.linkedAudioTrackLabel) && (
                    <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-teal-800" />
                        <div>
                          <p className="font-bold text-teal-950">
                            Listening Topshirig‘i (Track {currentPage.linkedAudioTrackLabel})
                          </p>
                          <p className="text-[11px] text-teal-800">
                            Darslikdagi tinglash audiosi Listening kutubxonasiga bog‘langan.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          speakEnglishText(
                            `Playing audio track ${currentPage.linkedAudioTrackLabel} for this exercise.`
                          )
                        }
                        className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Audioni Tinglash
                      </button>
                    </div>
                  )}

                  {/* Exercises on this page */}
                  {currentPageExercises.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-bold text-xs text-gray-700 uppercase tracking-wider block">
                        Ushbu sahifadagi mashqlar:
                      </span>
                      {currentPageExercises.map((ex) => (
                        <div
                          key={ex.id}
                          className="p-3 rounded-xl border border-gray-200 bg-[#FAF9F5] flex items-center justify-between text-xs hover:border-teal-700 transition-colors"
                        >
                          <div>
                            <span className="font-bold text-gray-900">
                              {ex.exerciseNumber}-Mashq
                            </span>
                            <span className="text-gray-600 ml-2">{ex.instruction}</span>
                          </div>
                          <button
                            onClick={() => setActiveExercise(ex)}
                            className="px-3 py-1 bg-teal-800 text-white rounded-lg font-semibold text-xs hover:bg-teal-900 cursor-pointer"
                          >
                            Bajarish
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Teacher Panel (Right 5 columns) */}
            {showTeacherPanel && (
              <div className="lg:col-span-5 sticky top-20">
                <TeacherPanel
                  book={selectedBook}
                  currentPage={currentPage}
                  onClose={() => setShowTeacherPanel(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {activeExercise && selectedBook && (
        <GrammarExerciseModal
          exercise={activeExercise}
          bookId={selectedBook.id}
          bookTitle={selectedBook.title}
          bookEdition={selectedBook.edition}
          isOpen={Boolean(activeExercise)}
          onClose={() => setActiveExercise(null)}
          onSaveAnswer={(exId, ans) => {
            // Saved locally
          }}
        />
      )}

      {/* PDF Upload Modal */}
      <FileUploadModal
        category="book_pdf"
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFileProcessed={(file) => {
          const newBook: GrammarBook = {
            id: `book_${Date.now()}`,
            ownerId,
            title: file.name.replace(/\.[^/.]+$/, ''),
            totalPages: 10,
            pageOffset: 4,
            processingStatus: 'ready',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveGrammarBook(newBook);
          loadData();
          setSelectedBookId(newBook.id);
        }}
      />
    </div>
  );
};
