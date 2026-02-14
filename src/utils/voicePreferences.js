'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getVoiceId } from './voiceConfig';

const PREFS_KEY = 'dreamvalley_voice_prefs';

/**
 * Voice preferences shape:
 * {
 *   preferredGender: 'female' | 'male',
 *   primaryVoice: 'female_1',      // base ID (no _hi suffix)
 *   secondaryVoice: 'female_2',
 *   alternateVoice: 'male_1',      // primary for non-preferred gender
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
        const parsed = JSON.parse(saved);
        if (parsed && parsed.completed) {
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
   * Get the 3 voice IDs for a story, respecting language suffix.
   * Returns [primaryVoice, secondaryVoice, alternateVoice] with _hi if needed.
   */
  const getStoryVoices = (lang) => {
    if (!voicePrefs) {
      // Default fallback
      const defaults = ['female_1', 'female_2', 'male_1'];
      return defaults.map((id) => getVoiceId(id, lang));
    }
    return [
      getVoiceId(voicePrefs.primaryVoice, lang),
      getVoiceId(voicePrefs.secondaryVoice, lang),
      getVoiceId(voicePrefs.alternateVoice, lang),
    ];
  };

  /**
   * Get the default voice ID for a story (primary voice with language suffix).
   */
  const getDefaultVoice = (lang) => {
    const baseId = voicePrefs?.primaryVoice || 'female_1';
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
