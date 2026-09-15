import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { Campus } from "@/App";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/conversation";
import { Response } from "@/components/ui/response";
import { Reasoning } from "@/components/ui/reasoning";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { Button } from "@/components/ui/button";
import { Composer } from "@/components/Composer";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckSquare,
  Copy,
  ListChecks,
  Network,
  Wrench,
} from "lucide-react";

const SUGGESTIONS: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prompt: string;
}[] = [
  {
    icon: Wrench,
    label: "Troubleshoot",
    prompt: "The drummer has no click in his ears. What do I check first?",
  },
  {
    icon: ListChecks,
    label: "Sunday setup",
    prompt: "Walk me through the Sunday setup order.",
  },
  {
    icon: Network,
    label: "Signal chain",
    prompt: "What happens if the SoundGrid server drops off the network?",
  },
  {
    icon: BookOpen,
    label: "What's documented",
    prompt: "What is documented for this campus?",
  },
];

export function AskView({
  campus,
  conversationId,
  onConversationCreated,
}: {
  campus: Campus;
  conversationId: Id<"conversations"> | null;
  onConversationCreated: (id: Id<"conversations">) => void;
}) {
  const docs = useQuery(api.documents.listForCampus, { campusId: campus._id });
  const documented = docs?.filter((d) => d.content.trim()).length;
  const messages = useQuery(
    api.chat.listMessages,
    conversationId ? { conversationId } : "skip",
  );
  const createConversation = useMutation(api.chat.createConversation);
  const send = useMutation(api.chat.send);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const streaming = messages?.some((m) => m.status === "streaming") ?? false;
  const busy = sending || streaming;

  async function submit(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setSending(true);
    setError("");
    try {
      let id = conversationId;
      if (!id) {
        id = await createConversation({ campusId: campus._id });
        onConversationCreated(id);
      }
      await send({ conversationId: id, content });
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  const composerProps = {
    value: input,
    onChange: setInput,
    onSubmit: () => void submit(input),
    busy,
    campus,
  };

  const inChat = conversationId !== null && (messages?.length ?? 0) > 0;

  if (!inChat) {
    return (
      <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-4 pb-16">
        <div className="flex w-full max-w-3xl flex-col items-center gap-7">
          <div className="border-border text-muted-foreground flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
            {documented === 0 ? (
              <>
                <AlertTriangle className="size-3.5 text-amber-500" />
                Nothing is documented for {campus.name} yet
              </>
            ) : (
              <>
                {campus.name}
                <span className="bg-border h-3 w-px" />
                {documented === undefined
                  ? "Loading documentation"
                  : `${documented} document${documented === 1 ? "" : "s"} approved`}
              </>
            )}
          </div>
          <h1 className="font-serif text-center text-5xl leading-none tracking-tight md:text-6xl">
            What can I do for you?
          </h1>
          <Composer
            {...composerProps}
            autoFocus
            placeholder={`Ask about ${campus.name} production`}
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <Button
                key={s.label}
                variant="outline"
                className="rounded-full px-4"
                disabled={busy}
                onClick={() => void submit(s.prompt)}
              >
                <s.icon className="size-4" />
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6">
          {messages?.map((m) =>
            m.role === "user" ? (
              <UserMessage key={m._id} message={m} />
            ) : (
              <AssistantMessage key={m._id} message={m} />
            ),
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-3">
        {error && (
          <p role="alert" className="text-destructive mb-2 text-sm">
            {error}
          </p>
        )}
        <Composer
          {...composerProps}
          placeholder="Message ProdBot"
          status={
            streaming ? (
              <>
                <span className="bg-foreground/70 size-1.5 animate-pulse rounded-full" />
                <ShimmeringText text="Working on it" startOnView={false} />
              </>
            ) : (
              <>
                <CheckSquare className="size-3.5" />
                Answer complete
              </>
            )
          }
        />
        <p className="text-muted-foreground mt-2 text-center text-[11px]">
          ProdBot only knows what is documented. Double-check before you
          repatch anything live.
        </p>
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: Doc<"messages"> }) {
  return (
    <div className="flex justify-end">
      <div className="bg-secondary text-secondary-foreground max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}

function AssistantMessage({ message }: { message: Doc<"messages"> }) {
  const streaming = message.status === "streaming";
  return (
    <div className="space-y-3">
      <Reasoning
        text={message.reasoning}
        streaming={streaming && !message.content}
        seconds={
          message.finishedAt
            ? (message.finishedAt - message.createdAt) / 1000
            : undefined
        }
      />
      {message.content && (
        <div className="text-[15px] leading-7">
          <Response>{message.content}</Response>
        </div>
      )}
      {!streaming && message.content && (
        <CopyButton text={message.content} />
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground -ml-1.5"
      aria-label="Copy answer"
      title="Copy"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  );
}
