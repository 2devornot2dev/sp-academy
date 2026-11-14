// components/freestyle/exercise/building-workout-poller.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";

export function BuildingWorkoutPoller({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  useEffect(() => {
    const channelName = `session-${sessionId}`;
    const channel = pusherClient.subscribe(channelName);

    const onCompleted = () => {
      router.refresh();
    };

    channel.bind("tutor-exercise:completed", onCompleted);

    return () => {
      channel.unbind("tutor-exercise:completed", onCompleted);
      pusherClient.unsubscribe(channelName);
    };
  }, [sessionId, router]);

  return null;
}