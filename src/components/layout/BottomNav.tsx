import React, { useState } from 'react';
import {
  Home,
  BookOpen,
  Repeat,
  FileText,
  Menu,
  X,
  Headphones,
  Compass,
  PenTool,
  Bot,
  BarChart3,
  Settings,
} from 'lucide-react';
import { NavRoute } from './Sidebar';

interface BottomNavProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentRoute, onRouteChange }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const primaryItems: { id: NavRoute; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Bosh', icon: Home },
    { id: 'vocabulary', label: "So'zlar", icon: BookOpen },
    { id: 'spaced-repetition', label: 'Takrorlash', icon: Repeat },
    { id: 'reader', label: "O'qish", icon: FileText },
  ];

  const secondaryItems: {
    id: NavRoute;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
  }[] = [
    { id: 'listening', label: 'Listening (Tinglash)', icon: Headphones },
    { id: 'grammar', label: 'Grammatika Darsliklari', icon: Compass },
    { id: 'writing', label: 'Daily Writing (Yozish)', icon: PenTool },
    { id: 'teacher', label: 'AI Teacher Sessiyasi', icon: Bot },
    { id: 'analytics', label: 'Natijalar va Progress', icon: BarChart3 },
    { id: 'settings', label: 'Sozlamalar', icon: Settings },
  ];

  return (
    <>
      {/* Mobile More Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-2xs flex flex-col justify-end">
          <div className="bg-[#FAF9F5] border-t border-[#E5E2D9] rounded-t-2xl p-5 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9] mb-4">
              <h3 className="font-serif font-bold text-base text-gray-900">Barcha Bo'limlar</h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentRoute === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onRouteChange(item.id);
                      setShowMoreMenu(false);
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-start text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-teal-800 text-white border-teal-900'
                        : 'bg-white text-gray-800 border-[#E5E2D9] hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-teal-700'}`} />
                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FAF9F5] border-t border-[#E5E2D9] flex items-center justify-around py-1.5 px-2 shadow-lg">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentRoute === item.id ||
            (item.id === 'vocabulary' && currentRoute === 'practice');

          return (
            <button
              key={item.id}
              onClick={() => {
                onRouteChange(item.id);
                setShowMoreMenu(false);
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-teal-800 font-semibold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-teal-800' : 'text-gray-500'}`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}

        {/* More Trigger */}
        <button
          onClick={() => setShowMoreMenu(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            showMoreMenu ? 'text-teal-800 font-semibold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Yana</span>
        </button>
      </div>
    </>
  );
};
