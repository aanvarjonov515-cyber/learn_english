import React, { useState, useEffect } from 'react';
import {
  VocabularyCollection,
  VocabularySection,
  VocabularyEntry,
} from '../../types';
import {
  getCollections,
  getSections,
  getEntriesForSection,
  deleteCollection,
} from '../../services/storage';
import { NewDeckWizard } from './NewDeckWizard';
import { ExerciseEngine } from '../practice/ExerciseEngine';
import { speakEnglishText } from '../../services/audio';
import {
  BookOpen,
  Plus,
  Play,
  Volume2,
  Trash2,
  ArrowLeft,
  Sparkles,
  Layers,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

interface VocabularyViewProps {
  ownerId: string;
}

export const VocabularyView: React.FC<VocabularyViewProps> = ({ ownerId }) => {
  const [collections, setCollections] = useState<VocabularyCollection[]>([]);
  const [selectedColId, setSelectedColId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Active practice section
  const [activePracticeSection, setActivePracticeSection] = useState<{
    section: VocabularySection;
    entries: VocabularyEntry[];
  } | null>(null);

  const loadCollections = () => {
    setCollections(getCollections());
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const selectedCol = collections.find((c) => c.id === selectedColId);
  const sections = selectedColId ? getSections(selectedColId) : [];

  const handleDeleteCol = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Haqiqatan ham bu to'plamni o'chirmoqchimisiz?")) {
      deleteCollection(id);
      loadCollections();
      if (selectedColId === id) setSelectedColId(null);
    }
  };

  const handleStartPracticeSection = (section: VocabularySection) => {
    const entries = getEntriesForSection(section.id);
    if (entries.length === 0) {
      alert("Bu bo'limda so'zlar mavjud emas.");
      return;
    }
    setActivePracticeSection({ section, entries });
  };

  // If in interactive practice session
  if (activePracticeSection) {
    return (
      <ExerciseEngine
        ownerId={ownerId}
        entries={activePracticeSection.entries}
        sectionTitle={activePracticeSection.section.title}
        onExit={() => setActivePracticeSection(null)}
      />
    );
  }

  // If in wizard
  if (showWizard) {
    return (
      <NewDeckWizard
        ownerId={ownerId}
        onCancel={() => setShowWizard(false)}
        onDeckCreated={(newColId) => {
          loadCollections();
          setSelectedColId(newColId);
          setShowWizard(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. COLLECTIONS LIST (OVERVIEW) */}
      {!selectedCol && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D9]">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">
                So'z Boyligi va To'plamlar
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                So'zlarni 40 talik bo'limlarda o'rganing, tinglang va bosqichli mashqlar orqali mustahkamlang.
              </p>
            </div>

            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi To'plam Qo'shish</span>
            </button>
          </div>

          {/* Collections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((col) => {
              const colSections = getSections(col.id);
              return (
                <div
                  key={col.id}
                  onClick={() => setSelectedColId(col.id)}
                  className="bg-white border border-[#E5E2D9] rounded-2xl p-5 shadow-2xs hover:border-teal-700 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <button
                        onClick={(e) => handleDeleteCol(col.id, e)}
                        className="text-gray-300 hover:text-rose-600 p-1 rounded cursor-pointer transition-colors"
                        title="To'plamni o'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="font-serif font-bold text-base text-gray-900 group-hover:text-teal-800 transition-colors">
                      {col.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {col.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      {colSections.length} ta bo'lim ({col.entryCount} ta so'z)
                    </span>
                    <span className="font-semibold text-teal-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Ochish &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. COLLECTION DETAIL & 40-WORD SECTIONS */}
      {selectedCol && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
            <button
              onClick={() => setSelectedColId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Barcha To'plamlarga Qaytish
            </button>

            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-xs font-semibold rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> So'zlar qo'shish
            </button>
          </div>

          {/* Collection Header */}
          <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-2xs space-y-2">
            <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-full">
              To'plam Tafsilotlari
            </span>
            <h2 className="font-serif font-bold text-2xl text-gray-900">
              {selectedCol.title}
            </h2>
            <p className="text-xs text-gray-600">{selectedCol.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-2">
              <span>Jami so'zlar: <strong>{selectedCol.entryCount} ta</strong></span>
              <span>Bo'lim hajmi: <strong>{selectedCol.sectionSize} ta</strong></span>
              <span>Bo'limlar soni: <strong>{sections.length} ta</strong></span>
            </div>
          </div>

          {/* Sections List */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-lg text-gray-900">
              O'rganish Bo'limlari
            </h3>

            <div className="space-y-3">
              {sections.map((sec) => {
                const sectionEntries = getEntriesForSection(sec.id);
                return (
                  <div
                    key={sec.id}
                    className="bg-white border border-[#E5E2D9] rounded-2xl p-5 shadow-2xs hover:border-teal-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-900 font-bold text-xs flex items-center justify-center">
                          {sec.position}
                        </span>
                        <h4 className="font-serif font-bold text-base text-gray-900">
                          {sec.title}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500">
                        {sectionEntries.length} ta so'z (Tanishish, tanlash, audio, harflar, mustaqil yozish)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartPracticeSection(sec)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Mashqni Boshlash</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
