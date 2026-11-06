import { KeyRound, SlidersHorizontal, Wrench } from 'lucide-react';

const ITEMS = [
  {
    icon: Wrench,
    title: 'Tool calls',
    body: 'Claude Code still receives tool_use blocks. The bridge negotiates the call as text and converts it before it reaches the client, so Read, Write, Edit, Bash and Agent behave the same.',
  },
  {
    icon: KeyRound,
    title: 'Credentials',
    body: 'The Qoder token never crosses the bridge. The CLI reads its own store, signs its own requests and owns its session; the bridge only talks to it over stdio.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Your controls',
    body: 'Model picker, effort slider, thinking budget, statusline. The values you set in Claude Code arrive at the model unchanged, because the bridge forwards them.',
  },
];

export function Features() {
  return (
    <section id="how" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-end">
          <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            What does not move
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:pb-1">
            Only the model behind the curtain changes. Everything you interact with —
            commands, tools, permissions, config — stays exactly where it was.
          </p>
        </div>

        <ul className="mt-14 border-t border-border">
          {ITEMS.map(({ icon: Icon, title, body }, i) => (
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
          ))}
        </ul>
      </div>
    </section>
  );
}
