import React, { useState } from 'react';
import {
  parseRawTextLines,
  parseCsvContent,
  ParsedInputItem,
} from '../../services/csvParser';
import {
  VocabularyCollection,
  VocabularySection,
  VocabularyEntry,
  VocabularySense,
} from '../../types';
import {
  saveCollection,
  saveSection,
  saveEntries,
} from '../../services/storage';
import { FileUploadModal } from '../common/FileUploadModal';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload,
  Check,
  AlertTriangle,
  Loader2,
  Trash2,
  RefreshCw,
  Plus,
  Volume2,
} from 'lucide-react';
import { speakEnglishText } from '../../services/audio';

interface NewDeckWizardProps {
  ownerId: string;
  onCancel: () => void;
  onDeckCreated: (collectionId: string) => void;
}

type WizardStep = 'input' | 'preview' | 'ai_enrich' | 'review' | 'sections';

export const NewDeckWizard: React.FC<NewDeckWizardProps> = ({
  ownerId,
  onCancel,
  onDeckCreated,
}) => {
  const [step, setStep] = useState<WizardStep>('input');

  // Step 1: Input details
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [sectionSize, setSectionSize] = useState<number>(40);
  const [rawText, setRawText] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Step 2: Parsed items
  const [parsedItems, setParsedItems] = useState<ParsedInputItem[]>([]);

  // Step 3 & 4: Enriched entries
  const [enrichedEntries, setEnrichedEntries] = useState<
    Array<{
      id: string;
      surfaceForm: string;
      lemma: string;
      partOfSpeech: string;
      userTranslation?: string;
      senses: VocabularySense[];
      status: 'ai_generated' | 'user_reviewed' | 'user_edited';
    }>
  >([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStats, setAiStats] = useState<{ total: number; success: number; errors: number }>({
    total: 0,
    success: 0,
    errors: 0,
  });

  // Step 5: Save state
  const [isSaving, setIsSaving] = useState(false);

  // Handle parsing when transitioning from input to preview
  const handleProceedToPreview = () => {
    if (!deckTitle.trim()) {
      alert("Iltimos, to'plam nomini kiriting.");
      return;
    }
    if (!rawText.trim()) {
      alert("Iltimos, kamida bitta so'z yoki ibora kiriting.");
      return;
    }

    const result = parseRawTextLines(rawText);
    if (result.items.length === 0) {
      alert("Hech qanday so'z topilmadi.");
      return;
    }

    setParsedItems(result.items);
    setStep('preview');
  };

  const handleFileUpload = (fileData: { name: string; content: string }) => {
    if (fileData.name.endsWith('.csv')) {
      const csvRes = parseCsvContent(fileData.content);
      if (csvRes.items.length > 0) {
        setParsedItems(csvRes.items);
        if (!deckTitle) {
          setDeckTitle(fileData.name.replace(/\.[^/.]+$/, ''));
        }
        setStep('preview');
        return;
      }
    }
    // TXT fallback
    setRawText(fileData.content);
    if (!deckTitle) {
      setDeckTitle(fileData.name.replace(/\.[^/.]+$/, ''));
    }
  };

  // Toggle item inclusion in preview
  const toggleItemInclude = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isIncluded: !item.isIncluded } : item))
    );
  };

  // Step 3: Call Server-side Gemini AI for enrichment
  const handleStartAiEnrichment = async () => {
    const included = parsedItems.filter((it) => it.isIncluded);
    if (included.length === 0) {
      alert("Ko'rib chiqish uchun kamida bitta so'z tanlang.");
      return;
    }

    setStep('ai_enrich');
    setAiLoading(true);
    setAiError(null);

    try {
      const payload = included.map((it) => ({
        id: it.id,
        surfaceForm: it.englishWord,
        userTranslation: it.userTranslation,
      }));

      const res = await fetch('/api/vocabulary/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || "AI orqali so'zlarni boyitishda xatolik yuz berdi.");
      }

      const data = await res.json();
      const resultsMap = new Map<string, any>();
      (data.results || []).forEach((r: any) => resultsMap.set(r.id, r));

      const builtEntries = included.map((it) => {
        const enriched = resultsMap.get(it.id);
        const translationUz = enriched?.translationUz || it.userTranslation || "Tarjima kiritilmagan";
        const lemma = enriched?.lemma || it.englishWord.toLowerCase();
        const partOfSpeech = enriched?.partOfSpeech || 'word';

        const sense: VocabularySense = {
          id: `sn_${it.id}_1`,
          translationUz,
          definitionEn: enriched?.definitionEn || '',
          exampleEn: enriched?.exampleEn || `This is an example for "${it.englishWord}".`,
          exampleUz: enriched?.exampleUz || `Bu "${it.englishWord}" uchun misol jumlasi.`,
          verificationStatus: 'ai_generated',
        };

        return {
          id: `ent_${it.id}`,
          surfaceForm: it.englishWord,
          lemma,
          partOfSpeech,
          userTranslation: it.userTranslation,
          senses: [sense],
          status: 'ai_generated' as const,
        };
      });

      setEnrichedEntries(builtEntries);
      setAiStats({
        total: included.length,
        success: data.totalProcessed || builtEntries.length,
        errors: (data.errors || []).length,
      });
      setAiLoading(false);
      setStep('review');
    } catch (err: any) {
      setAiLoading(false);
      setAiError(err.message || 'Kutilmagan xatolik yuz berdi.');
    }
  };

  // Save the entire collection, create 40-word sections idempotently
  const handleSaveCollectionAndSections = () => {
    if (enrichedEntries.length === 0) return;

    setIsSaving(true);
    const collectionId = `col_${Date.now()}`;
    const nowIso = new Date().toISOString();

    // 1. Build Collection
    const newCollection: VocabularyCollection = {
      id: collectionId,
      ownerId,
      title: deckTitle.trim() || "Yangi So'zlar To'plami",
      description: deckDescription.trim() || `${enrichedEntries.length} ta so'zdan iborat to'plam`,
      sectionSize: sectionSize || 40,
      entryCount: enrichedEntries.length,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 2. Build Entries
    const builtEntries: VocabularyEntry[] = enrichedEntries.map((item) => ({
      id: item.id,
      ownerId,
      collectionId,
      surfaceForm: item.surfaceForm,
      lemma: item.lemma,
      partOfSpeech: item.partOfSpeech,
      senses: item.senses,
      source: 'ai',
      createdAt: nowIso,
      updatedAt: nowIso,
      schemaVersion: 1,
    }));

    // 3. Partition into 40-word sections (VocabularySection)
    const effectiveSize = Math.max(5, sectionSize || 40);
    const sections: VocabularySection[] = [];
    const totalEntries = builtEntries.length;
    let currentPosition = 1;

    for (let i = 0; i < totalEntries; i += effectiveSize) {
      const chunk = builtEntries.slice(i, i + effectiveSize);
      const sectionId = `sec_${collectionId}_${currentPosition}`;

      sections.push({
        id: sectionId,
        ownerId,
        collectionId,
        title: `${currentPosition}-Bo'lim (${i + 1}-${i + chunk.length})`,
        position: currentPosition,
        entryIds: chunk.map((c) => c.id),
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      currentPosition++;
    }

    // Save to storage
    saveCollection(newCollection);
    sections.forEach((sec) => saveSection(sec));
    saveEntries(builtEntries);

    setIsSaving(false);
    onDeckCreated(collectionId);
  };

  // Editing a single enriched entry
  const handleUpdateEntryField = (
    index: number,
    field: 'surfaceForm' | 'translationUz' | 'exampleEn' | 'exampleUz' | 'partOfSpeech',
    value: string
  ) => {
    setEnrichedEntries((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      if (field === 'surfaceForm') {
        target.surfaceForm = value;
      } else if (field === 'partOfSpeech') {
        target.partOfSpeech = value;
      } else {
        target.senses = [
          {
            ...target.senses[0],
            [field]: value,
            verificationStatus: 'user_edited',
          },
        ];
      }
      target.status = 'user_edited';
      copy[index] = target;
      return copy;
    });
  };

  const handleMarkReviewed = (index: number) => {
    setEnrichedEntries((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        status: 'user_reviewed',
        senses: [
          {
            ...copy[index].senses[0],
            verificationStatus: 'user_reviewed',
          },
        ],
      };
      return copy;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header / Breadcrumb */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">
            Yangi So'zlar To'plami Yaratish
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Qadam {step === 'input' ? 1 : step === 'preview' ? 2 : step === 'ai_enrich' ? 3 : step === 'review' ? 4 : 5} / 5
          </p>
        </div>

        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
        >
          Bekor qilish
        </button>
      </div>

      {/* STEP 1: INPUT METHOD */}
      {step === 'input' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                To'plam nomi *
              </label>
              <input
                type="text"
                required
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                placeholder="Masalan: Oxford Essential Words, A2 Yangi so'zlar..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#D5D1C6] rounded-xl text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Bo'lim hajmi (Standart: 40 ta so'z)
              </label>
              <select
                value={sectionSize}
                onChange={(e) => setSectionSize(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 bg-white border border-[#D5D1C6] rounded-xl text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-teal-700"
              >
                <option value={20}>20 talik bo'limlar</option>
                <option value={30}>30 talik bo'limlar</option>
                <option value={40}>40 talik bo'limlar (Tavsiya etiladi)</option>
                <option value={50}>50 talik bo'limlar</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                So'zlarni kiriting yoki joylashtiring
              </label>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-900 cursor-pointer bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200"
              >
                <Upload className="w-3.5 h-3.5" /> TXT yoki CSV yuklash
              </button>
            </div>

            <textarea
              rows={10}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`So'zlarni har bir qatorda bitta qilib kiriting.
Misollar:
hello
apple — olma
look after - g'amxo'rlik qilmoq
take a break
bank
curious
improve`}
              className="w-full p-4 bg-white border border-[#D5D1C6] rounded-xl text-sm font-mono text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-teal-700 leading-relaxed"
            />
            <p className="text-[11px] text-gray-500 mt-1.5">
              Qatorda faqat inglizcha so'z bo'lsa, AI Teacher uning o'zbekcha tarjimasi va misollarini tayyorlaydi. Agar tarjima ham berilgan bo'lsa (masalan: <code>apple — olma</code>), u saqlanadi.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={handleProceedToPreview}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <span>Ro'yxatni Tekshirish</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & PARSING */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center justify-between">
            <div>
              <p className="font-semibold">Aniqlangan so'zlar soni: {parsedItems.length} ta</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Keraksiz qatorlarni chiqarib tashlashingiz yoki tuzatishingiz mumkin.
              </p>
            </div>
            <div className="text-right font-medium">
              Tanlangan: {parsedItems.filter((i) => i.isIncluded).length} ta
            </div>
          </div>

          <div className="bg-white border border-[#E5E2D9] rounded-xl overflow-hidden divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {parsedItems.map((item, idx) => (
              <div
                key={item.id}
                className={`p-3 text-xs flex items-center justify-between transition-colors ${
                  item.isIncluded ? 'bg-white' : 'bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={item.isIncluded}
                    onChange={() => toggleItemInclude(item.id)}
                    className="w-4 h-4 rounded text-teal-800 focus:ring-teal-700 cursor-pointer"
                  />
                  <span className="text-gray-400 font-mono w-6 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900 text-sm">{item.englishWord}</span>
                    {item.userTranslation && (
                      <span className="text-gray-600 ml-2">({item.userTranslation})</span>
                    )}
                    {item.warning && (
                      <span className="text-rose-600 block text-[11px] flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 inline" /> {item.warning}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleItemInclude(item.id)}
                  className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer px-2 py-1"
                >
                  {item.isIncluded ? 'Olib tashlash' : 'Qaytarish'}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Ortga
            </button>

            <button
              type="button"
              onClick={handleStartAiEnrichment}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI Teacher Bilan Tayyorlash</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: AI ENRICHMENT LOADING & ERROR */}
      {step === 'ai_enrich' && (
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-8 text-center space-y-4 shadow-sm">
          {aiLoading && (
            <>
              <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="font-serif font-bold text-lg text-gray-900">
                AI Teacher so'zlarni tayyorlamoqda...
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Har bir so'z uchun kontekstli o'zbekcha tarjima, so'z turkumi, sodda A2/B1 inglizcha misol va uning tarjimasi tayyorlanmoqda.
              </p>
            </>
          )}

          {aiError && (
            <div className="text-left space-y-3">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <p className="font-semibold text-sm">AI tayyorlashda xatolik yuz berdi</p>
                  <p className="mt-1">{aiError}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStep('preview')}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Ro'yxatga qaytish
                </button>
                <button
                  type="button"
                  onClick={handleStartAiEnrichment}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-800 text-white text-xs font-semibold rounded-lg hover:bg-teal-900 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Qayta urinish
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: REVIEW ENRICHED ENTRIES */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
            <div>
              <p className="font-bold text-sm">
                AI Teacher tayyorladi: {enrichedEntries.length} ta so'z
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Har bir kartada o'zbekcha tarjima va misollarni tahrirlashingiz yoki tasdiqlashingiz mumkin.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold text-[11px]">
                {aiStats.success} ta muvaffaqiyatli
              </span>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {enrichedEntries.map((entry, idx) => {
              const sense = entry.senses[0] || {};
              return (
                <div
                  key={entry.id}
                  className="bg-white border border-[#E5E2D9] rounded-xl p-4 shadow-2xs hover:border-teal-700 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-400">{idx + 1}.</span>
                      <span className="font-serif font-bold text-base text-gray-900">
                        {entry.surfaceForm}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                        {entry.partOfSpeech || 'word'}
                      </span>
                      <button
                        type="button"
                        onClick={() => speakEnglishText(entry.surfaceForm)}
                        className="p-1 rounded text-teal-800 hover:bg-teal-50 cursor-pointer"
                        title="Talaffuzni tinglash"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          entry.status === 'user_reviewed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : entry.status === 'user_edited'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-50 text-teal-800'
                        }`}
                      >
                        {entry.status === 'user_reviewed'
                          ? 'Tasdiqlangan'
                          : entry.status === 'user_edited'
                          ? 'Tahrirlangan'
                          : 'AI tayyorlagan'}
                      </span>

                      {entry.status !== 'user_reviewed' && (
                        <button
                          type="button"
                          onClick={() => handleMarkReviewed(idx)}
                          className="text-[11px] font-semibold text-teal-800 hover:text-teal-900 bg-teal-50 px-2 py-1 rounded cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Tasdiqlash
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Editable translation & example */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        O'zbekcha tarjimasi:
                      </label>
                      <input
                        type="text"
                        value={sense.translationUz || ''}
                        onChange={(e) =>
                          handleUpdateEntryField(idx, 'translationUz', e.target.value)
                        }
                        className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:ring-1 focus:ring-teal-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Inglizcha misol:
                      </label>
                      <input
                        type="text"
                        value={sense.exampleEn || ''}
                        onChange={(e) =>
                          handleUpdateEntryField(idx, 'exampleEn', e.target.value)
                        }
                        className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:ring-1 focus:ring-teal-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Misolning o'zbekcha tarjimasi:
                    </label>
                    <input
                      type="text"
                      value={sense.exampleUz || ''}
                      onChange={(e) =>
                        handleUpdateEntryField(idx, 'exampleUz', e.target.value)
                      }
                      className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:ring-1 focus:ring-teal-700 text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={() => setStep('preview')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Ortga
            </button>

            <button
              type="button"
              onClick={handleSaveCollectionAndSections}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Bo'limlarga Ajratish va Saqlash</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      <FileUploadModal
        category="word_list"
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFileProcessed={handleFileUpload}
      />
    </div>
  );
};
