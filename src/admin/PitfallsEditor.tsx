import { useMemo, useState } from "react";
import {
  nextPitfallId,
  parsePitfallDetails,
  pitfallsToMarkdown,
  type PitfallDetail,
} from "@shared/docs";
import type { WiringNode } from "@shared/wiring";
import { DeviceChips } from "./DeviceChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

/**
 * Structured pitfalls editor: each entry is an issue, what is actually wrong,
 * and the solution. Saving writes the markdown the agent and Explore read.
 */
export function PitfallsEditor({
  content,
  nodes = [],
  initialOpen,
  onSave,
  onCancel,
}: {
  content: string;
  nodes?: WiringNode[];
  /** Pitfall id to expand first (from clicking it in the list). */
  initialOpen?: string;
  onSave: (markdown: string) => Promise<void>;
  onCancel: () => void;
}) {
  const initial = useMemo(() => parsePitfallDetails(content), [content]);
  const [list, setList] = useState<PitfallDetail[]>(() =>
    initial.pitfalls.map((p) => ({ ...p, nodes: [...p.nodes], check: [...p.check], extra: [...p.extra] })),
  );
  const [open, setOpen] = useState<string | null>(
    initialOpen ?? (initial.pitfalls.length === 0 ? null : initial.pitfalls[0]!.id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const markdown = useMemo(
    () => pitfallsToMarkdown(list, initial.preamble),
    [list, initial.preamble],
  );
  const dirty = markdown.trim() !== content.trim();

  function update(id: string, patch: Partial<PitfallDetail>) {
    setList((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function add() {
    const id = nextPitfallId(list);
    setList((l) => [
      ...l,
      { id, title: "", nodes: [], issue: "", check: [], solution: "", extra: [] },
    ]);
    setOpen(id);
  }
  function remove(id: string) {
    if (!confirm(`Remove ${id}? Runbook steps that point at it will need updating.`))
      return;
    setList((l) => l.filter((p) => p.id !== id));
    if (open === id) setOpen(null);
  }
  async function save() {
    const missing = list.filter((p) => !p.title.trim());
    if (missing.length) {
      setError(`${missing.map((p) => p.id).join(", ")}: the issue needs a name.`);
      setOpen(missing[0]!.id);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await onSave(markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const actions = (
    <>
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
        <X className="size-4" /> Cancel
      </Button>
      <Button size="sm" onClick={() => void save()} disabled={busy || !dirty}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Save changes
      </Button>
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" /> Add pitfall
        </Button>
        <span className="text-muted-foreground text-xs">
          {list.length} pitfall{list.length === 1 ? "" : "s"}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {list.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No pitfalls yet. Click "Add pitfall" and describe the problem, what
          is actually wrong, and the solution.
        </p>
      )}
      <div className="space-y-2">
        {list.map((p) => (
          <PitfallRow
            key={p.id}
            pitfall={p}
            nodes={nodes}
            open={open === p.id}
            onToggle={() => setOpen(open === p.id ? null : p.id)}
            onChange={(patch) => update(p.id, patch)}
            onRemove={() => remove(p.id)}
            actions={actions}
          />
        ))}
      </div>
      {/* With a pitfall open, these sit beside its Delete button instead. */}
      {!list.some((p) => p.id === open) && (
        <div className="flex justify-end gap-2">{actions}</div>
      )}
    </div>
  );
}

function PitfallRow({
  pitfall: p,
  nodes,
  open,
  onToggle,
  onChange,
  onRemove,
  actions,
}: {
  pitfall: PitfallDetail;
  nodes: WiringNode[];
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<PitfallDetail>) => void;
  onRemove: () => void;
  /** Cancel / Save, shown next to Delete at the bottom of the open pitfall. */
  actions: React.ReactNode;
}) {
  const [more, setMore] = useState(Boolean(p.check.length || p.lastSeen));
  return (
    <div className="bg-background rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
      >
        {open ? (
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        )}
        <Badge variant="outline" className="font-mono">
          {p.id}
        </Badge>
        <span className={cn("min-w-0 flex-1 truncate", !p.title && "text-muted-foreground italic")}>
          {p.title || "Untitled issue"}
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t px-3 py-3">
          <Field label="The issue (as someone would say it on Sunday)">
            <Input
              autoFocus={!p.title}
              value={p.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Everything from front of house sounds glitchy"
            />
          </Field>
          <Field label="Issue description (what is actually wrong)">
            <Textarea
              rows={3}
              value={p.issue}
              onChange={(e) => onChange({ issue: e.target.value })}
              placeholder="The master clock on the LV1 console is not synced."
            />
          </Field>
          <Field label="Solution">
            <Textarea
              rows={3}
              value={p.solution}
              onChange={(e) => onChange({ solution: e.target.value })}
              placeholder="Set the master clock on the LV1 console to Stage Rack 3."
            />
          </Field>
          {nodes.length > 0 && (
            <Field label="Devices involved (from the wiring diagram)">
              <DeviceChips
                nodes={nodes}
                selected={p.nodes}
                onToggle={(id) =>
                  onChange({
                    nodes: p.nodes.includes(id)
                      ? p.nodes.filter((x) => x !== id)
                      : [...p.nodes, id],
                  })
                }
              />
            </Field>
          )}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
            onClick={() => setMore((m) => !m)}
          >
            {more ? "Hide" : "Show"} steps to check and last seen
          </button>
          {more && (
            <>
              <Field label="Steps to check, in order (one per line)">
                <Textarea
                  rows={3}
                  value={p.check.join("\n")}
                  onChange={(e) =>
                    onChange({
                      check: e.target.value
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder={"Check the clock source on the LV1\nCheck the stage rack link light"}
                />
              </Field>
              <Field label="Last seen">
                <Input
                  value={p.lastSeen ?? ""}
                  onChange={(e) =>
                    onChange({ lastSeen: e.target.value || undefined })
                  }
                  placeholder="2026-09-14 (who fixed it, what it turned out to be)"
                />
              </Field>
            </>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="destructive" size="sm" onClick={onRemove}>
              <Trash2 className="size-4" /> Delete pitfall
            </Button>
            {actions}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
