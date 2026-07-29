function syncDocumentLanguage(lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
}

module.exports = { syncDocumentLanguage };
