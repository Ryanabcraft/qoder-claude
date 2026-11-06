import { REPO } from '@/data/content';
import { useI18n } from '@/i18n';

export function Limits() {
  const { t } = useI18n();

  return (
    <section id="limits" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-end">
          <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            {t.limits.title}
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:pb-1">
            {t.limits.intro}
          </p>
        </div>

        <dl className="mt-12 border-t border-border">
          {t.limits.rows.map(([term, detail]) => (
            <div
              key={term}
              className="grid gap-2 border-b border-border py-5 sm:grid-cols-[160px_1fr] sm:gap-8"
            >
              <dt className="font-mono text-sm text-accent">{term}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">{detail}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t.limits.fullA}{' '}
          <a
            href={REPO}
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-accent"
          >
            {t.limits.fullB}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
