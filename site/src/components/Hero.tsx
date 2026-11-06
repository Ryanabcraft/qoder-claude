import { InstallTabs } from './InstallTabs';
import { FlowDiagram } from './FlowDiagram';

export function Hero() {
  return (
    <header id="top" className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
      <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
        <span className="inline-block size-1.5 rounded-full bg-accent" aria-hidden="true" />
        open source · MIT · zero runtime dependencies
      </div>

      <h1 className="mt-8 max-w-4xl font-display text-5xl leading-[1.02] tracking-[-0.03em] text-foreground sm:text-6xl md:text-7xl">
        The terminal stays.
        <br />
        The model changes.
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        qoder-claude is a local Anthropic Messages API bridge backed by the Qoder CLI.
        Claude Code keeps its tools, its prompts and its effort controls; the tokens come
        from your Qoder plan.
      </p>

      <div className="mt-10">
        <InstallTabs />
      </div>

      <p className="mt-5 font-mono text-sm text-muted-foreground">
        then open it with <span className="text-foreground">qclaude</span>
      </p>

      <FlowDiagram />
    </header>
  );
}
