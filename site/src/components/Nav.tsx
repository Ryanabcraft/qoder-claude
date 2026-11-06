import { Github } from 'lucide-react';
import { REPO } from '@/data/content';
import { useI18n } from '@/i18n';
import { LangMenu } from './LangMenu';

export function Nav() {
  const { t } = useI18n();

  const links = [
    { href: '#how', label: t.nav.how },
    { href: '#limits', label: t.nav.limits },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="#top" className="font-mono text-sm tracking-tight text-foreground">
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
