"use client";

import { Avatar } from "@/components/ui/avatar";
import { Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 max-w-[85%]",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      <Avatar
        className={cn(
          "h-8 w-8 flex-shrink-0 flex items-center justify-center",
          isUser ? "bg-slate-200" : "bg-blue-100"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-slate-600" />
        ) : (
          <Shield className="h-4 w-4 text-blue-600" />
        )}
      </Avatar>
      <div
        className={cn(
          "rounded-2xl px-4 py-3",
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-slate-100 text-slate-900 rounded-bl-md"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  );
}
