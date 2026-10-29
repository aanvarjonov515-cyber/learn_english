/**
 * Theme Storage & Context Service (Stage 19)
 * Handles light, dark, and system color preferences, system dark mode listener,
 * document element class updates, color-scheme CSS properties, and flash prevention.
 */

import { ThemePreference, ResolvedTheme } from '../types';
import { isDemoModeActive } from './storage';

const THEME_STORAGE_KEY = 'eta_theme_preference';
const DEMO_THEME_STORAGE_KEY = 'eta_demo_theme_preference';

function getKey(): string {
  return isDemoModeActive() ? DEMO_THEME_STORAGE_KEY : THEME_STORAGE_KEY;
}

const themeMemoryStore: Record<string, string> = {};

export function getStoredThemePreference(): ThemePreference {
  if (typeof localStorage === 'undefined') {
    const memVal = themeMemoryStore[getKey()];
    if (memVal === 'light' || memVal === 'dark' || memVal === 'system') return memVal;
    return 'system';
  }
  try {
    const val = localStorage.getItem(getKey());
    if (val === 'light' || val === 'dark' || val === 'system') {
      return val;
    }
  } catch {}
  return 'system';
}

export function setStoredThemePreference(pref: ThemePreference): void {
  if (typeof localStorage === 'undefined') {
    themeMemoryStore[getKey()] = pref;
    return;
  }
  try {
    localStorage.setItem(getKey(), pref);
  } catch {}
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function applyThemeToDOM(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
}
