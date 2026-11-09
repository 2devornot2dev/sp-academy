// lib/system-tasks/handlers/handle-sprite-notification.ts
import { prisma } from "@/lib/prisma";
import { SystemTask } from "@prisma/client";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function handleSpriteNotificationGeneration(
  task: SystemTask,
  body: any,
) {
  // 1. Handle Lambda failure webhook
  if (body.status === "FAILED") {
    await prisma.systemTask.update({
      where: { id: task.id },
      data: {
        status: "FAILED",
        result: typeof body === "string" ? body : JSON.stringify(body),
      },
    });
    return NextResponse.json({ ok: false, error: body.error }, { status: 200 });
  }

  const meta = (task.metadata as Record<string, any>) || {};
  const defaultOrderIndex = Number(
    body.orderIndex ?? meta.orderIndex ?? meta.spriteOrderIndex ?? 1,
  );
  const fallbackNodeId = body.nodeId || meta.nodeId;

  // 2. Normalize single post or array of posts from spoon-sprite-builder
  const incomingPosts = Array.isArray(body.posts)
    ? body.posts
    : [
        {
          nodeId: fallbackNodeId,
          spriteSlug: body.spriteSlug || "vox",
          nativeLanguage: body.nativeLanguage || meta.nativeLanguage || "en-US",
          targetLanguage: body.targetLanguage || meta.targetLanguage || "fr-FR",
          nativeVoiceId: body.nativeVoiceId || "en-US-boy-01",
          targetVoiceId: body.targetVoiceId || "fr-FR-boy-01",
          orderIndex: defaultOrderIndex,
          header: body.header || "Mission Update",
          nativeBody: body.nativeBody || body.body || "",
          targetBody: body.targetBody || "",
          nativeAudioUrl: body.nativeAudioUrl ?? null,
          targetAudioUrl: body.targetAudioUrl ?? null,
          videoUrl: body.videoUrl ?? null,
          action: body.action ?? null,
        },
      ];

  const validPosts = incomingPosts.filter((p: any) =>
    Boolean(p.nodeId || fallbackNodeId),
  );

  if (validPosts.length === 0) {
    return NextResponse.json(
      { message: "Missing nodeId in webhook payload" },
      { status: 400 },
    );
  }

  // 3. Upsert each generated node into SpriteNode & mark SystemTask COMPLETED
  try {
    await prisma.$transaction([
      ...validPosts.map((post: any) => {
        const resolvedNodeId = String(post.nodeId || fallbackNodeId);
        const parts = resolvedNodeId.split(":");
        const resolvedOrderIndex = Number(post.orderIndex ?? defaultOrderIndex);

        return prisma.spriteNode.upsert({
          where: { nodeId: resolvedNodeId },
          update: {
            header: post.header || "Mission Update",
            nativeBody: post.nativeBody || "",
            targetBody: post.targetBody || "",
            nativeAudioUrl: post.nativeAudioUrl ?? null,
            targetAudioUrl: post.targetAudioUrl ?? null,
            videoUrl: post.videoUrl ?? null,
            action: post.action ?? null,
          },
          create: {
            nodeId: resolvedNodeId,
            spriteSlug: post.spriteSlug || parts[0] || "vox",
            nativeLanguage: post.nativeLanguage || "en-US",
            targetLanguage: post.targetLanguage || "fr-FR",
            nativeVoiceId: post.nativeVoiceId || parts[1] || "en-US-boy-01",
            targetVoiceId: post.targetVoiceId || parts[2] || "fr-FR-boy-01",
            orderIndex: resolvedOrderIndex,
            header: post.header || "Mission Update",
            nativeBody: post.nativeBody || "",
            targetBody: post.targetBody || "",
            nativeAudioUrl: post.nativeAudioUrl ?? null,
            targetAudioUrl: post.targetAudioUrl ?? null,
            videoUrl: post.videoUrl ?? null,
            action: post.action ?? null,
          },
        });
      }),
      prisma.systemTask.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          result: typeof body === "string" ? body : JSON.stringify(body),
        },
      }),
    ]);
  } catch (err: any) {
    console.error("[handleSpriteNotification] transaction failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 },
    );
  }

  // 4. Broadcast to the user via Pusher
  const userId = meta.userId;
  const firstPost = validPosts[0];
  if (userId && firstPost) {
    try {
      await pusherServer.trigger(`user-${userId}`, "sprite-node-ready", {
        nodeId: String(firstPost.nodeId || fallbackNodeId),
        orderIndex: Number(firstPost.orderIndex ?? defaultOrderIndex),
        stepType: meta.stepType ?? null,
        header: firstPost.header || "Mission Update",
        nativeBody: firstPost.nativeBody || "",
        targetBody: firstPost.targetBody || "",
        nativeAudioUrl: firstPost.nativeAudioUrl ?? null,
        targetAudioUrl: firstPost.targetAudioUrl ?? null,
        videoUrl: firstPost.videoUrl ?? null,
        action: firstPost.action ?? null,
      });
    } catch (err) {
      console.error("[handleSpriteNotification] Pusher trigger failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}