import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { de, en, es, fr, pt, type Dict } from './dictionaries';

export type Lang = 'en' | 'pt' | 'es' | 'fr' | 'de';

export const DICTS: Record<Lang, Dict> = { en, pt, es, fr, de };
export const LANGS: Lang[] = ['en', 'pt', 'es', 'fr', 'de'];

const STORAGE_KEY = 'qoder-claude.lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && saved in DICTS) return saved;
  } catch {
    /* storage blocked */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase();
  if (nav.startsWith('pt')) return 'pt';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('de')) return 'de';
  return 'en';
}

type Ctx = { lang: Lang; t: Dict; setLang: (l: Lang) => void };

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `qoder-claude — ${DICTS[lang].hero.h1b.replace(/\.$/, '')}`;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage blocked */
    }
  }, [lang]);

  const value = useMemo(() => ({ lang, t: DICTS[lang], setLang }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}
