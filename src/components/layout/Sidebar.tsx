import React from 'react';
import {
  Home,
  BookOpen,
  Headphones,
  FileText,
  PenTool,
  Bot,
  BarChart3,
  Settings,
  Sparkles,
  Repeat,
  Compass,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { isDemoModeActive, setDemoModeActive } from '../../services/storage';

export type NavRoute =
  | 'home'
  | 'vocabulary'
  | 'reader'
  | 'practice'
  | 'spaced-repetition'
  | 'listening'
  | 'grammar'
  | 'writing'
  | 'teacher'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  profile: UserProfile;
  onProfileUpdate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  profile,
  onProfileUpdate,
}) => {
  const isDemo = isDemoModeActive();

  const navItems: { id: NavRoute; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'home', label: 'Bosh sahifa', icon: Home },
    { id: 'vocabulary', label: "So'z yodlash", icon: BookOpen },
    { id: 'spaced-repetition', label: 'Takrorlash', icon: Repeat },
    { id: 'reader', label: "Kitob o'qish", icon: FileText },
    { id: 'listening', label: 'Listening Hub', icon: Headphones },
    { id: 'grammar', label: 'Grammatika Kitoblari', icon: Compass },
    { id: 'writing', label: 'Daily Writing', icon: PenTool },
    { id: 'teacher', label: 'AI Teacher', icon: Bot },
    { id: 'analytics', label: 'Natijalar', icon: BarChart3 },
    { id: 'settings', label: 'Sozlamalar', icon: Settings },
  ];

  const handleToggleDemo = () => {
    setDemoModeActive(!isDemo);
    onProfileUpdate();
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-border h-screen sticky top-0 select-none z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div
          onClick={() => onRouteChange('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold font-serif text-lg shadow-xs group-hover:bg-teal-900 transition-colors">
            ET
          </div>
          <div>
            <h1 className="font-serif font-bold text-base text-textPrimary leading-tight">
              English Teacher
            </h1>
            <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> AI Platform
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
          Asosiy Bo'limlar
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentRoute === item.id ||
            (item.id === 'vocabulary' && currentRoute === 'practice');

          return (
            <button
              key={item.id}
              onClick={() => onRouteChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'text-textSecondary hover:bg-elevated hover:text-textPrimary'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-textSecondary'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    isActive
                      ? 'bg-teal-900 text-teal-100'
                      : 'bg-elevated text-textSecondary border border-border'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User / Mode Footer */}
      <div className="p-3 border-t border-border space-y-2 bg-surface">
        {/* Demo Mode Toggle */}
        <button
          onClick={handleToggleDemo}
          className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer border ${
            isDemo
              ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 hover:bg-amber-200'
              : 'bg-surface text-textSecondary border-border hover:bg-elevated'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isDemo ? 'bg-amber-600 dark:bg-amber-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            {isDemo ? 'Namuna rejimi' : 'Haqiqiy rejim'}
          </span>
          <span className="text-[10px] underline font-semibold">
            {isDemo ? 'Chiqish' : 'Namuna'}
          </span>
        </button>

        {/* Profile info card */}
        <div className="p-2.5 rounded-xl bg-elevated/50 border border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-800/20 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
            {profile.displayName?.slice(0, 2).toUpperCase() || 'OT'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-textPrimary truncate">{profile.displayName || 'O‘quvchi'}</p>
            <p className="text-[10px] text-textSecondary">Daraja: {profile.estimatedLevel || 'A2'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
