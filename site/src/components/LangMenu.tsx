import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { DICTS, LANGS, useI18n, type Lang } from '@/i18n';
import { cn } from '@/lib/utils';

export function LangMenu() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => {
      list.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  const onListKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(list.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? at + 1 : at - 1;
    items[(next + items.length) % items.length]?.focus();
  };

  const pick = (l: Lang) => {
    setLang(l);
    setOpen(false);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.menu.label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors',
          open ? 'border-primary text-foreground' : 'hover:border-primary hover:text-foreground',
        )}
      >
        <span className="font-mono text-[11px] text-accent">{DICTS[lang].langCode}</span>
        <span className="hidden sm:inline">{DICTS[lang].langName}</span>
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      <div
        className={cn(
          'absolute right-0 z-50 mt-2 w-60 origin-top-right border border-border bg-card/95 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-200 ease-out',
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-1 scale-95 opacity-0',
        )}
        aria-hidden={!open}
      >
        <ul
          ref={list}
          role="listbox"
          aria-label={t.menu.choose}
          onKeyDown={onListKey}
          className="lang-scroll max-h-72 overflow-y-auto p-1"
        >
          {LANGS.map((l) => {
            const d = DICTS[l];
            const selected = l === lang;
            return (
              <li key={l} role="option" aria-selected={selected}>
                <button
                  type="button"
                  tabIndex={open ? 0 : -1}
                  onClick={() => pick(l)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                    selected
                      ? 'bg-accent/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span className="w-7 shrink-0 font-mono text-[11px] text-accent/90">{d.langCode}</span>
                  <span className="min-w-0 flex-1 truncate">{d.langName}</span>
                  {selected && <Check className="size-4 shrink-0 text-accent" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
