import { Gauge, Image, KeyRound, Layers, RefreshCcw, Search, SlidersHorizontal, Wrench } from 'lucide-react';
import { useI18n } from '@/i18n';

const ICONS = [Wrench, KeyRound, SlidersHorizontal, RefreshCcw, Layers, Search, Image, Gauge];

export function Features() {
  const { t } = useI18n();

  return (
    <section id="how" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-end">
          <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            {t.features.title}
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:pb-1">
            {t.features.intro}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.features.items.map(({ title, body }, i) => {
            const Icon = ICONS[i] ?? Wrench;
            return (
              <article
                key={title}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/60"
              >
                <Icon className="size-5 text-accent" aria-hidden="true" />
                <h3 className="mt-4 font-display text-base font-semibold tracking-tight text-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
