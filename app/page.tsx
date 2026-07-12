import { DashboardBootstrap } from "@/components/dashboard-bootstrap";
import { PageFooter } from "@/components/page-footer";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-76px)] flex-col pb-8 pt-4 md:pt-6">
      <main className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col gap-5 px-4 sm:gap-6 sm:px-8">
        <DashboardBootstrap />
      </main>
      <PageFooter />
    </div>
  );
}
