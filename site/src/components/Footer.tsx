import { Github } from 'lucide-react';
import { REPO } from '@/data/content';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-sm text-foreground">qoder-claude</p>

          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <a href={`${REPO}#readme`} className="transition-colors hover:text-foreground">
              README
            </a>
            <a href={`${REPO}/blob/main/LICENSE`} className="transition-colors hover:text-foreground">
              MIT
            </a>
            <a href={`${REPO}/blob/main/CONTRIBUTING.md`} className="transition-colors hover:text-foreground">
              Contributing
            </a>
            <a href={REPO} className="inline-flex items-center gap-2 transition-colors hover:text-foreground">
              <Github className="size-4" aria-hidden="true" />
              Source
            </a>
          </div>
        </div>

        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted-foreground/80">
          Not affiliated with Anthropic or Qoder. Claude Code and Claude are trademarks of
          Anthropic; Qoder is a product of its respective owner. This project is an
          interoperability bridge. Use it within the terms of the accounts you own.
        </p>
      </div>
    </footer>
  );
}
