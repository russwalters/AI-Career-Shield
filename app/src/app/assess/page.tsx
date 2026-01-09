"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Message } from "@/components/chat/MessageBubble";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Shield, ArrowLeft, X } from "lucide-react";
import { assessmentFlow } from "@/data/mock-assessment";

// Mock response generator (simulates Sage's responses)
function generateMockResponse(step: number, userMessage: string): string {
  // In production, this would call Claude API
  const responses: Record<number, string> = {
    0: `Got it—sounds like you're a ${userMessage.split(" ")[0]} type role. That covers a lot of ground though.

Walk me through what a typical week actually looks like for you. What are the main things you spend your time on? Don't worry about being comprehensive—just the big buckets of work.`,

    1: `That's helpful. I'm starting to get a picture here.

Now, what tools and technologies are you working with day-to-day? Think software, platforms, anything you regularly use to get your work done.`,

    2: `Interesting mix. One more angle I want to understand: how much of your work involves other people?

I mean things like—managing a team, collaborating with stakeholders, client relationships, mentoring. Give me a sense of how much of your week is "heads down solo work" vs. "working with people."`,

    3: `This is really helpful context. I'm seeing some patterns already.

Last question before I put together your analysis: What brought you here today? Are you seeing AI show up in your work already, or is this more about getting ahead of things? Any specific concerns on your mind?`,

    4: `Perfect. Give me a moment to analyze everything you've shared against our database of occupations and AI exposure research.

I'm looking at task-level vulnerability, your skill composition, and where the trends are heading...`,
  };

  return responses[step] || assessmentFlow[step]?.prompt || "";
}

export default function AssessPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      role: "assistant",
      content: assessmentFlow[0].prompt,
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const totalSteps = 5;
  const progress = Math.min(((currentStep + 1) / totalSteps) * 100, 100);

  const handleSendMessage = useCallback(
    (content: string) => {
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
        const nextStep = currentStep + 1;

        if (nextStep >= totalSteps) {
          // Assessment complete - navigate to results
          setIsTyping(false);

          // Add final processing message
          const processingMessage: Message = {
            id: `assistant-processing`,
            role: "assistant",
            content: `Perfect. I've got everything I need.

Based on what you've shared, I'm seeing some clear patterns. Let me show you your full analysis...`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, processingMessage]);

          // Navigate to results after a brief delay
          setTimeout(() => {
            router.push("/results");
          }, 2000);
        } else {
          // Generate next response
          const response = generateMockResponse(nextStep, content);
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: response,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setCurrentStep(nextStep);
          setIsTyping(false);
        }
      }, 1500);
    },
    [currentStep, router]
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-slate-900">
                AI Career Shield
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <X className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
            <span>Career Assessment</span>
            <span>Step {Math.min(currentStep + 1, totalSteps)} of {totalSteps}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          placeholder="Share your thoughts..."
        />
      </div>
    </div>
  );
}
