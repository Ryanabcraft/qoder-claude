import { useI18n } from '@/i18n';
import { InstallTabs } from './InstallTabs';
import { FlowDiagram } from './FlowDiagram';

export function Hero() {
  const { t } = useI18n();

  return (
    <header id="top" className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
      <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
        <span className="inline-block size-1.5 rounded-full bg-accent" aria-hidden="true" />
        {t.hero.badge}
      </div>

      <h1 className="mt-8 max-w-4xl font-display text-5xl leading-[1.02] tracking-[-0.03em] text-foreground sm:text-6xl md:text-7xl">
        {t.hero.h1a}
        <br />
        {t.hero.h1b}
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t.hero.p}</p>

      <div className="mt-10">
        <InstallTabs />
      </div>

      <p className="mt-5 font-mono text-sm text-muted-foreground">
        {t.hero.then} <span className="text-foreground">qclaude</span>
      </p>

      <FlowDiagram />
    </header>
  );
}
