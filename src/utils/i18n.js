'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const LANG_KEY = 'dreamvalley_lang';

const translations = {
  en: {
    appName: 'Dream Valley',
    // Onboarding
    onboardingTitle: 'Welcome to a world of magical stories',
    onboardingSubtitle: 'Bedtime stories, poems & songs crafted with love',
    onboardingChooseLang: 'Choose your language',
    onboardingContinue: 'Continue',
    // Auth
    loginTitle: 'What should we call you?',
    loginSubtitle: 'Pick a fun username to start your adventure',
    loginPlaceholder: 'Your dreamer name...',
    loginButton: 'Start Dreaming',
    loginLoading: 'Entering...',
    loginError: 'Oops! That didn\'t work. Try a different name.',
    // Navigation
    navHome: 'Home',
    navExplore: 'Explore',
    navMyStories: 'My Stories',
    navProfile: 'Profile',
    // Home
    homeGreeting: 'Good evening',
    homeBannerTitle: 'New stories every day!',
    homeBannerText: 'Discover magical bedtime tales crafted just for your little ones',
    homeAllThemes: 'All',
    homeTrending: 'Popular Stories',
    homeStories: 'Stories',
    homePoems: 'Poems',
    homeSongs: 'Songs',
    // Themes
    themeFantasy: 'Fantasy',
    themeAdventure: 'Adventure',
    themeAnimals: 'Animals',
    themeSpace: 'Space',
    themeOcean: 'Ocean',
    themeForest: 'Forest',
    themeMagic: 'Magic',
    themeFriendship: 'Friendship',
    themeDreamy: 'Dreamy',
    themeFairyTale: 'Fairy Tales',
    // Explore
    exploreTitle: 'Explore',
    exploreSearch: 'Search stories...',
    exploreAll: 'All',
    exploreEmpty: 'No stories found. Try a different filter!',
    // My Stories
    myStoriesTitle: 'My Stories',
    myStoriesSubtitle: 'Your favorite stories, all in one place',
    myFavorites: 'Favorites',
    mySaved: 'Saved',
    myPreferences: 'Preferences',
    myEmptyFavorites: 'No favorites yet',
    myEmptyFavoritesText: 'Tap the heart on any story to add it here!',
    myEmptySaved: 'No saved stories yet',
    myEmptySavedText: 'Save stories to read them again anytime!',
    myExplore: 'Explore Stories',
    myPrefThemes: 'Favorite Themes',
    myPrefThemesDesc: 'Select themes you enjoy',
    myPrefContent: 'Preferred Content',
    myPrefContentDesc: 'What does your child enjoy most?',
    myPrefLength: 'Story Length',
    myPrefLengthDesc: 'How long should bedtime stories be?',
    myPrefSaved: 'Preferences saved automatically',
    // Player
    playerBack: 'Back',
    playerLike: 'Like',
    playerSave: 'Save',
    playerSaved: 'Saved',
    playerShare: 'Share',
    playerLoading: 'Loading your story...',
    playerError: 'Could not load this story',
    playerNotFound: 'Story not found',
    playerNoContent: 'No content available',
    playerExplore: 'Explore Stories',
    playerMinRead: 'min read',
    playerStory: 'Story',
    playerPoems: 'Poems',
    playerSongs: 'Songs',
    playerQA: 'Questions & Answers',
    // Content types
    typeStory: 'Story',
    typePoem: 'Poem',
    typeSong: 'Song',
    // Lengths
    lengthShort: 'Short',
    lengthMedium: 'Medium',
    lengthLong: 'Long',
    lengthShortDetail: '2-3 min',
    lengthMediumDetail: '5-7 min',
    lengthLongDetail: '10-15 min',
    // Profile
    profileTitle: 'Profile',
    profileLogout: 'Logout',
    profileLanguage: 'Language',
    // Voice Onboarding
    voicePreviewTitle: 'Meet Your Narrators',
    voicePreviewSubtitle: 'Listen to each voice, then choose your favorites',
    voiceSelectTitle: 'Choose Your Narrators',
    genderPrefer: 'Which narrator do you prefer?',
    femaleNarrators: 'Female',
    maleNarrators: 'Male',
    pickPrimary: 'Choose your favorites',
    pickAlternate: 'Choose an alternate',
    primaryBadge: '1st',
    secondaryBadge: '2nd',
    alternateBadge: 'Alt',
    voiceSettings: 'Voice Settings',
    voiceSettingsDesc: 'Change your narrator preferences',
    tapToPlay: 'Tap to preview',
    nowPlaying: 'Playing...',
    getStarted: 'Get Started',
    // Misc
    loading: 'Loading...',
    minRead: 'min read',
    noStories: 'No stories yet',
  },
  hi: {
    appName: 'Sapno ki Duniya',
    // Onboarding
    onboardingTitle: 'Jaadui kahaniyon ki duniya mein aapka swagat hai',
    onboardingSubtitle: 'Sone se pehle ki kahaniyan, kavitayen aur gaane, pyaar se banaaye gaye',
    onboardingChooseLang: 'Apni bhasha chuniye',
    onboardingContinue: 'Aage badhein',
    // Auth
    loginTitle: 'Hum aapko kya bulaayein?',
    loginSubtitle: 'Ek mazedaar naam chuniye aur shuru karein',
    loginPlaceholder: 'Aapka sapno wala naam...',
    loginButton: 'Sapne dekhna shuru karein',
    loginLoading: 'Aa rahe hain...',
    loginError: 'Oho! Kuch gadbad ho gayi. Doosra naam try karein.',
    // Navigation
    navHome: 'Home',
    navExplore: 'Khojein',
    navMyStories: 'Meri Kahaniyan',
    navProfile: 'Profile',
    // Home
    homeGreeting: 'Shubh sandhya',
    homeBannerTitle: 'Har din nayi kahaniyan!',
    homeBannerText: 'Aapke chote bacchon ke liye khaas taur par banayi gayi jaadui kahaniyan',
    homeAllThemes: 'Sabhi',
    homeTrending: 'Lokpriya Kahaniyan',
    homeStories: 'Kahaniyan',
    homePoems: 'Kavitayen',
    homeSongs: 'Gaane',
    // Themes
    themeFantasy: 'Kalpana',
    themeAdventure: 'Sahas',
    themeAnimals: 'Janwar',
    themeSpace: 'Antariksh',
    themeOcean: 'Samundar',
    themeForest: 'Jungle',
    themeMagic: 'Jaadu',
    themeFriendship: 'Dosti',
    themeDreamy: 'Sapne',
    themeFairyTale: 'Pari Kathayein',
    // Explore
    exploreTitle: 'Khojein',
    exploreSearch: 'Kahaniyan khojein...',
    exploreAll: 'Sabhi',
    exploreEmpty: 'Koi kahani nahi mili. Kuch aur try karein!',
    // My Stories
    myStoriesTitle: 'Meri Kahaniyan',
    myStoriesSubtitle: 'Aapki pasandida kahaniyan, ek jagah pe',
    myFavorites: 'Pasandida',
    mySaved: 'Save ki hui',
    myPreferences: 'Pasand',
    myEmptyFavorites: 'Abhi koi pasandida nahi',
    myEmptyFavoritesText: 'Kisi bhi kahani pe dil daba ke yahan jodein!',
    myEmptySaved: 'Abhi kuch save nahi hai',
    myEmptySavedText: 'Kahaniyan save karein taaki phir se padh sakein!',
    myExplore: 'Kahaniyan dekhein',
    myPrefThemes: 'Pasandida Themes',
    myPrefThemesDesc: 'Apni pasand ke themes chuniye',
    myPrefContent: 'Pasandida Content',
    myPrefContentDesc: 'Aapke bachche ko kya zyada pasand hai?',
    myPrefLength: 'Kahani ki Lambaai',
    myPrefLengthDesc: 'Sone ki kahani kitni lambi ho?',
    myPrefSaved: 'Pasand apne aap save ho jaati hai',
    // Player
    playerBack: 'Wapas',
    playerLike: 'Pasand',
    playerSave: 'Save',
    playerSaved: 'Save hai',
    playerShare: 'Share',
    playerLoading: 'Aapki kahani load ho rahi hai...',
    playerError: 'Ye kahani load nahi ho paayi',
    playerNotFound: 'Kahani nahi mili',
    playerNoContent: 'Koi content nahi hai',
    playerExplore: 'Kahaniyan dekhein',
    playerMinRead: 'min padhne mein',
    playerStory: 'Kahani',
    playerPoems: 'Kavitayen',
    playerSongs: 'Gaane',
    playerQA: 'Sawaal Jawaab',
    // Content types
    typeStory: 'Kahani',
    typePoem: 'Kavita',
    typeSong: 'Gaana',
    // Lengths
    lengthShort: 'Chhoti',
    lengthMedium: 'Beech ki',
    lengthLong: 'Lambi',
    lengthShortDetail: '2-3 min',
    lengthMediumDetail: '5-7 min',
    lengthLongDetail: '10-15 min',
    // Profile
    profileTitle: 'Profile',
    profileLogout: 'Bahar jaayein',
    profileLanguage: 'Bhasha',
    // Voice Onboarding
    voicePreviewTitle: 'Apne Kathakaaron se Milein',
    voicePreviewSubtitle: 'Har awaaz sunein, phir apni pasand chunein',
    voiceSelectTitle: 'Apne Kathakaar Chunein',
    genderPrefer: 'Aap kaunsa kathakaar pasand karenge?',
    femaleNarrators: 'Mahila',
    maleNarrators: 'Purush',
    pickPrimary: 'Apne pasandida chunein',
    pickAlternate: 'Ek vikalp chunein',
    primaryBadge: '१',
    secondaryBadge: '२',
    alternateBadge: 'वि.',
    voiceSettings: 'Awaaz Settings',
    voiceSettingsDesc: 'Apni kathakaar pasand badlein',
    tapToPlay: 'Sunne ke liye tap karein',
    nowPlaying: 'Chal raha hai...',
    getStarted: 'Shuru Karein',
    // Misc
    loading: 'Load ho raha hai...',
    minRead: 'min padhne mein',
    noStories: 'Abhi koi kahani nahi',
  },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && (saved === 'en' || saved === 'hi')) {
      setLangState(saved);
    }
    setReady(true);
  }, []);

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem(LANG_KEY, newLang);
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations.en[key] || key;
  };

  const hasLanguage = () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(LANG_KEY);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, ready, hasLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function getLang() {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem(LANG_KEY) || 'en';
}

export function hasCompletedOnboarding() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(LANG_KEY);
}
