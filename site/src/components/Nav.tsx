import { Github, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DISCORD, DOCS, REPO } from '@/data/content';
import { useI18n } from '@/i18n';
import { LangMenu } from './LangMenu';

export function Nav() {
  const { t } = useI18n();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('qoder-site-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const links = [
    { href: '#how', label: t.nav.how },
    { href: '#limits', label: t.nav.limits },
    { href: DOCS, label: t.nav.docs },
    { href: DISCORD, label: t.nav.discord },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="#top" className="flex items-center gap-2 font-mono text-sm tracking-tight text-foreground">
          <img src="/qoder-claude/logo.png" alt="" className="size-7 rounded-md" />
          qoder-claude
        </a>
        <div className="flex items-center gap-2 sm:gap-5">
          <div className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </div>

          <LangMenu />

          <button
            type="button"
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setDark((value) => !value)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </button>

          <a
            href={REPO}
            className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Github className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.nav.github}</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
