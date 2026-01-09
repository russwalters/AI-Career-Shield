"use client";

import { Avatar } from "@/components/ui/avatar";
import { Shield } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-[85%] mr-auto">
      <Avatar className="h-8 w-8 flex-shrink-0 flex items-center justify-center bg-blue-100">
        <Shield className="h-4 w-4 text-blue-600" />
      </Avatar>
      <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
