"use client";

import { useState, useCallback } from "react";
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
  Calendar,
  BookOpen,
  Target,
  Clock,
} from "lucide-react";

// Mock coach responses (in production, this would be Claude API with Sage personality)
function generateCoachResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("progress") || lowerMessage.includes("update")) {
    return `That's great that you want to check in on progress! Let's see where you're at.

Looking at your plan, you've been working on the foundational skills for about a week now. How are you feeling about the Google Analytics certification you started? Any parts clicking particularly well, or anything feeling like a slog?`;
  }

  if (lowerMessage.includes("stuck") || lowerMessage.includes("help")) {
    return `I hear you—feeling stuck is completely normal, especially when you're learning something new.

Let's break this down: What specifically is giving you trouble? Is it the material itself, finding time to study, or something else? Sometimes just naming the blocker helps us figure out the way around it.`;
  }

  if (lowerMessage.includes("interview") || lowerMessage.includes("apply")) {
    return `Thinking about interviews already—I like the proactive mindset!

Based on where you are in your transition, here's what I'd suggest: Let's get your LinkedIn updated first to reflect your new direction. You don't need to wait until you have all the skills. Companies hiring for this role often value the marketing background you bring.

Want me to walk you through how to position your experience for this role?`;
  }

  if (lowerMessage.includes("nervous") || lowerMessage.includes("worried") || lowerMessage.includes("scared")) {
    return `Real talk: what you're feeling is completely normal. Career transitions are inherently uncertain, and that uncertainty triggers anxiety. That's just biology.

But here's the thing—you're not starting from zero. You have years of relevant experience, transferable skills, and now a clear plan. The people who struggle are the ones who don't prepare. You're already ahead.

What's the specific thing worrying you most right now? Let's tackle it directly.`;
  }

  // Default thoughtful response
  return `That's an interesting point. Let me think about this in context of what you're working toward.

Based on our previous conversations, you're transitioning toward a Product Marketing role with lower AI exposure. What you're describing sounds like a normal part of that journey.

What would be most helpful right now—should we adjust your plan, talk through a specific challenge, or just brainstorm next steps?`;
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hey! Good to see you back.

I've been thinking about your transition to Product Marketing Manager—you made some solid progress last week on the competitive analysis fundamentals.

What's on your mind today? We could:
• Review your progress and adjust the plan
• Work through a specific challenge
• Talk about anything else that's coming up

What would be most helpful?`,
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = useCallback((content: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate typing delay
    setIsTyping(true);

    setTimeout(() => {
      const response = generateCoachResponse(content);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  }, []);

  const quickActions = [
    { label: "Review my plan", icon: Target },
    { label: "Update progress", icon: Calendar },
    { label: "Learning resources", icon: BookOpen },
  ];

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
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-blue-700">
            <Clock className="h-4 w-4" />
            <span>
              Goal: <strong>Product Marketing Manager</strong> • Week 3 of 12
            </span>
          </div>
          <span className="text-blue-600 font-medium">25% Complete</span>
        </div>
      </div>

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
        />
      </div>
    </div>
  );
}
