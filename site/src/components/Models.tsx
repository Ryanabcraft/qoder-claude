import { MODELS } from '@/data/content';
import DisplayCards from '@/components/ui/display-cards';
import { ArrowUpRight, KeyRound, Terminal } from 'lucide-react';

const CARD_CLASSES = [
  "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
  '[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10',
];

const CARDS = [
  {
    icon: <KeyRound className="size-4" />,
    title: 'Secrets',
    description: '',
    date: '',
    iconClassName: 'bg-muted-foreground/30 opacity-60',
    titleClassName: 'text-muted-foreground/60',
    className: `${CARD_CLASSES[0]} opacity-60`,
  },
  {
    icon: <ArrowUpRight className="size-4" />,
    title: 'Models',
    description: '',
    date: '',
    iconClassName: 'bg-accent-2 opacity-80',
    titleClassName: 'text-accent-2/80',
    className: `${CARD_CLASSES[1]} opacity-80`,
  },
  {
    icon: <Terminal className="size-4" />,
    title: 'Entry point',
    description: 'qclaude',
    date: 'boots the bridge, opens the agent',
    iconClassName: 'bg-accent',
    titleClassName: 'text-accent',
    className: CARD_CLASSES[2],
  },
];

export function Models() {
  return (
    <section id="models" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-end">
          <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Model list, not a guess
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:pb-1">
            The bridge asks{' '}
            <code className="font-mono text-sm text-foreground">qodercli --list-models</code> on
            a ten-minute cache. A new model on your plan shows up in{' '}
            <code className="font-mono text-sm text-foreground">/model</code> without a release.
          </p>
        </div>

        <ul className="mt-10 flex flex-wrap gap-2" aria-label="Available models">
          {MODELS.map((m) => (
            <li
              key={m}
              className="border border-border px-2.5 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
            >
              {m}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl justify-center overflow-hidden px-4 py-14 sm:px-6">
          <div className="origin-top scale-[0.62] pb-10 sm:scale-[0.85] lg:scale-100 lg:pb-8">
            <DisplayCards cards={CARDS} />
          </div>
        </div>
      </div>
    </section>
  );
}
