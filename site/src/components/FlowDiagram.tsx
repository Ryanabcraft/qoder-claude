import { useI18n } from '@/i18n';

export function FlowDiagram() {
  const { t } = useI18n();

  return (
    <div
      className="relative mt-14 w-full"
      role="img"
      aria-label={`Request path: ${t.hero.flow.map((s) => s.name).join(' to ')}`}
    >
      <div className="relative hidden h-px w-full bg-gradient-to-r from-transparent via-border to-transparent md:block">
        <span className="travel absolute -top-[3px] size-[7px] rounded-full bg-accent shadow-[0_0_12px_var(--accent)]" />
      </div>

      <ol className="mt-6 grid gap-8 md:grid-cols-4 md:gap-4">
        {t.hero.flow.map((step, i) => (
          <li key={step.name} className="relative border-l border-border pl-4 md:border-l-0 md:pl-0">
            <span className="font-mono text-[11px] text-accent/80">0{i + 1}</span>
            <p className="mt-2 font-display text-lg tracking-tight text-foreground">{step.name}</p>
            <p className="mt-1 max-w-[18ch] text-sm leading-snug text-muted-foreground">{step.note}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
