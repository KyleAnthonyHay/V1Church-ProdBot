import { useState } from "react";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { Campus } from "@/App";
import type { View } from "@/App";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/Marks";
import {
  AlertTriangle,
  MessageSquare,
  Moon,
  Network,
  PanelLeftClose,
  Settings2,
  SquarePen,
  Sun,
  Trash2,
  X,
} from "lucide-react";

type Conversation = Doc<"conversations">;

export function AppSidebar({
  campus,
  view,
  onViewChange,
  onNewChat,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  aiConfigured,
  theme,
  onToggleTheme,
  collapsed,
  onCollapse,
  mobileOpen,
  onMobileClose,
}: {
  campus: Campus;
  view: View;
  onViewChange: (v: View) => void;
  onNewChat: () => void;
  conversations: Conversation[] | undefined;
  activeConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
  onDeleteConversation: (id: Id<"conversations">) => void;
  /** Saves a new chat name to the backend. */
  onRenameConversation: (
    id: Id<"conversations">,
    title: string,
  ) => Promise<unknown>;
  aiConfigured?: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  collapsed: boolean;
  onCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  // Inline rename: tap the open chat's name (or double-click any chat).
  const [renamingId, setRenamingId] = useState<Id<"conversations"> | null>(
    null,
  );
  const [draftTitle, setDraftTitle] = useState("");
  function startRename(c: Conversation) {
    setRenamingId(c._id);
    setDraftTitle(c.title);
  }
  function finishRename(c: Conversation, save: boolean) {
    setRenamingId(null);
    const title = draftTitle.trim();
    if (save && title && title !== c.title)
      void onRenameConversation(c._id, title).catch(() => {});
  }

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground h-full w-[264px] shrink-0 flex-col",
          mobileOpen
            ? "border-sidebar-border fixed inset-y-0 left-0 z-40 flex border-r shadow-2xl"
            : collapsed
              ? "hidden"
              : "hidden md:flex",
        )}
      >
        <div className="flex items-center justify-between px-3 pt-3.5 pb-1">
          <a
            href="/"
            className="flex min-w-0 items-center gap-2.5 rounded-lg px-1 py-0.5"
            title="ProdBot home"
          >
            <BrandMark size={26} />
            <span className="min-w-0 leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">
                ProdBot
              </span>
              <span className="text-muted-foreground block truncate text-[11px]">
                V1 {campus.name}
              </span>
            </span>
          </a>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Hide sidebar"
            onClick={mobileOpen ? onMobileClose : onCollapse}
          >
            {mobileOpen ? (
              <X className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>

        <div className="px-3 pt-3">
          <button
            onClick={onNewChat}
            className="bg-card border-border hover:border-ring/40 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium shadow-[var(--shadow-soft)] transition-all hover:-translate-y-px"
          >
            <SquarePen className="size-4" />
            New chat
          </button>
        </div>

        <nav className="space-y-0.5 px-3 pt-3">
          <NavItem
            icon={MessageSquare}
            label="Ask"
            active={view === "ask"}
            onClick={() => onViewChange("ask")}
          />
          <NavItem
            icon={Network}
            label="Explore"
            active={view === "explore"}
            onClick={() => onViewChange("explore")}
          />
          <NavItem
            icon={Settings2}
            label="Admin"
            active={view === "admin"}
            onClick={() => onViewChange("admin")}
          />
        </nav>

        <SectionLabel>Chats</SectionLabel>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-2">
          {conversations?.length === 0 && (
            <p className="text-muted-foreground px-3 py-1.5 text-xs">
              No chats yet for {campus.name}.
            </p>
          )}
          {conversations?.map((c) => {
            const active = view === "ask" && c._id === activeConversationId;
            return (
              <div
                key={c._id}
                className={cn(
                  "group relative flex items-center rounded-lg text-sm transition-all duration-150",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[var(--shadow-soft)]"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                {renamingId === c._id ? (
                  <input
                    autoFocus
                    value={draftTitle}
                    aria-label="Chat name"
                    maxLength={120}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={() => finishRename(c, true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") finishRename(c, false);
                    }}
                    className="bg-background focus-visible:ring-ring/50 mx-1 my-1 min-w-0 flex-1 rounded-md border px-2 py-1 text-sm outline-none focus-visible:ring-2"
                  />
                ) : (
                  <button
                    className="min-w-0 flex-1 truncate px-3 py-1.5 text-left"
                    title={active ? "Click to rename" : c.title}
                    onClick={() =>
                      active ? startRename(c) : onSelectConversation(c._id)
                    }
                    onDoubleClick={() => startRename(c)}
                  >
                    {c.title}
                  </button>
                )}
                <button
                  aria-label="Delete chat"
                  className="text-muted-foreground hover:text-destructive mr-2 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  onClick={() => onDeleteConversation(c._id)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {aiConfigured === false && (
          <div className="border-sidebar-border mx-3 mb-2 rounded-xl border p-3 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-3.5 text-amber-500" />
              OpenAI key not set
            </div>
            <p className="text-muted-foreground mt-1">
              Add OPENAI_API_KEY in the Convex deployment settings. Chat will
              return an error until then.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 pt-1 pb-3">
          <div className="bg-card border-border flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-2.5 py-2">
            <span className="bg-primary text-primary-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
              V1
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              Production team
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              aria-label="Toggle color theme"
              onClick={onToggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="size-3.5" />
              ) : (
                <Moon className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground px-6 pt-6 pb-1.5 text-[11px] font-medium tracking-wide uppercase">
      {children}
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150",
        active
          ? // Selected: a raised white chip.
            "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[var(--shadow-soft)]"
          : // Hover: a faint tint, nothing that reads as selected.
            "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
