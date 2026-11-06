import { LIMITS, REPO } from '@/data/content';

export function Limits() {
  return (
    <section id="limits" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-end">
          <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Where it hurts
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:pb-1">
            The honest list. If any of these breaks your workflow, the bridge is not the
            right tool — and it is better to know before installing.
          </p>
        </div>

        <dl className="mt-12 border-t border-border">
          {LIMITS.map(([term, detail]) => (
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
          Full detail, including the reason the API cannot be called directly, lives in the{' '}
          <a href={REPO} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-accent">
            repository
          </a>
          .
        </p>
      </div>
    </section>
  );
}
