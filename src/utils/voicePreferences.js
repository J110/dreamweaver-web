'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { VOICES, getVoiceId } from './voiceConfig';

const PREFS_KEY = 'dreamvalley_voice_prefs';

/**
 * Voice preferences shape:
 * {
 *   preferredVoice: 'female_1',  // base ID (no _hi suffix)
 *   completed: true
 * }
 */

const VoicePrefsContext = createContext(null);

export function VoicePreferencesProvider({ children }) {
  const [voicePrefs, setVoicePrefsState] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        let parsed = JSON.parse(saved);
        if (parsed && parsed.completed) {
          // Migrate old format (primaryVoice → preferredVoice)
          if (parsed.primaryVoice && !parsed.preferredVoice) {
            parsed = { preferredVoice: parsed.primaryVoice, completed: true };
            localStorage.setItem(PREFS_KEY, JSON.stringify(parsed));
          }
          setVoicePrefsState(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load voice preferences:', e);
    }
    setReady(true);
  }, []);

  const setVoicePrefs = (prefs) => {
    const updated = { ...prefs, completed: true };
    setVoicePrefsState(updated);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save voice preferences:', e);
    }
  };

  const hasVoicePrefs = !!(voicePrefs && voicePrefs.completed);

  /**
   * Get ordered voice IDs: preferred voice first, then all others.
   * Used by the player for voice switch ordering.
   */
  const getStoryVoices = (lang) => {
    const preferred = voicePrefs?.preferredVoice || 'female_1';
    const allIds = Object.keys(VOICES);
    const ordered = [preferred, ...allIds.filter(id => id !== preferred)];
    return ordered.map((id) => getVoiceId(id, lang));
  };

  /**
   * Get the default voice ID (preferred voice with language suffix).
   */
  const getDefaultVoice = (lang) => {
    const baseId = voicePrefs?.preferredVoice || 'female_1';
    return getVoiceId(baseId, lang);
  };

  return (
    <VoicePrefsContext.Provider
      value={{ voicePrefs, setVoicePrefs, hasVoicePrefs, getStoryVoices, getDefaultVoice, ready }}
    >
      {children}
    </VoicePrefsContext.Provider>
  );
}

export function useVoicePreferences() {
  const ctx = useContext(VoicePrefsContext);
  if (!ctx) throw new Error('useVoicePreferences must be used within VoicePreferencesProvider');
  return ctx;
}

export function hasVoicePrefsCompleted() {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return !!(parsed && parsed.completed);
    }
  } catch {
    // ignore
  }
  return false;
}
