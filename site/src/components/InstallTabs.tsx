import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { INSTALL } from '@/data/content';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export function InstallTabs() {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const item = INSTALL[active];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div role="tablist" aria-label="Install" className="flex flex-wrap gap-1 border-b border-border">
        {INSTALL.map((tab, i) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              'px-3 py-2 text-sm transition-colors',
              i === active
                ? 'text-foreground border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.hero.tabs[tab.id]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-3 border border-border bg-card/60 p-4">
        <Terminal className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        <code className="min-w-0 flex-1 break-all font-mono text-[13px] leading-relaxed text-foreground">
          {item.code}
        </code>
        <button
          onClick={copy}
          aria-label={copied ? t.hero.copied : 'Copy command'}
          className="shrink-0 border border-border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 h-4 font-mono text-[11px] text-muted-foreground">
        {copied ? t.hero.copied : ''}
      </p>
    </div>
  );
}
