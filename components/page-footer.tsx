"use client";

import { ClientYear } from "@/components/client-time";
import { useLocale } from "@/lib/i18n/context";
import packageJson from "@/package.json";

const ESTIMATED_VERSION = `v${packageJson.version}`;

export function PageFooter() {
  const { t } = useLocale();
  return (
    <footer className="mt-8 border-t border-border/40">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6">
        <div className="text-xs text-muted-foreground">
          © <ClientYear placeholder="2026" /> 4i.codes
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs text-muted-foreground shadow-sm transition hover:border-border/80 hover:text-foreground">
          <span className="font-medium opacity-70">{t.meta.ver}</span>
          <span className="font-mono">{ESTIMATED_VERSION}</span>
        </div>
      </div>
    </footer>
  );
}
