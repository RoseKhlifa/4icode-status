import { DashboardBootstrap } from "@/components/dashboard-bootstrap";
import { PageFooter } from "@/components/page-footer";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-76px)] flex-col pb-6 pt-2 md:pt-4">
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 sm:gap-5 sm:px-6">
        <DashboardBootstrap />
      </main>
      <PageFooter />
    </div>
  );
}
