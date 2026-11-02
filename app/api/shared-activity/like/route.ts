// app/api/shared-activity/like/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    const currentUser = await requireUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id: activityId, liked, type, targetUserId, title } = body;

    if (!activityId) {
      return NextResponse.json(
        { error: "Missing activityId" },
        { status: 400 }
      );
    }

    if (liked) {
      await prisma.like.upsert({
        where: {
          userId_activityId: {
            userId: currentUser.id,
            activityId: String(activityId),
          },
        },
        create: {
          userId: currentUser.id,
          activityId: String(activityId),
          type: String(type || "Activity"),
        },
        update: {},
      });

      // Send a Notification if liking another learner's milestone
      if (targetUserId && targetUserId !== currentUser.id) {
        await prisma.notification
          .upsert({
            where: {
              userId_activityId_fromUserId: {
                userId: String(targetUserId),
                activityId: String(activityId),
                fromUserId: currentUser.id,
              },
            },
            create: {
              type: "LIKE",
              userId: String(targetUserId),
              toUserId: String(targetUserId),
              fromUserId: currentUser.id,
              activityId: String(activityId),
              activityType: String(type || "Activity"),
              activityTitle: String(title || "Milestone"),
            },
            update: { isRead: false },
          })
          .catch(() => {});
      }
    } else {
      await prisma.like.deleteMany({
        where: {
          userId: currentUser.id,
          activityId: String(activityId),
        },
      });
    }

    const totalLikes = await prisma.like.count({
      where: { activityId: String(activityId) },
    });

    return NextResponse.json({
      ok: true,
      liked: Boolean(liked),
      likes: totalLikes,
    });
  } catch (error) {
    console.error("[shared-activity LIKE] Error:", error);
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 }
    );
  }
}