import React, { useState, useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, title, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xl space-y-4 max-w-sm w-full">
        <h3 className="font-bold text-textPrimary">Tasdiqlash</h3>
        <p className="text-sm text-textSecondary">{title} o‘chirilsinmi?</p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-surface-muted text-textSecondary hover:bg-border cursor-pointer">
            Bekor qilish
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer">
            O‘chirish
          </button>
        </div>
      </div>
    </div>
  );
};
