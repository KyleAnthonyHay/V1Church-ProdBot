import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Campus } from "@/App";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ui/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import { Response } from "@/components/ui/response";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AudioLines,
  Loader2,
  Plus,
  SendHorizontal,
  Trash2,
  AlertTriangle,
} from "lucide-react";

const SUGGESTIONS = [
  "The drummer has no click in his ears. What do I check first?",
  "Walk me through the Sunday setup order.",
  "What happens if the SoundGrid server drops off the network?",
  "What is documented for this campus?",
];

export function AskView({ campus }: { campus: Campus }) {
  const conversations = useQuery(api.chat.listConversations, {
    campusId: campus._id,
  });
  const docs = useQuery(api.documents.listForCampus, { campusId: campus._id });
  const hasDocs = docs?.some((d) => d.content.trim()) ?? true;
  const [activeId, setActiveId] = useState<Id<"conversations"> | null>(null);
  const messages = useQuery(
    api.chat.listMessages,
    activeId ? { conversationId: activeId } : "skip",
  );
  const createConversation = useMutation(api.chat.createConversation);
  const removeConversation = useMutation(api.chat.removeConversation);
  const send = useMutation(api.chat.send);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const streaming = messages?.some((m) => m.status === "streaming") ?? false;
  const busy = sending || streaming;

  async function submit(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setSending(true);
    setError("");
    try {
      let id = activeId;
      if (!id) {
        id = await createConversation({ campusId: campus._id });
        setActiveId(id);
      }
      await send({ conversationId: id, content });
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(input);
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit(input);
    }
  }

  return (
    <div className="relative flex h-full">
      <aside
        className={cn(
          "border-border bg-background z-20 w-64 shrink-0 flex-col border-r md:static md:flex",
          sidebarOpen ? "absolute inset-y-0 left-0 flex shadow-xl" : "hidden",
        )}
      >
        <Button
          className="md:hidden"
          variant="ghost"
          onClick={() => setSidebarOpen(false)}
        >
          Close conversations
        </Button>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Conversations
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            title="New conversation"
            onClick={() => setActiveId(null)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {conversations?.length === 0 && (
            <p className="text-muted-foreground px-1 py-2 text-xs">
              No conversations yet for {campus.name}.
            </p>
          )}
          {conversations?.map((c) => (
            <div
              key={c._id}
              className={cn(
                "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm",
                c._id === activeId ? "bg-accent" : "hover:bg-accent/50",
              )}
            >
              <button
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => {
                  setActiveId(c._id);
                  setSidebarOpen(false);
                }}
                title={c.title}
              >
                {c.title}
              </button>
              <button
                className="text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                title="Delete"
                onClick={() => {
                  if (confirm("Delete this conversation?")) {
                    void removeConversation({ id: c._id })
                      .then(() => {
                        if (activeId === c._id) setActiveId(null);
                      })
                      .catch((e) =>
                        setError(e instanceof Error ? e.message : String(e)),
                      );
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <Button
          variant="ghost"
          className="self-start md:hidden"
          onClick={() => setSidebarOpen((s) => !s)}
        >
          Conversations
        </Button>
        {!hasDocs && (
          <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="size-4 shrink-0" />
            Nothing is documented for {campus.name} yet. The agent will say so.
            Add wiring, pitfalls, a runbook and systems under Admin.
          </div>
        )}
        <Conversation className="min-h-0">
          <ConversationContent className="mx-auto w-full max-w-3xl">
            {!activeId || messages?.length === 0 ? (
              <ConversationEmptyState
                icon={<AudioLines className="size-8" />}
                title={`Ask about ${campus.name} production`}
                description="Symptoms, setup order, what plugs into what. Answers cite the documented wiring, pitfalls and runbook."
              >
                <div className="flex flex-col items-center gap-3">
                  <AudioLines className="text-muted-foreground size-8" />
                  <h3 className="text-base font-medium">
                    Ask about {campus.name} production
                  </h3>
                  <p className="text-muted-foreground max-w-md text-sm">
                    Symptoms, setup order, what plugs into what. Answers cite
                    the documented wiring, pitfalls and runbook.
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        className="h-auto whitespace-normal py-1.5 text-left"
                        onClick={() => void submit(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </ConversationEmptyState>
            ) : (
              messages?.map((m) => (
                <Message key={m._id} from={m.role}>
                  <MessageAvatar name={m.role === "user" ? "You" : "V1"} />
                  <MessageContent
                    variant={m.role === "assistant" ? "flat" : "contained"}
                  >
                    {m.role === "assistant" ? (
                      m.content ? (
                        <Response>{m.content}</Response>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-2 text-sm">
                          <Loader2 className="size-4 animate-spin" /> Thinking
                        </span>
                      )
                    ) : (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    )}
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl p-4 pt-2">
          {error && (
            <p role="alert" className="text-destructive mb-2 text-sm">
              {error}
            </p>
          )}
          <div className="bg-card focus-within:ring-ring/40 flex items-end gap-2 rounded-xl border p-2 focus-within:ring-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Message ProdBot about ${campus.name}…`}
              rows={1}
              className="max-h-40 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy || !input.trim()}
              title="Send (Enter)"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendHorizontal className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-muted-foreground mt-1 text-center text-[11px]">
            ProdBot only knows what is documented. Double-check before you
            repatch anything live.
          </p>
        </form>
      </section>
    </div>
  );
}
