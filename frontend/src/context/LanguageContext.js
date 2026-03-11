import { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    appName: 'PlantWise',
    myGarden: 'My Garden',
    addPlant: '+ Add Plant',
    searchPlants: 'Search your plants...',
    daysGrowing: 'days growing',
    startByAdding: 'Start by adding your first plant',
    youreGrowing: "You're growing",
    plants: 'plants',
    plant: 'plant',
    gardenEmpty: 'Your garden is empty',
    gardenEmptyDesc: 'Identify a plant by name or photo and get a complete AI-powered care guide.',
    addFirstPlant: '+ Add your first plant',
    noMatch: 'No plants match your search or filters.',
    clearAll: 'Clear all',
    clearFilters: '✕ Clear filters',
    signOut: 'Sign out',
    garden: 'Garden',
    settings: 'Settings',
    careGuide: '🌱 Care Guide',
    askAI: '💬 Ask AI',
    journal: '📓 Journal',
    back: '← Back',
    deletePlant: 'Delete this plant?',
    deleteDesc: 'This will permanently delete the plant and all its chat history, journal entries, and care guide.',
    cancel: 'Cancel',
    delete: 'Delete',
    waterLog: '💧 Water',
    watered: '✓ Watered!',
    generatingCare: 'Generating care guide...',
    logToday: '📝 Log Today',
    addPhoto: '📷 Add photo',
    saveEntry: 'Save Entry',
    noEntries: 'No entries yet. Start logging your plant journey!',
    thinking: 'Thinking...',
    all: 'All',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    expert: 'Expert',
    indoor: 'Indoor',
    outdoor: 'Outdoor',
    loadingGarden: 'Loading your garden...',
  },
  hi: {
    appName: 'PlantWise',
    myGarden: 'मेरा बगीचा',
    addPlant: '+ पौधा जोड़ें',
    searchPlants: 'अपने पौधे खोजें...',
    daysGrowing: 'दिन से बढ़ रहा है',
    startByAdding: 'अपना पहला पौधा जोड़कर शुरू करें',
    youreGrowing: 'आप',
    plants: 'पौधे उगा रहे हैं',
    plant: 'पौधा',
    gardenEmpty: 'आपका बगीचा खाली है',
    gardenEmptyDesc: 'नाम या फोटो से पौधे की पहचान करें और पूरा AI केयर गाइड पाएं।',
    addFirstPlant: '+ पहला पौधा जोड़ें',
    noMatch: 'कोई पौधा नहीं मिला।',
    clearAll: 'सब हटाएं',
    clearFilters: '✕ फ़िल्टर हटाएं',
    signOut: 'साइन आउट',
    garden: 'बगीचा',
    settings: 'सेटिंग्स',
    careGuide: '🌱 देखभाल गाइड',
    askAI: '💬 AI से पूछें',
    journal: '📓 जर्नल',
    back: '← वापस',
    deletePlant: 'यह पौधा हटाएं?',
    deleteDesc: 'यह पौधा और उसकी सभी जानकारी हमेशा के लिए हट जाएगी।',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    waterLog: '💧 पानी दें',
    watered: '✓ पानी दिया!',
    generatingCare: 'केयर गाइड बन रहा है...',
    logToday: '📝 आज का लॉग',
    addPhoto: '📷 फोटो जोड़ें',
    saveEntry: 'सेव करें',
    noEntries: 'अभी कोई एंट्री नहीं। अपनी पौधे की यात्रा शुरू करें!',
    thinking: 'सोच रहा हूं...',
    all: 'सभी',
    beginner: 'शुरुआती',
    intermediate: 'मध्यम',
    expert: 'विशेषज्ञ',
    indoor: 'घर के अंदर',
    outdoor: 'बाहर',
    loadingGarden: 'बगीचा लोड हो रहा है...',
  },
  kn: {
    appName: 'PlantWise',
    myGarden: 'ನನ್ನ ತೋಟ',
    addPlant: '+ ಗಿಡ ಸೇರಿಸಿ',
    searchPlants: 'ನಿಮ್ಮ ಗಿಡಗಳನ್ನು ಹುಡುಕಿ...',
    daysGrowing: 'ದಿನಗಳಿಂದ ಬೆಳೆಯುತ್ತಿದೆ',
    startByAdding: 'ನಿಮ್ಮ ಮೊದಲ ಗಿಡ ಸೇರಿಸುವ ಮೂಲಕ ಪ್ರಾರಂಭಿಸಿ',
    youreGrowing: 'ನೀವು',
    plants: 'ಗಿಡಗಳನ್ನು ಬೆಳೆಸುತ್ತಿದ್ದೀರಿ',
    plant: 'ಗಿಡ',
    gardenEmpty: 'ನಿಮ್ಮ ತೋಟ ಖಾಲಿಯಾಗಿದೆ',
    gardenEmptyDesc: 'ಹೆಸರು ಅಥವಾ ಫೋಟೋ ಮೂಲಕ ಗಿಡ ಗುರುತಿಸಿ ಮತ್ತು AI ಆರೈಕೆ ಮಾರ್ಗದರ್ಶಿ ಪಡೆಯಿರಿ.',
    addFirstPlant: '+ ಮೊದಲ ಗಿಡ ಸೇರಿಸಿ',
    noMatch: 'ಯಾವುದೇ ಗಿಡ ಹೊಂದಾಣಿಕೆಯಾಗಲಿಲ್ಲ.',
    clearAll: 'ಎಲ್ಲ ತೆರವು',
    clearFilters: '✕ ಫಿಲ್ಟರ್ ತೆರವು',
    signOut: 'ಸೈನ್ ಔಟ್',
    garden: 'ತೋಟ',
    settings: 'ಸೆಟ್ಟಿಂಗ್ಸ್',
    careGuide: '🌱 ಆರೈಕೆ ಮಾರ್ಗದರ್ಶಿ',
    askAI: '💬 AI ಕೇಳಿ',
    journal: '📓 ಜರ್ನಲ್',
    back: '← ಹಿಂದೆ',
    deletePlant: 'ಈ ಗಿಡ ಅಳಿಸಬೇಕೇ?',
    deleteDesc: 'ಈ ಗಿಡ ಮತ್ತು ಅದರ ಎಲ್ಲ ಮಾಹಿತಿ ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಲ್ಪಡುತ್ತದೆ.',
    cancel: 'ರದ್ದು',
    delete: 'ಅಳಿಸಿ',
    waterLog: '💧 ನೀರು ಹಾಕಿ',
    watered: '✓ ನೀರು ಹಾಕಲಾಗಿದೆ!',
    generatingCare: 'ಆರೈಕೆ ಮಾರ್ಗದರ್ಶಿ ತಯಾರಾಗುತ್ತಿದೆ...',
    logToday: '📝 ಇಂದಿನ ದಾಖಲೆ',
    addPhoto: '📷 ಫೋಟೋ ಸೇರಿಸಿ',
    saveEntry: 'ಉಳಿಸಿ',
    noEntries: 'ಇನ್ನೂ ದಾಖಲೆಗಳಿಲ್ಲ. ನಿಮ್ಮ ಗಿಡದ ಪ್ರಯಾಣ ಪ್ರಾರಂಭಿಸಿ!',
    thinking: 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...',
    all: 'ಎಲ್ಲ',
    beginner: 'ಆರಂಭಿಕ',
    intermediate: 'ಮಧ್ಯಮ',
    expert: 'ತಜ್ಞ',
    indoor: 'ಒಳಾಂಗಣ',
    outdoor: 'ಹೊರಾಂಗಣ',
    loadingGarden: 'ತೋಟ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('pw_lang') || 'en');

  function switchLang(l) {
    setLang(l);
    localStorage.setItem('pw_lang', l);
  }

  const t = translations[lang] || translations.en;

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
