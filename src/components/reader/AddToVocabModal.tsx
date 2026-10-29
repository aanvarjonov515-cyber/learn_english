import React, { useState } from 'react';
import {
  DictionaryLookupResult,
  VocabularyCollection,
  VocabularySection,
  VocabularyEntry,
} from '../../types';
import {
  getCollections,
  getSections,
  saveCollection,
  saveSection,
  saveEntries,
} from '../../services/storage';
import { BookmarkPlus, Plus, Check, X } from 'lucide-react';

interface AddToVocabModalProps {
  ownerId: string;
  lookupData: DictionaryLookupResult;
  documentTitle: string;
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export const AddToVocabModal: React.FC<AddToVocabModalProps> = ({
  ownerId,
  lookupData,
  documentTitle,
  documentId,
  isOpen,
  onClose,
  onAdded,
}) => {
  const collections = getCollections();
  const [selectedColId, setSelectedColId] = useState<string>(
    collections[0]?.id || 'new'
  );
  const [newColTitle, setNewColTitle] = useState('');
  const [customTranslation, setCustomTranslation] = useState(
    lookupData.contextualTranslationUz
  );
  const [customExample, setCustomExample] = useState(lookupData.exampleEn);
  const [customExampleUz, setCustomExampleUz] = useState(lookupData.exampleUz);

  if (!isOpen) return null;

  const handleSave = () => {
    let targetColId = selectedColId;
    const nowIso = new Date().toISOString();

    // 1. If new collection chosen, create it
    if (selectedColId === 'new') {
      const colId = `col_${Date.now()}`;
      const newCol: VocabularyCollection = {
        id: colId,
        ownerId,
        title: newColTitle.trim() || `Matn so'zlari (${documentTitle})`,
        description: `Kitob mutolaasidan saqlangan so'zlar: ${documentTitle}`,
        sectionSize: 40,
        entryCount: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      saveCollection(newCol);
      targetColId = colId;
    }

    // 2. Find or create a section in target collection
    let sections = getSections(targetColId);
    let targetSection: VocabularySection;

    if (sections.length === 0 || sections[sections.length - 1].entryIds.length >= 40) {
      // Create new section
      const sectionNum = sections.length + 1;
      targetSection = {
        id: `sec_${targetColId}_${sectionNum}`,
        ownerId,
        collectionId: targetColId,
        title: `${sectionNum}-Bo'lim`,
        position: sectionNum,
        entryIds: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    } else {
      targetSection = sections[sections.length - 1];
    }

    // 3. Create the entry
    const entryId = `ent_reader_${Date.now()}`;
    const newEntry: VocabularyEntry = {
      id: entryId,
      ownerId,
      collectionId: targetColId,
      surfaceForm: lookupData.word,
      lemma: lookupData.lemma || lookupData.word.toLowerCase(),
      partOfSpeech: lookupData.partOfSpeech,
      senses: [
        {
          id: `sn_${entryId}_1`,
          translationUz: customTranslation.trim(),
          definitionEn: lookupData.shortDefinitionEn,
          exampleEn: customExample.trim(),
          exampleUz: customExampleUz.trim(),
          context: documentTitle,
          verificationStatus: 'user_reviewed',
        },
      ],
      source: 'reader',
      createdAt: nowIso,
      updatedAt: nowIso,
      schemaVersion: 1,
    };

    targetSection.entryIds.push(entryId);
    targetSection.updatedAt = nowIso;

    saveSection(targetSection);
    saveEntries([newEntry]);

    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-[#FAF9F5] border border-[#E5E2D9] rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9] mb-4">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5 text-teal-800" />
            <h3 className="font-serif font-bold text-gray-900 text-base">
              Lug'at To'plamiga Qo'shish
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Word Details */}
          <div className="p-3 bg-white border border-[#E5E2D9] rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-lg text-gray-900">
                {lookupData.word}
              </span>
              <span className="text-[11px] text-gray-500 font-mono italic">
                {lookupData.partOfSpeech}
              </span>
            </div>
            <p className="text-teal-900 font-semibold">{customTranslation}</p>
          </div>

          {/* Target Collection Selection */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 uppercase mb-1">
              To'plamni tanlang:
            </label>
            <select
              value={selectedColId}
              onChange={(e) => setSelectedColId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D5D1C6] rounded-xl text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.entryCount} ta so'z)
                </option>
              ))}
              <option value="new">+ Yangi to'plam ochish...</option>
            </select>
          </div>

          {selectedColId === 'new' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 uppercase mb-1">
                Yangi to'plam nomi:
              </label>
              <input
                type="text"
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                placeholder={`Masalan: ${documentTitle} so'zlari`}
                className="w-full px-3 py-2 bg-white border border-[#D5D1C6] rounded-xl text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
              />
            </div>
          )}

          {/* Editable translation */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 uppercase mb-1">
              O'zbekcha ma'nosi:
            </label>
            <input
              type="text"
              value={customTranslation}
              onChange={(e) => setCustomTranslation(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-[#D5D1C6] rounded-lg text-gray-900 focus:ring-1 focus:ring-teal-700"
            />
          </div>

          {/* Source context reminder */}
          <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-100 text-[11px] text-teal-900">
            <span className="font-semibold">Manba:</span> "{documentTitle}" matni. So'z yangi boshlang'ich takrorlash holatida saqlanadi.
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#E5E2D9]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Saqlash
          </button>
        </div>
      </div>
    </div>
  );
};
