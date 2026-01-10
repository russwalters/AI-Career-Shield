"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Message } from "@/components/chat/MessageBubble";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Shield,
  Menu,
  ArrowLeft,
  MessageSquare,
  BookOpen,
  Target,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface CoachingContext {
  hasAssessment: boolean;
  riskScore?: number;
  conversationCount: number;
  memoryCount: number;
  goals: string[];
}

interface PlanData {
  targetCareer: string;
  progress: number;
  createdAt?: string;
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [context, setContext] = useState<CoachingContext | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load user context and generate initial greeting
  useEffect(() => {
    async function loadContext() {
      try {
        // Fetch coaching context
        const contextRes = await fetch("/api/coach", { method: "GET" });
        if (contextRes.ok) {
          const data = await contextRes.json();
          if (data.success) {
            setContext(data.context);
          }
        }

        // Fetch action plan if exists
        const planRes = await fetch("/api/plan");
        if (planRes.ok) {
          const data = await planRes.json();
          if (data.success && data.plan) {
            setPlan({
              targetCareer: data.plan.targetCareer,
              progress: data.plan.progress,
              createdAt: data.plan.createdAt,
            });
          }
        }

        // Generate personalized greeting
        const greeting = generateGreeting();
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: greeting,
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        console.error("Failed to load context:", err);
        // Set default greeting anyway
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Hey there! I'm Sage, your AI career coach.

I'm here to help you navigate your career transition, work through challenges, and keep you on track with your goals.

What's on your mind today?`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    loadContext();
  }, []);

  function generateGreeting(): string {
    if (plan) {
      const weekNumber = plan.createdAt
        ? Math.ceil(
            (Date.now() - new Date(plan.createdAt).getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          )
        : 1;

      return `Hey! Good to see you back.

I've been tracking your progress toward ${plan.targetCareer}—you're ${plan.progress}% through your action plan (week ${weekNumber} of 12).

What's on your mind today? We could:
• Review your progress and adjust the plan
• Work through a specific challenge
• Talk about anything else that's coming up

What would be most helpful?`;
    }

    return `Hey there! I'm Sage, your AI career coach.

I see you have Shield access—that means I can remember our conversations and help you build a personalized action plan.

To get started, tell me: What's your biggest career concern right now? Or if you've already done an assessment, we can dive into your results and start building your plan.`;
  }

  /**
   * Stream a coaching response from the API
   */
  const streamCoachResponse = useCallback(
    async (allMessages: Message[]): Promise<string> => {
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get coaching response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullResponse = "";
      const currentMessageId = `assistant-${Date.now()}`;

      // Add placeholder message for streaming
      setMessages((prev) => [
        ...prev,
        {
          id: currentMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              // Handle conversation ID from first message
              if (parsed.conversationId && !conversationId) {
                setConversationId(parsed.conversationId);
              }

              if (parsed.text) {
                fullResponse += parsed.text;
                // Update the message with streamed content
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === currentMessageId
                      ? { ...m, content: fullResponse }
                      : m
                  )
                );
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      return fullResponse;
    },
    [conversationId]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (isTyping) return;

      setError(null);

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsTyping(true);

      try {
        await streamCoachResponse(updatedMessages);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Coach error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to get coaching response"
        );
        // Remove placeholder message on error
        setMessages((prev) => prev.filter((m) => m.content !== ""));
      } finally {
        setIsTyping(false);
      }
    },
    [messages, isTyping, streamCoachResponse]
  );

  const quickActions = [
    { label: "Review my plan", icon: Target },
    { label: "Update progress", icon: MessageSquare },
    { label: "Learning resources", icon: BookOpen },
  ];

  // Calculate week number for display
  const weekNumber = plan?.createdAt
    ? Math.min(
        12,
        Math.ceil(
          (Date.now() - new Date(plan.createdAt).getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        )
      )
    : 1;

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-600">Loading your coaching session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/plan">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <span className="font-semibold text-slate-900">
                  Career Coach
                </span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  Shield
                </Badge>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Link
                  href="/plan"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100"
                >
                  <Target className="h-5 w-5 text-blue-600" />
                  <span>Action Plan</span>
                </Link>
                <Link
                  href="/learn"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100"
                >
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span>Learning Agenda</span>
                </Link>
                <Link
                  href="/results"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100"
                >
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <span>Assessment Results</span>
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/plan">
                <Target className="h-4 w-4 mr-2" />
                Plan
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/learn">
                <BookOpen className="h-4 w-4 mr-2" />
                Learn
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Context Banner */}
      {plan && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-blue-700">
              <Clock className="h-4 w-4" />
              <span>
                Goal: <strong>{plan.targetCareer}</strong> • Week {weekNumber}{" "}
                of 12
              </span>
            </div>
            <span className="text-blue-600 font-medium">
              {plan.progress}% Complete
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Quick Actions (Mobile) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {quickActions.map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={() => handleSendMessage(action.label)}
              disabled={isTyping}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          placeholder="Ask me anything about your career transition..."
          disabled={isTyping}
        />
      </div>
    </div>
  );
}
