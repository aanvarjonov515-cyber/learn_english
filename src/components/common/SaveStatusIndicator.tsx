import React, { useEffect, useState } from 'react';
import { SaveState } from '../../types';
import { onSaveStateChange } from '../../services/storage';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export const SaveStatusIndicator: React.FC = () => {
  const [state, setState] = useState<SaveState>('idle');

  useEffect(() => {
    return onSaveStateChange((newState) => {
      setState(newState);
    });
  }, []);

  if (state === 'idle') return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
        state === 'saving'
          ? 'bg-amber-50 text-amber-700 border border-amber-200'
          : state === 'saved'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-rose-50 text-rose-700 border border-rose-200'
      }`}
      role="status"
      aria-live="polite"
    >
      {state === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
          <span>Saqlanmoqda...</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Saqlandi</span>
        </>
      )}
      {state === 'error' && (
        <>
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>Saqlanmadi (Qayta urinish)</span>
        </>
      )}
    </div>
  );
};
