import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronUp } from 'lucide-react';
import { languages } from '@/lib/i18n';

const LANGUAGE_CHOSEN_KEY = 'bguard_language_chosen';

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasChosenLanguage, setHasChosenLanguage] = useState(false);

  useEffect(() => {
    const chosen = localStorage.getItem(LANGUAGE_CHOSEN_KEY);
    setHasChosenLanguage(chosen === 'true');
  }, []);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    localStorage.setItem(LANGUAGE_CHOSEN_KEY, 'true');
    setHasChosenLanguage(true);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 hidden md:block" data-testid="language-selector">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-2 border-b border-gray-700/50">
              <span className="text-xs text-gray-400 px-2">Select Language</span>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    i18n.language === lang.code
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                  }`}
                  data-testid={`lang-option-${lang.code}`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.name}</span>
                  {i18n.language === lang.code && (
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ${
          hasChosenLanguage ? 'p-2.5' : 'px-4 py-2.5'
        } bg-gray-900/90 backdrop-blur-md border border-gray-700/50 rounded-full shadow-lg hover:border-cyan-500/50 hover:shadow-cyan-500/20 transition-all group`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        data-testid="button-language-toggle"
        title={hasChosenLanguage ? `${currentLang.name} - Click to change` : 'Select language'}
      >
        <Globe className="w-4 h-4 text-cyan-400" />
        {!hasChosenLanguage && (
          <>
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              {currentLang.flag} {currentLang.name}
            </span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp className="w-4 h-4 text-gray-500" />
            </motion.div>
          </>
        )}
      </motion.button>
    </div>
  );
}
