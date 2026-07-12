import { DashboardBootstrap } from "@/components/dashboard-bootstrap";
import { ClientYear } from "@/components/client-time";
import packageJson from "@/package.json";

const ESTIMATED_VERSION = `v${packageJson.version}`;

export default function Home() {
  return (
    <div className="py-8 md:py-16">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-3 sm:gap-8 sm:px-6 lg:px-12">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <div className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-border/60 bg-background/70 px-4 py-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground shadow-sm sm:self-start">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            4i.codes 状态
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            实时接口可用性看板
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            监控 <code className="font-mono text-foreground/80">api.4i.codes</code>{" "}
            各上游渠道的对话/画图/embedding 接口在过去 7 / 15 / 30 天的可用性、延迟与错误率。
          </p>
        </div>

        <DashboardBootstrap />
      </main>

      <footer className="mt-16 border-t border-border/40">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-4 px-3 py-6 sm:flex-row sm:px-6 lg:px-12">
          <div className="text-sm text-muted-foreground">
            © <ClientYear placeholder="2026" /> 4i.codes · 探测框架二开自{" "}
            <a
              href="https://github.com/BingZi-233/check-cx"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted underline-offset-4 hover:text-foreground"
            >
              check-cx
            </a>
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs text-muted-foreground shadow-sm transition hover:border-border/80 hover:text-foreground">
              <span className="font-medium opacity-70">Ver.</span>
              <span className="font-mono">{ESTIMATED_VERSION}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
