import { Github } from 'lucide-react';
import { REPO } from '@/data/content';
import { useI18n } from '@/i18n';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <img src="/qoder-claude/logo.png" alt="" className="size-8 rounded-md" />
              <p className="font-mono text-sm text-foreground">
                qoder-claude{' '}
                <span className="text-muted-foreground/70">v{__APP_VERSION__}</span>
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Made by{' '}
              <a
                href="https://github.com/Ryanabcraft"
                className="text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Ryanabcraft
              </a>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <a href={`${REPO}#readme`} className="transition-colors hover:text-foreground">
              {t.footer.readme}
            </a>
            <a href={`${REPO}/blob/main/LICENSE`} className="transition-colors hover:text-foreground">
              {t.footer.mit}
            </a>
            <a
              href={`${REPO}/blob/main/CONTRIBUTING.md`}
              className="transition-colors hover:text-foreground"
            >
              {t.footer.contributing}
            </a>
            <a
              href={REPO}
              className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
            >
              <Github className="size-4" aria-hidden="true" />
              {t.footer.source}
            </a>
          </div>
        </div>

        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted-foreground/80">
          {t.footer.disclaimer}
        </p>
      </div>
    </footer>
  );
}
