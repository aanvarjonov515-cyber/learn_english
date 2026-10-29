import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Brain,
  Check,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { LearnerMemoryItem, LearnerMemoryCategory, LearnerMemorySource } from '../../types';
import {
  getLearnerMemoryItems,
  saveLearnerMemoryItem,
  deleteLearnerMemoryItem,
} from '../../services/learnerMemoryStorage';

interface LearnerMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LearnerMemoryModal: React.FC<LearnerMemoryModalProps> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<LearnerMemoryItem[]>(() => getLearnerMemoryItems());
  const [editingItem, setEditingItem] = useState<Partial<LearnerMemoryItem> | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const refreshItems = () => {
    setItems(getLearnerMemoryItems());
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.summary?.trim()) return;

    saveLearnerMemoryItem({
      id: editingItem.id,
      summary: editingItem.summary.trim(),
      category: editingItem.category || 'preference',
      source: editingItem.source || 'user_statement',
    });

    setEditingItem(null);
    setIsAdding(false);
    refreshItems();
  };

  const handleDelete = (id: string) => {
    deleteLearnerMemoryItem(id);
    refreshItems();
  };

  const getSourceBadge = (source: LearnerMemorySource) => {
    switch (source) {
      case 'user_statement':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Siz aytganiz</span>;
      case 'exercise_evidence':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Mashq dalili</span>;
      case 'teacher_hypothesis':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Ustoz taxmini</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">O‘quvchi Xotirasi (Learner Memory)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ustoz siz haqizda biladigan tasdiqlangan fakt va ma’lumotlar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Add / Edit Form */}
          {(isAdding || editingItem) && (
            <form onSubmit={handleSave} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-teal-200 dark:border-teal-800/50 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingItem?.id ? 'Xotira ma’lumotini tahrirlash' : 'Yangi xotira qo‘shish'}
              </h3>
              <textarea
                value={editingItem?.summary || ''}
                onChange={(e) => setEditingItem({ ...editingItem, summary: e.target.value })}
                placeholder="Masalan: Present Simple da do/does farqini bilaman..."
                className="w-full p-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                rows={2}
                required
              />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Kategoriya</label>
                  <select
                    value={editingItem?.category || 'preference'}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as LearnerMemoryCategory })}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="preference">Afzallik (Preference)</option>
                    <option value="learning_goal">O‘quv maqsadi (Goal)</option>
                    <option value="exercise_evidence">Mashq dalili (Evidence)</option>
                    <option value="teacher_hypothesis">Ustoz taxmini (Hypothesis)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Manba</label>
                  <select
                    value={editingItem?.source || 'user_statement'}
                    onChange={(e) => setEditingItem({ ...editingItem, source: e.target.value as LearnerMemorySource })}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="user_statement">Siz aytganiz (User Statement)</option>
                    <option value="exercise_evidence">Mashq dalili (Exercise Evidence)</option>
                    <option value="teacher_hypothesis">Ustoz taxmini (Teacher Hypothesis)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingItem(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 rounded-lg flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Saqlash
                </button>
              </div>
            </form>
          )}

          {!isAdding && !editingItem && (
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingItem({ summary: '', category: 'preference', source: 'user_statement' });
              }}
              className="w-full py-2.5 px-4 border border-dashed border-teal-300 dark:border-teal-700/60 rounded-xl text-xs font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Yangi xotira yoki afzallik kiritish
            </button>
          )}

          {/* List */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
              Hozircha saqlangan xotira ma’lumotlari yo‘q.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-300 dark:hover:border-teal-700 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      {getSourceBadge(item.source)}
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {item.summary}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      Yaratilgan: {new Date(item.createdAt).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Tahrirlash"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Notice */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Siz xohlagan vaqtda ma’lumotlarni tahrirlashingiz yoki o‘chirib tashlashingiz mumkin.</span>
        </div>
      </div>
    </div>
  );
};
