import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/admin/session";
import { listProviders } from "@/lib/admin/providers-store";
import { AdminClient } from "@/components/admin/admin-client";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!(await requireAuth())) {
    redirect("/admin/login");
  }
  const providers = listProviders();
  return <AdminClient initialProviders={providers} />;
}
