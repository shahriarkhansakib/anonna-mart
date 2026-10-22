import { useQueryClient } from "@tanstack/react-query";
import { format, isToday } from "date-fns";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Loader2,
  MessageCircle,
  Search,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/useDebounce";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  type SupportConversation,
  type SupportMessage,
  useAdminSupportChat,
  useAdminSupportMessages,
} from "@/hooks/useSupportChat";
import { supportApi } from "@/lib/api/support";
import { Link } from "@/lib/router-compat";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread" | "active";

const shortDate = (d?: string | null) => {
  if (!d) return "";
  const date = new Date(d);
  return isToday(date) ? format(date, "HH:mm") : format(date, "d MMM");
};

const Initial = ({ name, size = "md" }: { name: string; size?: "md" | "lg" }) => (
  <div
    className={cn(
      "shrink-0 rounded-full bg-primary/10 text-primary font-semibold italic grid place-items-center",
      size === "lg" ? "h-12 w-12 text-lg" : "h-11 w-11 text-base",
    )}
  >
    {(name || "U").charAt(0).toUpperCase()}
  </div>
);

const ConversationItem = memo(
  ({
    conv,
    isActive,
    onClick,
  }: {
    conv: SupportConversation;
    isActive: boolean;
    onClick: () => void;
  }) => {
    const unread = conv.unread_count || 0;
    const fromAdmin = conv.last_sender_role === "admin";
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors",
          isActive ? "bg-muted" : "hover:bg-muted/60",
        )}
      >
        <Initial name={conv.user_name || "U"} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("truncate text-[15px]", unread ? "font-semibold" : "font-medium")}>
              {conv.user_name || "User"}
            </span>
            <span
              className={cn(
                "text-xs shrink-0",
                unread ? "text-primary font-medium" : "text-muted-foreground",
              )}
            >
              {shortDate(conv.last_message_at)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {fromAdmin && <CheckCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
            <p
              className={cn(
                "text-sm truncate flex-1",
                unread ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {fromAdmin && "You: "}
              {conv.last_message || "No messages yet"}
            </p>
            {unread > 0 && (
              <span className="shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold grid place-items-center">
                {unread}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  },
);
ConversationItem.displayName = "ConversationItem";

const Bubble = memo(({ message, isAdmin }: { message: SupportMessage; isAdmin: boolean }) => (
  <div className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
    <div
      className={cn(
        "max-w-[80%] sm:max-w-[65%] rounded-2xl px-3.5 pt-2 pb-1.5 shadow-sm",
        isAdmin
          ? "bg-primary/10 border border-primary/15 rounded-br-md"
          : "bg-card border border-border/70 rounded-bl-md",
      )}
    >
      <p className="text-xs font-semibold text-primary mb-0.5">
        {isAdmin ? "GrowMate team" : "Client"}
      </p>
      <div className="flex items-end gap-3">
        <p className="text-[15px] text-foreground whitespace-pre-wrap break-words flex-1">
          {message.content}
        </p>
        <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-0.5 translate-y-0.5">
          {format(new Date(message.created_at), "HH:mm")}
          {isAdmin && <Check className="h-3 w-3" />}
        </span>
      </div>
    </div>
  </div>
));
Bubble.displayName = "Bubble";

const ChatPanel = ({
  conversation,
  onBack,
  showBack,
  onDelete,
}: {
  conversation: SupportConversation | undefined;
  onBack?: () => void;
  showBack?: boolean;
  onDelete: (id: string) => void;
}) => {
  const conversationId = conversation?.id ?? null;
  const { messages, loading, sendMessage } = useAdminSupportMessages(conversationId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
  }, [input]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    await sendMessage(input);
    setInput("");
    setSending(false);
    taRef.current?.focus();
  }, [input, sending, sendMessage]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/30">
        <div className="text-center px-6">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 grid place-items-center">
            <MessageCircle className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Select a chat</p>
          <p className="text-sm mt-1">Pick a conversation on the left to start replying.</p>
        </div>
      </div>
    );
  }

  const name = conversation.user_name || "Customer";
  const isActive = conversation.status === "active";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/70 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-card">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 -ml-2"
              onClick={onBack}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Initial name={name} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-base truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {conversation.subject || "Support request"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            asChild
            aria-label="Customer profile"
          >
            <Link to={`/admin/customers/${conversation.user_id}`}>
              <UserRound className="h-5 w-5" />
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:text-destructive"
                aria-label="Delete chat"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                <AlertDialogDescription>
                  All messages with <strong>{name}</strong> will be removed. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(conversation.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status strip */}
      <div className="px-4 py-2 border-b border-border/70 flex items-center gap-2 bg-card">
        <span
          className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-full",
            isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {isActive ? "Active" : "Closed"}
        </span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-4 bg-muted/30">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-2/3 rounded-2xl" />
            <Skeleton className="h-14 w-1/2 ml-auto rounded-2xl" />
            <Skeleton className="h-14 w-3/5 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            No messages yet. Say hello 👋
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} isAdmin={m.sender_role === "admin"} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="px-3 sm:px-4 py-3 border-t border-border/70 bg-card flex items-end gap-2">
        <textarea
          ref={taRef}
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending}
          maxLength={2000}
          rows={1}
          className="flex-1 resize-none rounded-3xl bg-muted px-5 py-3 text-base md:text-[15px] outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="h-12 w-12 rounded-full shrink-0"
          aria-label="Send"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
};

const AdminSupportChat = () => {
  useDocumentTitle("Support Chat - Admin");
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { conversations, loading } = useAdminSupportChat();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const debouncedSearch = useDebounce(search, 250);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return conversations.filter((c) => {
      if (filter === "unread" && !(c.unread_count || 0)) return false;
      if (filter === "active" && c.status !== "active") return false;
      return (
        (c.user_name || "").toLowerCase().includes(q) ||
        (c.last_message || "").toLowerCase().includes(q)
      );
    });
  }, [conversations, debouncedSearch, filter]);

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + (c.unread_count || 0), 0),
    [conversations],
  );
  const active = useMemo(
    () => conversations.find((c) => c.id === activeConvId),
    [conversations, activeConvId],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await supportApi.deleteConversation(id);
        toast.success("Chat deleted");
        if (activeConvId === id) setActiveConvId(null);
        queryClient.invalidateQueries({ queryKey: ["admin-support-conversations"] });
      } catch {
        toast.error("Could not delete chat");
      }
    },
    [activeConvId, queryClient],
  );

  const showList = !isMobile || !activeConvId;
  const showChat = !isMobile || !!activeConvId;

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: totalUnread ? `Unread · ${totalUnread}` : "Unread" },
    { key: "active", label: "Active" },
  ];

  return (
    <AdminLayout
      title="Support Chat"
      subtitle={totalUnread > 0 ? `${totalUnread} unread` : "Reply to your customers"}
    >
      <div className="flex h-[calc(100dvh-13rem)] md:h-[calc(100vh-11rem)] min-h-[480px] bg-card border border-border/70 rounded-2xl overflow-hidden shadow-sm">
        {showList && (
          <div
            className={cn(
              "flex flex-col min-h-0 border-r border-border/70",
              isMobile ? "w-full" : "w-[340px] shrink-0",
            )}
          >
            <div className="px-4 pt-4 pb-3 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight">Chats</h2>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search chats"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 rounded-full bg-muted pl-11 pr-4 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "shrink-0 h-9 px-4 rounded-full text-sm font-medium border transition-colors",
                      filter === f.key
                        ? "bg-primary/10 text-primary border-transparent"
                        : "border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
              {loading ? (
                <div className="space-y-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-11 w-11 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground px-6">
                  <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium text-foreground">
                    {debouncedSearch || filter !== "all" ? "No chats match" : "No chats yet"}
                  </p>
                  <p className="text-xs mt-1">
                    {debouncedSearch || filter !== "all"
                      ? "Try another search or filter"
                      : "Customer messages will appear here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((c) => (
                    <ConversationItem
                      key={c.id}
                      conv={c}
                      isActive={activeConvId === c.id}
                      onClick={() => setActiveConvId(c.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showChat && (
          <div className="flex-1 min-w-0 flex flex-col">
            <ChatPanel
              conversation={active}
              showBack={isMobile}
              onBack={() => setActiveConvId(null)}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSupportChat;
