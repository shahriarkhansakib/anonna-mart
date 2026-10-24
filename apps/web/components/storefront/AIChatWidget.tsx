"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ExternalLink,
  Lock,
  MessageCircle,
  Minimize2,
  Package,
  RotateCcw,
  Send,
  Sparkles,
  Truck,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supportApi } from "@/lib/api/support";
import { CLOUDINARY_FALLBACK } from "@/lib/constants";

const mascotUrl = CLOUDINARY_FALLBACK.mascot;

interface ChatProduct {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  discount_percent?: number;
  in_stock: boolean;
  stock_quantity: number;
  badge?: string;
  category?: string;
  image?: string;
}

interface Message {
  id: string;
  sender_type: "customer" | "agent" | "system";
  message: string;
  created_at: string;
  products?: ChatProduct[];
}

const STARTER_PROMPTS = [
  { label: "Check In-Stock Pet Food", query: "Show me in-stock cat and dog food" },
  { label: "Track My Recent Order", query: "What is the status of my order?" },
  { label: "Delivery Rates & Time", query: "How much is delivery in Dhaka and outside?" },
  { label: "Return & Refund Policy", query: "What is your 7-day return policy?" },
];

export function AIChatWidget() {
  const pathname = usePathname();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, messages]);

  // Load active conversation messages for authenticated user
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setConversationId(null);
      return;
    }

    let isMounted = true;
    async function loadHistory() {
      try {
        const res = await supportApi.listConversations();
        const existing = (res.data || []).find(
          (c) => c.user_id === user?.id && c.status !== "closed",
        );

        if (existing && isMounted) {
          setConversationId(existing.id);
          const msgRes = await supportApi.getMessages(existing.id);
          if (isMounted && msgRes.data && msgRes.data.length > 0) {
            setMessages(
              msgRes.data.map((m) => ({
                id: m.id,
                sender_type: m.sender_type,
                message: m.message,
                created_at: m.created_at,
              })),
            );
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleToggle = () => {
    if (!user) {
      setShowAuthGate(!showAuthGate);
      setIsOpen(false);
    } else {
      setIsOpen(!isOpen);
      setShowAuthGate(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    if (!user) {
      setShowAuthGate(true);
      return;
    }

    const optimisticId = "temp-" + Date.now();
    const customerMsg: Message = {
      id: optimisticId,
      sender_type: "customer",
      message: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, customerMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const res = await supportApi.sendAIChat({
        message: text,
        conversationId: conversationId || undefined,
      });

      if (res.success && res.data) {
        if (res.data.conversationId && !conversationId) {
          setConversationId(res.data.conversationId);
        }

        const aiMsg: Message = {
          id: res.data.message.id,
          sender_type: "agent",
          message: res.data.message.message,
          created_at: res.data.message.created_at,
          products: res.data.products || [],
        };

        setMessages((prev) => [...prev, aiMsg]);
      } else {
        toast.error("Unable to reach GrowMate AI. Please try again.");
      }
    } catch {
      toast.error("Failed to connect to the store assistant.");
    } finally {
      setLoading(false);
    }
  };

  // Exclude from admin dashboard routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {/* =================================================================== */}
      {/* FLOATING TRIGGER BUTTON (GROW-MATE MASCOT)                           */}
      {/* =================================================================== */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* Helper Tooltip Badge for Visitors */}
        {!isOpen && !showAuthGate && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className="hidden sm:flex items-center gap-2 bg-background/95 backdrop-blur-md border border-emerald-500/20 text-foreground px-3.5 py-2 rounded-2xl shadow-xl text-xs font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span>Need help? Ask GrowMate AI!</span>
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          className="relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-sky-500 p-1 shadow-2xl shadow-emerald-500/30 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
          aria-label="Open GrowMate AI Assistant"
        >
          {/* Animated Glow Halo */}
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md group-hover:blur-lg transition-all" />

          {/* Mascot Image with Interactive Bobbing */}
          <div className="relative w-full h-full rounded-full overflow-hidden bg-emerald-950 flex items-center justify-center">
            <img
              src={mascotUrl}
              alt="GrowMate Mascot"
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain group-hover:scale-110 transition-transform duration-300"
            />
          </div>

          {/* Active Status Dot */}
          <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-background rounded-full shadow-sm">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </span>
        </motion.button>
      </div>

      {/* =================================================================== */}
      {/* AUTHENTICATION GATE MODAL (FOR LOGGED-OUT USERS)                    */}
      {/* =================================================================== */}
      <AnimatePresence>
        {showAuthGate && !user && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[92vw] max-w-sm bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-3xl p-6 text-card-foreground overflow-hidden"
          >
            {/* Header / Close */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Member Access Only
                </span>
              </div>
              <button
                onClick={() => setShowAuthGate(false)}
                className="p-1 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mascot Graphic & Welcome Message */}
            <div className="text-center my-3">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <img
                  src={mascotUrl}
                  alt="GrowMate AI"
                  className="w-full h-full object-contain animate-bounce"
                  style={{ animationDuration: "3s" }}
                />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                Chat with GrowMate AI
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed px-2">
                Sign in or create an account to unlock our live AI concierge. Get real-time stock
                availability, personalized discounts, and instant order tracking!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 mt-5">
              <Link href="/sign-in" className="w-full">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl h-10 shadow-md shadow-emerald-600/20">
                  Sign In to Chat
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link href="/sign-up" className="w-full">
                <Button
                  variant="outline"
                  className="w-full border-border hover:bg-muted font-medium rounded-xl h-10"
                >
                  Create Free Account
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* ACTIVE AI CHAT CONVERSATION WINDOW                                  */}
      {/* =================================================================== */}
      <AnimatePresence>
        {isOpen && user && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[94vw] sm:w-[410px] h-[580px] max-h-[82vh] bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-3xl flex flex-col overflow-hidden text-foreground"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full bg-black/20 p-1 flex items-center justify-center">
                  <img src={mascotUrl} alt="GrowMate AI" className="w-full h-full object-contain" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-300 border-2 border-emerald-700 rounded-full" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5 leading-none">
                    GrowMate AI Concierge
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </h3>
                  <p className="text-[11px] text-white/80 mt-1">
                    Live catalog, orders & instant support
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                  aria-label="Minimize Chat"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Thread Scroll Area */}
            <ScrollArea className="flex-1 p-4 overflow-y-auto">
              <div className="flex flex-col gap-3.5">
                {/* Welcome Greeting from Mascot */}
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 p-1 flex-shrink-0 flex items-center justify-center">
                    <img src={mascotUrl} alt="GrowMate" className="w-full h-full object-contain" />
                  </div>
                  <div className="bg-muted/70 rounded-2xl rounded-tl-sm p-3.5 text-xs text-foreground leading-relaxed max-w-[85%] border border-border/50">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                      Hello {(user as any)?.name || "Valued Customer"}! 👋
                    </p>
                    I'm your GrowMate AI shopping concierge. How can I help you today? You can ask
                    about live pet supplies, check prices, or track an order!
                  </div>
                </div>

                {/* Conversation History Messages */}
                {messages.map((m) => {
                  const isUser = m.sender_type === "customer";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`flex items-start gap-2 max-w-[85%] ${
                          isUser ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 p-1 flex-shrink-0 flex items-center justify-center">
                            <img
                              src={mascotUrl}
                              alt="AI"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl p-3 text-xs leading-relaxed ${
                            isUser
                              ? "bg-emerald-600 text-white rounded-tr-sm shadow-sm"
                              : "bg-muted text-foreground rounded-tl-sm border border-border/50"
                          }`}
                        >
                          <p className="whitespace-pre-line">{m.message}</p>
                        </div>
                      </div>

                      {/* Attached Product Cards if present */}
                      {!isUser && m.products && m.products.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 mt-2 w-full pl-9">
                          {m.products.map((prod) => (
                            <Link
                              key={prod.id}
                              href={`/products/${prod.id}`}
                              className="group flex items-center gap-3 p-2 rounded-xl bg-card border border-border hover:border-emerald-500/40 hover:shadow-md transition-all text-xs"
                            >
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                {prod.image ? (
                                  <img
                                    src={prod.image}
                                    alt={prod.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                  {prod.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    ৳{prod.price}
                                  </span>
                                  {prod.in_stock ? (
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] py-0 px-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    >
                                      In Stock
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-[9px] py-0 px-1">
                                      Out of Stock
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground flex-shrink-0 mr-1" />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* AI Thinking Animation */}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 p-1 animate-spin">
                      <img
                        src={mascotUrl}
                        alt="Thinking"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span>Checking live store inventory & policies...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Starter Suggestion Chips */}
            {messages.length <= 2 && (
              <div className="px-4 py-2 border-t border-border/40 bg-muted/20 flex flex-wrap gap-1.5">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => handleSendMessage(prompt.query)}
                    className="text-[11px] bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-border hover:border-emerald-500/30 text-foreground px-2.5 py-1 rounded-full transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <span>{prompt.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Input Footer */}
            <div className="p-3 border-t border-border bg-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about cat food, orders, shipping..."
                  disabled={loading}
                  className="flex-1 bg-muted/60 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputValue.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0 shadow-sm"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
