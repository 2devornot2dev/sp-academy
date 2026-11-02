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
  const [liked, setLiked] = useState(item.liked);
  const [likes, setLikes] = useState(item.likes);
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
          targetUserId: item.user.id,
          title: item.title,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLikes(data.likes);
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold transition ${
        liked
          ? "border-rose-500/40 bg-rose-500/15 text-rose-400"
          : "border-slate-200 bg-slate-50 text-slate-500 hover:border-rose-300 hover:text-rose-500"
      }`}
    >
      <Heart
        className={`h-3.5 w-3.5 transition-transform ${
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
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm">
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
  }[item.type];

  const Icon = config.Icon;

  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-md ${config.bg}`}
    >
      <Icon className="h-6 w-6" />
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
        if (Array.isArray(data.activities)) {
          setActivities(data.activities);
        }
      })
      .catch((err) => console.error("Failed to load Spoon Feed:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-28 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-4"
          />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <Flame className="mx-auto h-8 w-8 text-indigo-500 mb-2" />
        <p className="text-sm font-extrabold text-slate-800">
          The Spoon Feed is warming up!
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Complete a Spoon, Boss Stage, or Repair Workout to post the first win.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((item) => {
        const timeAgo = formatDistanceToNow(new Date(item.createdAt), {
          addSuffix: true,
        });
        const initials = (item.user.name?.[0] || "S").toUpperCase();

        return (
          <div
            key={`${item.type}-${item.id}`}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-indigo-300 hover:shadow-md"
          >
            {/* Top Row: User Avatar + Name + Badge + Time */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {item.user.avatarUrl ? (
                  <img
                    src={item.user.avatarUrl}
                    alt={item.user.name}
                    className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 text-xs font-black text-white">
                    {initials}
                  </div>
                )}

                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-slate-900 truncate block">
                    {item.user.name}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {item.subtitle} · {timeAgo}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.language && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                    {item.language.split("-")[0]}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    item.type === "BossDefeated"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : item.type === "RepairArcade"
                        ? "bg-teal-100 text-teal-800 border border-teal-300"
                        : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  }`}
                >
                  {item.badge}
                </span>
              </div>
            </div>

            {/* Middle Row: 3D Scene Image / Emblem + Win Details + Like Button */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <ActivityTypeEmblem item={item} />

                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                    {item.title}
                  </h4>
                  {item.detail && (
                    <p className="text-xs font-semibold text-slate-500 mt-0.5 line-clamp-1">
                      {item.detail}
                    </p>
                  )}
                  {item.score != null && (
                    <span className="mt-1 inline-block rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                      Score: {item.score}%
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <LikeButton item={item} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}