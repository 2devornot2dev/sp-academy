// components/sprite/sprite-chat-controls.tsx
"use client";

import type { FormEvent } from "react";
import { Mic, Send } from "lucide-react";

interface SpriteChatControlsProps {
  input: string;
  isLoading: boolean;
  spriteName: string;
  targetLang: string;
  onInputChange: (val: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export function SpriteChatControls({
  input,
  isLoading,
  spriteName,
  targetLang,
  onInputChange,
  onSubmit,
}: SpriteChatControlsProps) {
  return (
    <div className="relative z-10 shrink-0 border-t-2 border-slate-200 bg-white px-6 py-4">
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50 px-3.5 py-2 transition-colors focus-within:border-blue-500 focus-within:bg-white"
      >
        <button
          type="button"
          className="rounded-xl p-2 text-slate-400 transition hover:bg-sky-50 hover:text-blue-600"
        >
          <Mic className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={`Ask ${spriteName} in ${targetLang}...`}
          disabled={isLoading}
          maxLength={1000}
          className="w-full bg-transparent py-1.5 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center rounded-xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 p-2.5 text-white shadow-xs transition hover:brightness-105 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}