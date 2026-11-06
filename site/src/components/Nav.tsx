import { Github } from 'lucide-react';
import { REPO } from '@/data/content';

const LINKS = [
  { href: '#how', label: 'how it works' },
  { href: '#models', label: 'models' },
  { href: '#limits', label: 'limits' },
];

export function Nav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="#top" className="font-mono text-sm tracking-tight text-foreground">
          qoder-claude
        </a>
        <div className="flex items-center gap-1 sm:gap-5">
          <div className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </div>
          <a
            href={REPO}
            className="ml-2 inline-flex items-center gap-2 border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Github className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
