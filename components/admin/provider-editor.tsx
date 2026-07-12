"use client";

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import type { ProviderSummary } from "@/lib/admin/providers-store";
import { cn } from "@/lib/utils";

interface Props {
  existing?: ProviderSummary;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

const VENDOR_OPTIONS = ["Cursor", "OpenAI", "Google", "Anthropic", "xAI", "其他"];
const TYPE_OPTIONS = [
  { value: "openai", label: "openai (Chat Completions / Responses)" },
  { value: "anthropic", label: "anthropic (/v1/messages 原生)" },
  { value: "gemini", label: "gemini (原生 API / OpenAI 兼容)" },
];
const ICON_OPTIONS = [
  { key: "cc", label: "CC · Claude / Cursor" },
  { key: "cx", label: "CX · Codex" },
  { key: "gpt", label: "GPT · OpenAI" },
  { key: "gm", label: "GM · Gemini" },
  { key: "gk", label: "GK · Grok" },
  { key: "an", label: "AN · Anthropic" },
];
const DISGUISE_OPTIONS = [
  { value: "none", label: "无伪装 (SDK 默认)" },
  { value: "claude-code", label: "Claude Code CLI (推荐给 Claude 反向渠道)" },
];

export function ProviderEditor({ existing, onClose, onSaved, onError }: Props) {
  const isNew = !existing;
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(existing?.name ?? "");
  const [vendor, setVendor] = useState(existing?.vendor ?? "OpenAI");
  const [service, setService] = useState(existing?.service ?? "");
  const [category, setCategory] = useState(existing?.category ?? "Chat");
  const [iconKey, setIconKey] = useState(existing?.iconKey ?? "gpt");
  const [type, setType] = useState(existing?.type ?? "openai");
  const [endpoint, setEndpoint] = useState(
    existing?.endpoint ?? "https://api.4i.codes/v1/chat/completions"
  );
  const [model, setModel] = useState(existing?.model ?? "");
  const [modelsStr, setModelsStr] = useState(
    existing?.models?.join("\n") ?? existing?.model ?? ""
  );
  const [apiKey, setApiKey] = useState("");
  const [groupName, setGroupName] = useState(existing?.groupName ?? "主渠道");
  const [priceRatio, setPriceRatio] = useState(existing?.priceRatio ?? "");
  const [priceHint, setPriceHint] = useState(existing?.priceHint ?? "");
  const [baselineDays, setBaselineDays] = useState<string>(
    existing?.baselineDays ? String(existing.baselineDays) : ""
  );
  const [disguise, setDisguise] = useState<string>(existing?.disguise ?? "none");
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [isMaintenance, setIsMaintenance] = useState(existing?.is_maintenance ?? false);

  useEffect(() => {
    // esc close
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const modelsArr = useMemo(
    () =>
      modelsStr
        .split(/\r?\n/)
        .map((m) => m.trim())
        .filter(Boolean),
    [modelsStr]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !model || !endpoint) return;
    if (isNew && !apiKey) {
      onError("新增时必须填 API key");
      return;
    }
    setSaving(true);
    try {
      const body = {
        originalKey: existing
          ? { name: existing.name, groupName: existing.groupName, model: existing.model }
          : undefined,
        entry: {
          name,
          type,
          endpoint,
          model,
          apiKey: apiKey || undefined,
          groupName: groupName || null,
          category: category || null,
          vendor: vendor || null,
          service: service || name,
          iconKey: iconKey || null,
          models: modelsArr.length > 0 ? modelsArr : undefined,
          priceRatio: priceRatio || null,
          priceHint: priceHint || null,
          baselineDays: baselineDays ? Number(baselineDays) : null,
          disguise: disguise === "none" ? null : disguise,
          enabled,
          is_maintenance: isMaintenance,
        },
      };
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        onError(`保存失败: ${data.error ?? res.statusText}`);
        return;
      }
      onSaved();
    } catch {
      onError("网络错误,请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
          <h2 className="text-sm font-bold">
            {isNew ? "新增 provider" : `编辑 ${existing?.name}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="名称 (显示在表格首列)" required>
              <Input value={name} onChange={setName} placeholder="cc-kiro" />
            </Field>
            <Field label="通道 (groupName)">
              <Input value={groupName} onChange={setGroupName} placeholder="主渠道" />
            </Field>
            <Field label="服务商">
              <Select value={vendor} onChange={setVendor} options={VENDOR_OPTIONS} />
            </Field>
            <Field label="分类 (筛选下拉)">
              <Input value={category} onChange={setCategory} placeholder="Chat" />
            </Field>
            <Field label="服务名 (可与名称不同)">
              <Input value={service} onChange={setService} placeholder="cc-kiro" />
            </Field>
            <Field label="图标 iconKey">
              <select
                value={iconKey}
                onChange={(e) => setIconKey(e.target.value)}
                className="h-8 w-full rounded-full border border-border/60 bg-background/60 px-3 text-xs"
              >
                {ICON_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="协议 (type)" required>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-8 w-full rounded-full border border-border/60 bg-background/60 px-3 text-xs"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="探测模型 (实际发的 model)" required>
              <Input value={model} onChange={setModel} placeholder="gpt-5-mini" />
            </Field>

            <Field label="Endpoint" required className="col-span-2">
              <Input value={endpoint} onChange={setEndpoint} />
            </Field>

            <Field
              label="伪装模板"
              className="col-span-2"
              hint="Claude 反向渠道通常要求伪装成 Claude Code CLI 才能通过校验"
            >
              <select
                value={disguise}
                onChange={(e) => setDisguise(e.target.value)}
                className="h-8 w-full rounded-full border border-border/60 bg-background/60 px-3 text-xs"
              >
                {DISGUISE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={
                isNew
                  ? "API Key (必填)"
                  : `API Key (留空保留原值: ${existing?.apiKeyMasked || "未设置"})`
              }
              className="col-span-2"
              required={isNew}
            >
              <Input
                type="password"
                value={apiKey}
                onChange={setApiKey}
                placeholder={isNew ? "sk-..." : "留空则保留"}
                autoComplete="new-password"
              />
            </Field>

            <Field label="展示模型 (一行一个)" className="col-span-2">
              <textarea
                value={modelsStr}
                onChange={(e) => setModelsStr(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-mono text-xs"
                placeholder="sonnet-4.6&#10;opus-4.8"
              />
            </Field>

            <Field label="价格倍率 (顶行)">
              <Input value={priceRatio} onChange={setPriceRatio} placeholder="≤0.8×" />
            </Field>
            <Field label="价格提示 (底行)">
              <Input value={priceHint} onChange={setPriceHint} placeholder="0.7~" />
            </Field>

            <Field
              label="稳定运行基线天数 (对外展示的最小值)"
              className="col-span-2"
              hint="真实天数超过基线后按真实的显示。留空 = 不设基线"
            >
              <Input
                type="number"
                value={baselineDays}
                onChange={setBaselineDays}
                placeholder="15"
              />
            </Field>

            <Field label="启用" className="col-span-1">
              <label className="flex h-8 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                启用 (关闭后不再探测,也不显示在看板)
              </label>
            </Field>
            <Field label="维护中" className="col-span-1">
              <label className="flex h-8 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={isMaintenance}
                  onChange={(e) => setIsMaintenance(e.target.checked)}
                />
                维护中 (看板显示"维护中"徽章)
              </label>
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/60 px-4 py-1.5 text-xs text-foreground/80 hover:border-foreground/40"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className={cn(
              "rounded-full bg-foreground px-5 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90",
              saving && "opacity-40"
            )}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
 * 小组件
 * ============================================================ */
function Field({
  label,
  hint,
  children,
  required,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-[10.5px] text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
      {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="h-8 rounded-full border border-border/60 bg-background/60 px-3 text-xs focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/20"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full rounded-full border border-border/60 bg-background/60 px-3 text-xs"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
