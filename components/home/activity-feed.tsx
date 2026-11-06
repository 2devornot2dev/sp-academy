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
  Headphones,
} from "lucide-react";
import type { FeedActivityItem } from "@/app/api/shared-activity/route";
import { UserProfileData } from "@/app/actions/get-home-dashboard";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";

const ACTIVITY_THEME_MAP: Record<
  FeedActivityItem["type"],
  {
    Icon: any;
    emblem3D: string;
    badgePill: string;
    cardHover: string;
  }
> = {
  SpoonCompleted: {
    Icon: Headphones,
    emblem3D:
      "border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white",
    badgePill: "bg-sky-50 text-blue-700 ring-1 ring-sky-200/80",
    cardHover: "hover:border-sky-300",
  },
  BossDefeated: {
    Icon: Crown,
    emblem3D:
      "border-b-[3px] border-purple-950 bg-gradient-to-b from-violet-500 to-purple-700 text-amber-300",
    badgePill: "bg-purple-50 text-purple-700 ring-1 ring-purple-200/80",
    cardHover: "hover:border-purple-300",
  },
  RepairArcade: {
    Icon: Zap,
    emblem3D:
      "border-b-[3px] border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950",
    badgePill: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
    cardHover: "hover:border-amber-300",
  },
  BookCompleted: {
    Icon: BookOpen,
    emblem3D:
      "border-b-[3px] border-emerald-700 bg-gradient-to-b from-teal-400 to-emerald-600 text-white",
    badgePill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
    cardHover: "hover:border-emerald-300",
  },
  Achievement: {
    Icon: Trophy,
    emblem3D:
      "border-b-[3px] border-amber-700 bg-gradient-to-b from-yellow-300 to-amber-500 text-slate-950",
    badgePill: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
    cardHover: "hover:border-amber-300",
  },
};

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
      className={`inline-flex shrink-0 items-center gap-1 rounded-xl border-2 border-b-[3px] px-2.5 py-1 text-[11px] font-black transition-all active:translate-y-0.5 active:border-b-0 ${
        liked
          ? "border-rose-300 border-b-rose-500 bg-rose-50 text-rose-600 shadow-2xs"
          : "border-slate-200 border-b-slate-300 bg-white text-slate-500 hover:border-rose-200 hover:text-rose-500"
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
  const theme =
    ACTIVITY_THEME_MAP[item.type] || ACTIVITY_THEME_MAP.SpoonCompleted;
  const Icon = theme.Icon;

  if (item.imageUrl) {
    return (
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border-2 border-b-[3px] border-slate-200 bg-slate-900 shadow-2xs">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-2xs ${theme.emblem3D}`}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

export default function ActivityFeed({
  profile,
}: {
  profile: UserProfileData | null;
}) {
  const [activities, setActivities] = useState<FeedActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = profile?.id;

  useEffect(() => {
    fetch(`/api/users/${userId}/shared-activity`)
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
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-20 animate-pulse rounded-2xl border-2 border-b-4 border-slate-100 bg-slate-50/70 p-3"
          />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="my-auto rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-xs">
          <Flame className="h-5 w-5" />
        </div>
        <p className="text-xs font-black text-slate-800">
          No recent activity yet
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-slate-400">
          Complete a Spoon, Book, or Boss Stage to post your first win!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
      {activities.map((item, idx) => {
        const safeDate = item.createdAt ? new Date(item.createdAt) : new Date();
        const timeAgo = formatDistanceToNow(safeDate, { addSuffix: true });
        const userObj = (item.user || {}) as Record<string, any>;
        const displayUsername =
          userObj.displayUsername ||
          userObj.username ||
          userObj.name ||
          "Learner";
        const avatarUrl = userObj.avatarUrl || userObj.image || "";

        const theme =
          ACTIVITY_THEME_MAP[item.type] || ACTIVITY_THEME_MAP.SpoonCompleted;

        return (
          <div
            key={`${item.id || idx}-${idx}`}
            className={`rounded-2xl border-2 border-b-4 border-slate-200/80 border-b-slate-300/80 bg-white p-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xs ${theme.cardHover}`}
          >
            {/* Top Row: User Avatar + Username + Time + Category Badge */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar className="h-6 w-6 shrink-0 rounded-lg border-b-2 border-blue-800 shadow-2xs">
                  <AvatarImage
                    src={avatarUrl || undefined}
                    alt={displayUsername}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-lg bg-gradient-to-b from-sky-400 to-blue-600 text-[10px] font-black text-white">
                    {displayUsername[0]?.toUpperCase() || "L"}
                  </AvatarFallback>
                </Avatar>

                <span className="truncate text-xs font-black text-slate-800">
                  {displayUsername}
                </span>
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                  · {timeAgo}
                </span>
              </div>

              <span
                className={`shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-black tracking-wide uppercase ${theme.badgePill}`}
              >
                {item.badge}
              </span>
            </div>

            {/* Bottom Row: 3D Emblem/Thumbnail + Title/Detail + 3D Like Button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <ActivityTypeEmblem item={item} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-slate-900">
                    {item.title}
                  </p>
                  {item.detail && (
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
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