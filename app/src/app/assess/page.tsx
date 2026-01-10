"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Message } from "@/components/chat/MessageBubble";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Shield, ArrowLeft, X } from "lucide-react";

// Profile data from onboarding
interface OnboardingProfile {
  jobTitle: string | null;
  yearsOfExperience: number | null;
  currentSalary: number | null;
}

// Generate personalized greeting based on profile
function getInitialGreeting(profile: OnboardingProfile | null): string {
  if (profile?.jobTitle) {
    const experienceText = profile.yearsOfExperience
      ? ` with ${profile.yearsOfExperience} year${profile.yearsOfExperience === 1 ? '' : 's'} of experience`
      : '';

    return `Hey there! I'm Sage. I see you're a ${profile.jobTitle}${experienceText}—that's great context to start with!

Let's skip the basics and dig into the interesting stuff. What does a typical week actually look like for you? I'm curious about the specific tasks that take up most of your time.`;
  }

  return `Hey there! I'm Sage, and I'm here to help you understand how AI might affect your career—and more importantly, what you can do about it.

Let's start with the basics. What's your current job title, and what kind of company do you work for? (Size, industry, that sort of thing.)`;
}

// Minimum exchanges before allowing assessment completion
const MIN_EXCHANGES = 4;

export default function AssessPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [messagesInitialized, setMessagesInitialized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load profile from sessionStorage on mount and initialize greeting
  useEffect(() => {
    if (messagesInitialized) return;

    let loadedProfile: OnboardingProfile | null = null;

    try {
      const storedProfile = sessionStorage.getItem("onboardingProfile");
      if (storedProfile) {
        loadedProfile = JSON.parse(storedProfile);
        setProfile(loadedProfile);
      }
    } catch {
      // Ignore parse errors
    }

    // Initialize messages with personalized greeting
    setMessages([
      {
        id: "initial",
        role: "assistant",
        content: getInitialGreeting(loadedProfile),
        timestamp: new Date(),
      },
    ]);
    setMessagesInitialized(true);
  }, [messagesInitialized]);

  // Count user messages to track progress
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const totalSteps = 5;
  const progress = Math.min(((userMessageCount + 1) / totalSteps) * 100, 100);

  /**
   * Stream a response from Claude via the chat API
   */
  const streamChatResponse = useCallback(
    async (allMessages: Message[]): Promise<string> => {
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode: "assessment",
          context: profile ? {
            userProfile: {
              jobTitle: profile.jobTitle || undefined,
              yearsOfExperience: profile.yearsOfExperience || undefined,
              currentSalary: profile.currentSalary || undefined,
            },
          } : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // Try to parse error message from response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || "Failed to get response from AI");
        }
        throw new Error(`AI service error (${response.status})`);
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
              if (parsed.error) {
                // Error sent through stream
                throw new Error(parsed.error);
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
            } catch (parseErr) {
              // Only throw if it's an actual error, not a JSON parse error
              if (parseErr instanceof Error && parseErr.message !== 'Unexpected token') {
                throw parseErr;
              }
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      return fullResponse;
    },
    [profile]
  );

  /**
   * Process the completed assessment
   */
  const processAssessment = useCallback(
    async (allMessages: Message[]) => {
      setIsProcessing(true);

      try {
        const response = await fetch("/api/assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process assessment");
        }

        const result = await response.json();

        // Store assessment result in sessionStorage for results page
        sessionStorage.setItem(
          "assessmentResult",
          JSON.stringify({
            assessmentId: result.assessmentId,
            assessment: result.assessment,
            exposure: result.exposure,
          })
        );

        // Navigate to results
        router.push(
          result.assessmentId
            ? `/results?id=${result.assessmentId}`
            : "/results"
        );
      } catch (err) {
        console.error("Assessment processing error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to process assessment"
        );
        setIsProcessing(false);
      }
    },
    [router]
  );

  /**
   * Check if the response indicates assessment is complete
   */
  const isAssessmentComplete = (response: string): boolean => {
    const completionPhrases = [
      "analyze everything",
      "put together your analysis",
      "generate your",
      "looking at task-level",
      "moment to analyze",
      "processing your",
      "calculating your",
      "let me show you",
      "calculate your ai exposure",
      "ai exposure score",
      "exposure score",
      "give me a moment",
      "one moment while",
      "let me process",
      "running the analysis",
      "crunching the numbers",
      "analyzing your role",
      "analyzing your career",
      "pulling together",
      "putting together your results",
    ];
    const lowerResponse = response.toLowerCase();
    return completionPhrases.some((phrase) => lowerResponse.includes(phrase));
  };

  /**
   * Handle sending a message
   */
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (isTyping || isProcessing) return;

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
        // Stream response from Claude
        const response = await streamChatResponse(updatedMessages);

        // Check if we have enough exchanges and Claude signals completion
        const newUserCount = userMessageCount + 1;
        if (newUserCount >= MIN_EXCHANGES && isAssessmentComplete(response)) {
          // Wait a moment, then process the assessment
          setTimeout(() => {
            setMessages((prev) => {
              processAssessment(prev);
              return prev;
            });
          }, 2000);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled, ignore
          return;
        }
        console.error("Chat error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to get AI response"
        );
        // Remove the placeholder message on error
        setMessages((prev) => prev.filter((m) => m.content !== ""));
      } finally {
        setIsTyping(false);
      }
    },
    [
      messages,
      isTyping,
      isProcessing,
      userMessageCount,
      streamChatResponse,
      processAssessment,
    ]
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
            <span>
              {isProcessing
                ? "Processing..."
                : `Step ${Math.min(userMessageCount + 1, totalSteps)} of ${totalSteps}`}
            </span>
          </div>
          <Progress value={isProcessing ? 100 : progress} className="h-2" />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="max-w-3xl mx-auto text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-blue-700">
              Analyzing your career profile and calculating AI exposure...
            </span>
          </div>
        </div>
      )}

      {/* Manual Complete Button - shows after enough exchanges */}
      {userMessageCount >= MIN_EXCHANGES && !isProcessing && !isTyping && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <span className="text-sm text-green-700">
              Ready to see your results? You can complete your assessment now.
            </span>
            <Button
              size="sm"
              onClick={() => processAssessment(messages)}
              className="bg-green-600 hover:bg-green-700"
            >
              Complete Assessment
            </Button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          placeholder={
            isProcessing ? "Processing your assessment..." : "Share your thoughts..."
          }
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}
