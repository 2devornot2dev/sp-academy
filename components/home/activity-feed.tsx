// components/home/ActivityFeed.tsx
"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  Crown,
  Sparkles,
  Zap,
  BookOpen,
  Trophy,
  Flame,
} from "lucide-react";
import type { FeedActivityItem } from "@/app/api/shared-activity/route";

function LikeButton({ item }: { item: FeedActivityItem }) {
  const [liked, setLiked] = useState(Boolean(item.liked));
  const [likes, setLikes] = useState(Number(item.likes || 0));
  const [animating, setAnimating] = useState(false);

  const handleToggleLike = async () => {
    const nextLiked = !liked;
    const prevLikes = likes;

    setAnimating(true);
    setLiked(nextLiked);
    setLikes(nextLiked ? prevLikes + 1 : Math.max(0, prevLikes - 1));

    try {
      const res = await fetch("/api/shared-activity/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          liked: nextLiked,
          type: item.type,
          targetUserId: item.user?.id,
          title: item.title,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (typeof data.likes === "number") setLikes(data.likes);
    } catch {
      setLiked(!nextLiked);
      setLikes(prevLikes);
    } finally {
      setTimeout(() => setAnimating(false), 260);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleLike}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition ${
        liked
          ? "border-rose-500/40 bg-rose-500/15 text-rose-500"
          : "border-slate-200 bg-slate-50 text-slate-500 hover:border-rose-300 hover:text-rose-500"
      }`}
    >
      <Heart
        className={`h-3 w-3 transition-transform ${
          liked ? "fill-rose-500 text-rose-500" : ""
        } ${animating ? "scale-125" : "scale-100"}`}
      />
      <span>{likes}</span>
    </button>
  );
}

function ActivityTypeEmblem({ item }: { item: FeedActivityItem }) {
  if (item.imageUrl) {
    return (
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-2xs">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  const config = {
    BossDefeated: {
      Icon: Crown,
      bg: "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950",
    },
    SpoonCompleted: {
      Icon: Sparkles,
      bg: "bg-gradient-to-br from-indigo-500 to-teal-500 text-white",
    },
    RepairArcade: {
      Icon: Zap,
      bg: "bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950",
    },
    BookCompleted: {
      Icon: BookOpen,
      bg: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white",
    },
    Achievement: {
      Icon: Trophy,
      bg: "bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950",
    },
  }[item.type] || {
    Icon: Sparkles,
    bg: "bg-gradient-to-br from-indigo-500 to-teal-500 text-white",
  };

  const Icon = config.Icon;

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${config.bg}`}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<FeedActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shared-activity")
      .then((res) => (res.ok ? res.json() : { activities: [] }))
      .then((data) => {
        if (Array.isArray(data?.activities)) {
          setActivities(data.activities);
        } else {
          setActivities([]);
        }
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-3"
          />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="my-auto rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
        <Flame className="mx-auto h-7 w-7 text-indigo-500 mb-1.5" />
        <p className="text-xs font-extrabold text-slate-800">
          No recent activity yet
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Complete a Spoon or Boss Stage to post your first win!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
      {activities.map((item, idx) => {
        const safeDate = item.createdAt ? new Date(item.createdAt) : new Date();
        const timeAgo = formatDistanceToNow(safeDate, { addSuffix: true });
        const userName = item.user?.name || "Learner";

        return (
          <div
            key={`${item.id || idx}-${idx}`}
            className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 transition hover:border-indigo-200 hover:bg-white"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 text-[10px] font-black text-white">
                  {userName[0]?.toUpperCase() || "S"}
                </div>
                <span className="text-xs font-extrabold text-slate-800 truncate">
                  {userName}
                </span>
                <span className="text-[10px] font-medium text-slate-400 shrink-0">
                  · {timeAgo}
                </span>
              </div>

              <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[9px] font-black uppercase text-indigo-700 shrink-0">
                {item.badge}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <ActivityTypeEmblem item={item} />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {item.title}
                  </p>
                  {item.detail && (
                    <p className="text-[11px] font-medium text-slate-500 truncate">
                      {item.detail}
                    </p>
                  )}
                </div>
              </div>

              <LikeButton item={item} />
            </div>
          </div>
        );
      })}
    </div>
  );
}