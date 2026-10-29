import React, { useState, useEffect } from 'react';
import { NavRoute, Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { DemoBanner } from './components/common/DemoBanner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { HomeView } from './components/home/HomeView';
import { VocabularyView } from './components/vocabulary/VocabularyView';
import { ReaderView } from './components/reader/ReaderView';
import { SpacedRepetitionView } from './components/repetition/SpacedRepetitionView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { ListeningView } from './components/listening/ListeningView';
import { GrammarView } from './components/grammar/GrammarView';
import { TeacherView } from './components/teacher/TeacherView';
import { WritingView } from './components/writing/WritingView';
import { UpcomingModuleView } from './components/placeholder/UpcomingModuleView';
import {
  getUserProfile,
  getUserSettings,
  isDemoModeActive,
} from './services/storage';
import { UserProfile, UserSettings } from './types';

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('home');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Sync route with URL hash
  const syncRouteFromHash = () => {
    const rawHash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    const validRoutes: NavRoute[] = [
      'home',
      'vocabulary',
      'reader',
      'practice',
      'spaced-repetition',
      'listening',
      'grammar',
      'writing',
      'teacher',
      'analytics',
      'settings',
    ];

    if (validRoutes.includes(rawHash as NavRoute)) {
      setCurrentRoute(rawHash as NavRoute);
    } else {
      setCurrentRoute('home');
    }
  };

  useEffect(() => {
    syncRouteFromHash();
    window.addEventListener('hashchange', syncRouteFromHash);
    window.addEventListener('popstate', syncRouteFromHash);
    return () => {
      window.removeEventListener('hashchange', syncRouteFromHash);
      window.removeEventListener('popstate', syncRouteFromHash);
    };
  }, []);

  const handleNavigate = (route: NavRoute) => {
    window.location.hash = `#${route}`;
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check onboarding on mount
  useEffect(() => {
    const loadedProfile = getUserProfile();
    if (!loadedProfile.isOnboarded && !isDemoModeActive()) {
      setShowOnboarding(true);
    }
  }, []);

  const handleProfileReload = () => {
    setProfile(getUserProfile());
    setSettings(getUserSettings());
  };

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-app-bg text-textPrimary flex flex-col font-sans selection:bg-teal-200 selection:text-teal-950 transition-colors">
        {/* Demo Mode Notice Banner */}
        <DemoBanner onModeToggle={handleProfileReload} />

        {/* Main Application Shell */}
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop Left Sidebar */}
          <Sidebar
            currentRoute={currentRoute}
            onRouteChange={handleNavigate}
            profile={profile}
            onProfileUpdate={handleProfileReload}
          />

          {/* Right Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
            {/* Top Header */}
            <Header currentRoute={currentRoute} profile={profile} />

            {/* Scrollable View Content */}
            <main className="flex-1 p-4 sm:p-8 pb-24 md:pb-12 max-w-7xl w-full mx-auto">
              {currentRoute === 'home' && (
                <HomeView
                  profile={profile}
                  settings={settings}
                  onNavigate={handleNavigate}
                />
              )}

              {currentRoute === 'vocabulary' && (
                <VocabularyView ownerId={profile.id} />
              )}

              {currentRoute === 'spaced-repetition' && (
                <SpacedRepetitionView ownerId={profile.id} />
              )}

              {currentRoute === 'reader' && (
                <ReaderView ownerId={profile.id} />
              )}

              {currentRoute === 'analytics' && <AnalyticsView />}

              {currentRoute === 'settings' && (
                <SettingsView
                  profile={profile}
                  settings={settings}
                  onUpdate={handleProfileReload}
                />
              )}

              {currentRoute === 'listening' && (
                <ListeningView ownerId={profile.id} />
              )}

              {currentRoute === 'grammar' && (
                <GrammarView ownerId={profile.id} />
              )}

              {currentRoute === 'writing' && (
                <WritingView
                  ownerId={profile.id}
                  profile={profile}
                  onNavigate={handleNavigate}
                />
              )}

              {currentRoute === 'teacher' && (
                <TeacherView
                  ownerId={profile.id}
                  profile={profile}
                  onNavigate={handleNavigate}
                />
              )}
            </main>
          </div>
        </div>

        {/* Mobile Fixed Bottom Navigation */}
        <BottomNav currentRoute={currentRoute} onRouteChange={handleNavigate} />

        {/* Onboarding Modal for New Learners */}
        {showOnboarding && (
          <OnboardingModal
            initialProfile={profile}
            initialSettings={settings}
            onComplete={(p, s) => {
              setProfile(p);
              setSettings(s);
              setShowOnboarding(false);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  </ThemeProvider>
  );
}
