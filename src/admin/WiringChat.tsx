import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useAction } from "convex/react";
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
import { cn } from "@/lib/utils";
import { ArrowUp, Loader2 } from "lucide-react";

type Turn = { role: "user" | "assistant"; text: string; error?: boolean };

const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Chat panel for the diagram workspace: describe the wiring, the agent draws
 * it on the canvas. With a `parent` device each message redraws that device's
 * complete internal wiring; without one it updates the whole campus. Either
 * way the canvas is the state, so follow-ups like "swap the adapter for a
 * Clarett" or "remove the demo box" work.
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
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text }]);
    setBusy(true);
    try {
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
      setTurns((t) => [...t, { role: "assistant", text: lines.join("\n") }]);
    } catch (e) {
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          error: true,
          text: e instanceof Error ? e.message : String(e),
        },
      ]);
    } finally {
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
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {turns.length === 0 && (
          <div className="text-muted-foreground space-y-2">
            {parent ? (
              <>
                <p>
                  Describe what is inside{" "}
                  <span className="text-foreground font-medium">
                    {parent.label}
                  </span>{" "}
                  and I will draw it here.
                </p>
                <p className="text-xs">
                  For example: "A MIDI keyboard plugs into a USB adapter, the
                  adapter into the laptop. Ableton runs on the laptop and
                  SoundGrid goes out over Ethernet to the stage rack."
                </p>
              </>
            ) : graph.nodes.length === 0 ? (
              <>
                <p>Describe what plugs into what and I will draw the diagram.</p>
                <p className="text-xs">
                  For example: "Drums are on stage box A on the riser. Kick in is
                  a Beta 91A into A1, kick out Beta 52 into A2. The playback Mac
                  runs Ableton into a Clarett 8Pre; out 3 is click and it only
                  ever goes to the IEM auxes."
                </p>
              </>
            ) : (
              <>
                <p>Tell me what to change on the diagram and I will redraw it.</p>
                <p className="text-xs">
                  For example: "Add a Shure ULXD receiver on the network feeding
                  the LV1", "the playback Mac now goes over Dante", or "remove
                  the demo box."
                </p>
              </>
            )}
            <p className="text-xs">
              Or skip the chat: use "Add device", or hover a device and click the
              + on its side.
            </p>
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="bg-secondary max-w-[90%] rounded-2xl px-3 py-2 whitespace-pre-wrap">
                {t.text}
              </div>
            </div>
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
