// components/freestyle/review/conversation-review-wrapper.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, AlertTriangle, Sparkles } from "lucide-react";
import {
  FreestyleReviewHub,
  type ReviewApiResponse,
} from "./freestyle-review-hub";

interface ConversationReviewWrapperProps {
  sessionId: string;
  initialData: ReviewApiResponse | null;
  isBaking: boolean;
  isFailed: boolean;
}

export function ConversationReviewWrapper({
  sessionId,
  initialData,
  isBaking,
  isFailed,
}: ConversationReviewWrapperProps) {
  const router = useRouter();
  const [data, setData] = useState<ReviewApiResponse | null>(initialData);
  const [failed, setFailed] = useState(isFailed);

  // Poll automatically if the user opened /conversation/[sessionId] while still REVIEW_PENDING
  useEffect(() => {
    if (data || failed || !isBaking) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/freestyle/review/${sessionId}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.review && !cancelled) {
            setData(json);
          }
        }
      } catch {
        // Keep polling while Lambda finishes
      }
    };

    const interval = setInterval(poll, 3500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [data, failed, isBaking, sessionId]);

  if (data) {
    return (
      <FreestyleReviewHub
        sessionId={sessionId}
        initialData={data}
        onComplete={() => router.push("/conversation/review")}
      />
    );
  }

  if (failed || !isBaking) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md space-y-5 rounded-3xl border-2 border-b-[6px] border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Review Unavailable
            </h2>
            <p className="mt-1.5 text-sm font-medium text-slate-500">
              We couldn&apos;t load the AI report for this conversation.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/conversation/review"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 py-3 text-xs font-black text-slate-700 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>All Reviews</span>
            </Link>
            <Link
              href="/conversation"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-3 text-xs font-black text-white"
            >
              <span>Conversation Hub</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md space-y-5 rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-slate-950 p-8 text-center text-white shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 text-sky-300">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest text-sky-300 uppercase">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Baking AI Speech Report
          </span>
          <h2 className="mt-2 text-2xl font-black text-white">
            Almost Ready...
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-300">
            Our language engine is still finalizing your grammar fixes,
            vocabulary upgrades, and Vox/Vivi voice outro. This page will unlock
            automatically!
          </p>
        </div>

        <Link
          href="/conversation/review"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-2.5 text-xs font-black text-white transition hover:bg-white/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Past Reviews</span>
        </Link>
      </div>
    </div>
  );
}