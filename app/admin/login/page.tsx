"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (res.ok) {
          router.push("/admin");
          router.refresh();
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errorMessage(data.error));
      } catch {
        setError("网络错误,请重试");
      }
    });
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border/50 bg-white/70 p-8 shadow-xl backdrop-blur"
      >
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold">管理后台</h1>
          <p className="text-xs text-muted-foreground">4i.codes 状态看板 · 仅限管理员</p>
        </div>

        <label className="mb-1 block text-xs text-muted-foreground">密码</label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/20"
          placeholder="请输入管理密码"
          autoComplete="current-password"
          required
        />

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || !password}
          className="mt-5 w-full rounded-full bg-foreground py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "登录中..." : "登录"}
        </button>

        <p className="mt-4 text-[10.5px] leading-relaxed text-muted-foreground/70">
          首次访问? 服务器启动时会在控制台打印一次性密码,登录后请到设置里修改。
        </p>
      </form>
    </div>
  );
}

function errorMessage(code: string | undefined): string {
  switch (code) {
    case "wrong_password":
      return "密码错误";
    case "missing_password":
      return "请输入密码";
    case "password_not_initialized":
      return "服务器还未初始化密码, 请查看启动日志";
    default:
      return "登录失败,请重试";
  }
}
