import React from 'react';
import { Eye, LogOut } from 'lucide-react';
import { isDemoModeActive, setDemoModeActive } from '../../services/storage';

interface DemoBannerProps {
  onModeToggle: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onModeToggle }) => {
  const isDemo = isDemoModeActive();
  if (!isDemo) return null;

  const handleExitDemo = () => {
    setDemoModeActive(false);
    onModeToggle();
  };

  return (
    <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <Eye className="w-3.5 h-3.5 text-amber-700" />
        <span className="font-semibold">Namuna rejimi faol:</span>
        <span className="hidden sm:inline text-amber-800">
          Ushbu rejimdagi o'zgarishlar sizning haqiqiy progress va hisobingizga qo'shilmaydi.
        </span>
      </div>
      <button
        onClick={handleExitDemo}
        className="inline-flex items-center gap-1 font-medium bg-amber-200 hover:bg-amber-300 text-amber-900 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
        title="Namuna rejimidan chiqish"
      >
        <LogOut className="w-3 h-3" />
        <span>Haqiqiy hisobga o'tish</span>
      </button>
    </div>
  );
};
