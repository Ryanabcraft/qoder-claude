import { DOCS } from '@/data/content';
import { useI18n } from '@/i18n';
import { InstallTabs } from './InstallTabs';
import { FlowDiagram } from './FlowDiagram';

export function Hero() {
  const { t } = useI18n();

  return (
    <header id="top" className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
      <div className="grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
            <span className="inline-block size-1.5 rounded-full bg-accent" aria-hidden="true" />
            {t.hero.badge}
          </div>

          <h1 className="mt-7 max-w-3xl font-display text-4xl font-semibold leading-[1.07] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            <span className="text-accent">{t.hero.h1a}</span>
            <br />
            <span className="text-foreground">{t.hero.h1b}</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t.hero.p}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#install"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t.hero.getStarted}
            </a>
            <a
              href={DOCS}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {t.hero.readDocs}
            </a>
          </div>

          <div id="install" className="mt-10">
            <InstallTabs />
          </div>

          <p className="mt-5 font-mono text-sm text-muted-foreground">
            {t.hero.then} <span className="text-foreground">qclaude</span>
          </p>
        </div>

        <div className="hidden justify-center md:flex">
          <img
            src="/qoder-claude/logo.png"
            alt="qoder-claude"
            className="w-full max-w-[300px] rounded-2xl border border-border shadow-sm"
          />
        </div>
      </div>

      <FlowDiagram />
    </header>
  );
}
