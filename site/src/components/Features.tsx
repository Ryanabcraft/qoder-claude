import { KeyRound, SlidersHorizontal, Wrench } from 'lucide-react';
import { useI18n } from '@/i18n';

const ICONS = [Wrench, KeyRound, SlidersHorizontal];

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

        <ul className="mt-14 border-t border-border">
          {t.features.items.map(({ title, body }, i) => {
            const Icon = ICONS[i] ?? Wrench;
            return (
              <li
                key={title}
                className="grid gap-4 border-b border-border py-8 sm:grid-cols-[64px_220px_1fr] sm:items-start sm:gap-8"
              >
                <span className="font-mono text-sm text-accent/80">0{i + 1}</span>
                <h3 className="flex items-center gap-3 font-display text-xl tracking-tight text-foreground">
                  <Icon className="size-4 text-accent" aria-hidden="true" />
                  {title}
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
