"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/utils/api-url";

interface Props {
  onClose: () => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

export function PasswordDialog({ onClose, onDone, onError }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      onError("两次新密码不一致");
      return;
    }
    if (next.length < 6) {
      onError("新密码至少 6 位");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/admin/password"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        onError(data.error === "wrong_current_password" ? "当前密码错误" : "修改失败");
        return;
      }
      onDone();
    } catch {
      onError("网络错误");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
          <h2 className="text-sm font-bold">修改管理密码</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted-foreground">当前密码</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
              autoFocus
              className="h-9 rounded-full border border-border/60 bg-background/60 px-4 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted-foreground">新密码 (至少 6 位)</label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
              className="h-9 rounded-full border border-border/60 bg-background/60 px-4 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted-foreground">确认新密码</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
              className="h-9 rounded-full border border-border/60 bg-background/60 px-4 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/60 px-4 py-1.5 text-xs hover:border-foreground/40"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "rounded-full bg-foreground px-5 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90",
              pending && "opacity-40"
            )}
          >
            {pending ? "提交中..." : "确认修改"}
          </button>
        </div>
      </form>
    </div>
  );
}
