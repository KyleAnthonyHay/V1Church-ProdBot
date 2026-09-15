import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  diffWiring,
  mergeInternalWiring,
  wiringToYaml,
  type WiringGraph,
  type WiringNode,
} from "@shared/wiring";
import { Button } from "@/components/ui/button";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { LogoMark } from "@/components/Logo";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { cn } from "@/lib/utils";
import { ArrowUp, ChevronDown, Loader2, Plus } from "lucide-react";

type Turn = { role: "user" | "assistant"; text: string; error?: boolean };

const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

/** "now", "5m", "3h", "3d", "2mo", "1y": how long ago a chat was used. */
function ago(ms: number) {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d`;
  if (s < 86400 * 365) return `${Math.floor(s / (86400 * 30))}mo`;
  return `${Math.floor(s / (86400 * 365))}y`;
}

/**
 * Chat panel for the diagram workspace: describe the wiring, the agent draws
 * it on the canvas. With a `parent` device each message redraws that device's
 * complete internal wiring; without one it updates the whole campus. Either
 * way the canvas is the state, so follow-ups like "swap the adapter for a
 * Clarett" or "remove the demo box" work.
 *
 * Chats are saved per campus. The picker at the top switches between them and
 * "+" starts a new one; a new chat is only stored once its first message is
 * sent.
 */
export function WiringChat({
  campusId,
  parent,
  graph,
  onGraph,
}: {
  campusId: Id<"campuses"> | undefined;
  /** Scope: inside this device. Omit for the whole campus. */
  parent?: WiringNode;
  graph: WiringGraph;
  onGraph: (next: WiringGraph) => void;
}) {
  const draft = useAction(api.ai.draftWiring);
  const createChat = useMutation(api.wiringChats.create);
  const appendTurns = useMutation(api.wiringChats.append);
  const removeChat = useMutation(api.wiringChats.remove);
  const chats = useQuery(api.wiringChats.list, { campusId });

  /** undefined: not picked yet (opens the latest); null: a new, unsaved chat. */
  const [chatId, setChatId] = useState<Id<"wiringChats"> | null | undefined>(
    undefined,
  );
  useEffect(() => setChatId(undefined), [campusId]);
  useEffect(() => {
    if (chatId === undefined && chats) setChatId(chats[0]?._id ?? null);
  }, [chatId, chats]);
  const chat = useQuery(api.wiringChats.get, chatId ? { id: chatId } : "skip");
  const current = chats?.find((c) => c._id === chatId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const turns: Turn[] = chatId ? (chat?.turns ?? []) : [];
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns.length, pending, busy]);

  function startNewChat() {
    if (busy) return;
    setChatId(null);
    setPickerOpen(false);
    ref.current?.focus();
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setPending(text);
    setBusy(true);
    let id = chatId ?? null;
    let reply: Turn;
    try {
      if (!id) {
        id = await createChat({ campusId });
        setChatId(id);
      }
      await appendTurns({ id, turns: [{ role: "user", text }] });
      setPending(null);
      const result = await draft({
        campusId,
        ...(parent ? { parentNodeId: parent.id } : {}),
        description: text,
        currentYaml: wiringToYaml(graph),
      });
      const lines: string[] = [];
      if (parent) {
        const merged = mergeInternalWiring(graph, parent.id, result.graph, {
          replace: true,
        });
        onGraph(merged.graph);
        const inside = merged.graph.nodes.filter((n) => n.parent === parent.id);
        lines.push(
          `Drew ${plural(inside.length, "device")} and ${plural(result.graph.edges.length, "connection")} inside ${parent.label}.`,
        );
      } else {
        const next = result.graph;
        onGraph(next);
        const d = diffWiring(graph, next);
        const changes = [
          d.addedNodes.length && `added ${plural(d.addedNodes.length, "device")}`,
          d.removedNodes.length &&
            `removed ${plural(d.removedNodes.length, "device")}`,
          d.changedNodes.length &&
            `changed ${plural(d.changedNodes.length, "device")}`,
          d.addedEdges.length &&
            `added ${plural(d.addedEdges.length, "connection")}`,
          d.removedEdges.length &&
            `removed ${plural(d.removedEdges.length, "connection")}`,
        ].filter((c): c is string => typeof c === "string");
        lines.push(
          changes.length
            ? `Updated the diagram: ${changes.join(", ")}. It now has ${plural(next.nodes.length, "device")} and ${plural(next.edges.length, "connection")}.`
            : "Nothing to change: the diagram already matches that.",
        );
      }
      if (result.assumptions.length)
        lines.push("I assumed:", ...result.assumptions.map((a) => `• ${a}`));
      lines.push(
        "Click any device to adjust it or its connections, or tell me what to change. Nothing is stored until you save.",
      );
      reply = { role: "assistant", text: lines.join("\n") };
    } catch (e) {
      reply = {
        role: "assistant",
        error: true,
        text: e instanceof Error ? e.message : String(e),
      };
    }
    try {
      if (id) await appendTurns({ id, turns: [reply] });
    } finally {
      setPending(null);
      setBusy(false);
      ref.current?.focus();
    }
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send();
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat picker: switch between saved chats, or start a new one. */}
      <div className="flex items-center gap-2 border-b p-2">
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            disabled={busy}
            onClick={() => setPickerOpen((o) => !o)}
            className="bg-muted/60 hover:bg-muted focus-visible:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm outline-none focus-visible:ring-3 disabled:opacity-60"
          >
            <span className="min-w-0 flex-1 truncate">
              {current?.title ?? "New chat"}
            </span>
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          </button>
          {pickerOpen && (
            <>
              <button
                type="button"
                aria-label="Close chat list"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setPickerOpen(false)}
              />
              <ul
                role="listbox"
                className="bg-popover absolute top-full right-0 left-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border p-1 shadow-lg"
              >
                {(chats ?? []).length === 0 && (
                  <li className="text-muted-foreground px-3 py-2 text-sm">
                    No saved chats yet.
                  </li>
                )}
                {(chats ?? []).map((c) => (
                  <li
                    key={c._id}
                    role="option"
                    aria-selected={c._id === chatId}
                    className={cn(
                      "group hover:bg-muted flex items-center gap-2 rounded-md pl-3 text-sm",
                      c._id === chatId && "bg-muted",
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
                      onClick={() => {
                        setChatId(c._id);
                        setPickerOpen(false);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {ago(c.updatedAt)}
                      </span>
                    </button>
                    <ConfirmDeleteButton
                      className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                      what={`"${c.title}"`}
                      description="This deletes the conversation. The diagram is not changed."
                      onConfirm={async () => {
                        await removeChat({ id: c._id });
                        if (c._id === chatId) setChatId(null);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="New chat"
          title="New chat"
          disabled={busy}
          onClick={startNewChat}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div
        ref={scroller}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm"
      >
        {turns.map((t, i) =>
          t.role === "user" ? (
            <UserBubble key={i} text={t.text} />
          ) : (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium">
                <LogoMark className="size-5" /> ProdBot
              </div>
              <div
                className={cn(
                  "whitespace-pre-wrap",
                  t.error && "text-destructive",
                )}
              >
                {t.text}
              </div>
            </div>
          ),
        )}
        {pending && <UserBubble text={pending} />}
        {busy && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium">
              <LogoMark className="size-5" /> ProdBot
            </div>
            <ShimmeringText text="Drawing the wiring…" startOnView={false} />
          </div>
        )}
      </div>
      <form onSubmit={onSubmit} className="border-t p-2">
        <div className="bg-card focus-within:border-ring/50 flex flex-col rounded-2xl border">
          <textarea
            ref={ref}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={
              parent
                ? `Describe what is inside ${parent.label}`
                : "Describe the wiring or what to change"
            }
            aria-label="Describe the wiring"
            className="placeholder:text-muted-foreground field-sizing-content max-h-40 w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm outline-none"
          />
          <div className="flex items-center justify-end px-2 pb-2">
            <Button
              type="submit"
              size="icon-sm"
              className="rounded-full"
              disabled={busy || !input.trim()}
              aria-label="Send"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-secondary max-w-[90%] rounded-2xl px-3 py-2 whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}
