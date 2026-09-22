import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import te from './locales/te.json';
import kn from './locales/kn.json';
import ta from './locales/ta.json';
import ml from './locales/ml.json';
import mr from './locales/mr.json';
import bn from './locales/bn.json';
import gu from './locales/gu.json';
import pa from './locales/pa.json';
import or from './locales/or.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',   nativeLabel: 'English'   },
  { code: 'hi', label: 'Hindi',     nativeLabel: 'हिन्दी'    },
  { code: 'te', label: 'Telugu',    nativeLabel: 'తెలుగు'   },
  { code: 'kn', label: 'Kannada',   nativeLabel: 'ಕನ್ನಡ'    },
  { code: 'ta', label: 'Tamil',     nativeLabel: 'தமிழ்'    },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം'   },
  { code: 'mr', label: 'Marathi',   nativeLabel: 'मराठी'     },
  { code: 'bn', label: 'Bengali',   nativeLabel: 'বাংলা'     },
  { code: 'gu', label: 'Gujarati',  nativeLabel: 'ગુજરાતી'  },
  { code: 'pa', label: 'Punjabi',   nativeLabel: 'ਪੰਜਾਬੀ'   },
  { code: 'or', label: 'Odia',      nativeLabel: 'ଓଡ଼ିଆ'    },
] as const;

export type LangCode = typeof SUPPORTED_LANGUAGES[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      te: { translation: te },
      kn: { translation: kn },
      ta: { translation: ta },
      ml: { translation: ml },
      mr: { translation: mr },
      bn: { translation: bn },
      gu: { translation: gu },
      pa: { translation: pa },
      or: { translation: or },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'te', 'kn', 'ta', 'ml', 'mr', 'bn', 'gu', 'pa', 'or'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'dukaanai_language',
      caches: ['localStorage'],
    } as object,
  });

export default i18n;
