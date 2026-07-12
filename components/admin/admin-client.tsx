"use client";

import { useCallback, useMemo, useState } from "react";
import { LogOut, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import type { ProviderSummary } from "@/lib/admin/providers-store";
import { ProviderEditor } from "@/components/admin/provider-editor";
import { PasswordDialog } from "@/components/admin/password-dialog";
import { VendorBadge } from "@/components/vendor-badge";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/utils/api-url";

interface Props {
  initialProviders: ProviderSummary[];
}

export function AdminClient({ initialProviders }: Props) {
  const [providers, setProviders] = useState<ProviderSummary[]>(initialProviders);
  const [editing, setEditing] = useState<ProviderSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [flash, setFlash] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);

  const showFlash = useCallback((tone: "ok" | "err", msg: string) => {
    setFlash({ tone, msg });
    setTimeout(() => setFlash(null), 3000);
  }, []);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/admin/providers"), {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("reload_failed");
      const data = (await res.json()) as { providers: ProviderSummary[] };
      setProviders(data.providers);
    } catch {
      showFlash("err", "加载失败");
    }
  }, [showFlash]);

  const handleDelete = useCallback(
    async (p: ProviderSummary) => {
      if (!confirm(`确认删除 [${p.name}] (${p.groupName ?? "默认"} · ${p.model})?`)) return;
      try {
        const res = await fetch(apiUrl("/api/admin/providers"), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: { name: p.name, groupName: p.groupName, model: p.model },
          }),
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error();
        showFlash("ok", "已删除");
        reload();
      } catch {
        showFlash("err", "删除失败");
      }
    },
    [reload, showFlash]
  );

  const handleLogout = useCallback(async () => {
    await fetch(apiUrl("/api/admin/logout"), {
      method: "POST",
      credentials: "same-origin",
    });
    window.location.href = apiUrl("/admin/login");
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ProviderSummary[]>();
    for (const p of providers) {
      const k = p.groupName ?? "默认渠道";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [providers]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-6 sm:px-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col leading-tight">
          <h1 className="text-2xl font-black tracking-tight">4i.codes 管理后台</h1>
          <p className="text-xs text-muted-foreground">
            维护 provider 探测配置 · 修改密码 · 全部数据仅保留在你自己的服务器
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setChangingPassword(true)}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border/50 bg-white/40 px-3.5 text-xs text-foreground/80 backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
            修改密码
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-xs font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            新增 provider
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground transition-colors hover:border-rose-400 hover:text-rose-500"
            title="退出登录"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* flash */}
      {flash && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            flash.tone === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-rose-300 bg-rose-50 text-rose-700"
          )}
        >
          {flash.msg}
        </div>
      )}

      {/* provider 列表 (分组) */}
      {providers.length === 0 && (
        <div className="rounded-2xl border border-border/50 bg-white/50 p-8 text-center text-sm text-muted-foreground">
          还没有 provider,点击右上角"新增 provider"添加。
        </div>
      )}

      {grouped.map(([groupName, list]) => (
        <div key={groupName} className="rounded-2xl border border-border/50 bg-white/40 backdrop-blur">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-2 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
              {groupName}
              <span className="text-muted-foreground/70">· {list.length}</span>
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-2 text-left font-semibold">名称</th>
                <th className="px-2 py-2 text-left font-semibold">类型</th>
                <th className="px-2 py-2 text-left font-semibold">模型</th>
                <th className="px-2 py-2 text-left font-semibold">API Key</th>
                <th className="px-2 py-2 text-left font-semibold">价格</th>
                <th className="px-2 py-2 text-center font-semibold">基线天</th>
                <th className="px-2 py-2 text-center font-semibold">状态</th>
                <th className="pr-4 py-2 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => (
                <tr
                  key={`${p.name}-${p.model}-${i}`}
                  className={cn(
                    "border-t border-border/30 transition-colors hover:bg-white/60",
                    i % 2 === 1 && "bg-white/25"
                  )}
                >
                  <td className="px-4 py-2 align-middle">
                    <div className="flex items-center gap-2">
                      <VendorBadge iconKey={p.iconKey} vendor={p.vendor} />
                      <div className="flex flex-col leading-tight">
                        <span className="font-semibold">{p.name}</span>
                        {p.service && p.service !== p.name && (
                          <span className="text-[10.5px] text-muted-foreground">{p.service}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 align-middle font-mono text-[11.5px]">
                    <div className="flex flex-col leading-tight">
                      <span>{p.type}</span>
                      {p.disguise && p.disguise !== "none" && (
                        <span className="text-[10px] text-amber-600">
                          伪装: {p.disguise}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-middle font-mono text-[11.5px]">
                    <div className="flex flex-col leading-tight">
                      <span>{p.model}</span>
                      {p.models.length > 1 && (
                        <span className="text-muted-foreground text-[10px]">
                          + {p.models.length - 1} 展示
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-middle font-mono text-[11.5px] text-muted-foreground">
                    {p.apiKeyMasked || "—"}
                  </td>
                  <td className="px-2 py-2 align-middle font-mono text-[11.5px]">
                    {p.priceRatio ? (
                      <div className="flex flex-col leading-tight">
                        <span>{p.priceRatio}</span>
                        {p.priceHint && (
                          <span className="text-muted-foreground text-[10px]">{p.priceHint}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center align-middle font-mono text-[11.5px]">
                    {p.baselineDays ?? "—"}
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    {!p.enabled ? (
                      <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] text-slate-600">
                        禁用
                      </span>
                    ) : p.is_maintenance ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-600">
                        维护
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600">
                        启用
                      </span>
                    )}
                  </td>
                  <td className="pr-4 py-2 text-right align-middle">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(p)}
                        className="rounded-md border border-border/50 bg-white p-1.5 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                        title="编辑"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        className="rounded-md border border-border/50 bg-white p-1.5 text-muted-foreground transition-colors hover:border-rose-400 hover:text-rose-500"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* 抽屉/dialog */}
      {(editing || creating) && (
        <ProviderEditor
          existing={editing ?? undefined}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            reload();
            showFlash("ok", "已保存");
          }}
          onError={(msg) => showFlash("err", msg)}
        />
      )}
      {changingPassword && (
        <PasswordDialog
          onClose={() => setChangingPassword(false)}
          onDone={() => {
            setChangingPassword(false);
            showFlash("ok", "密码已修改");
          }}
          onError={(msg) => showFlash("err", msg)}
        />
      )}
    </div>
  );
}
