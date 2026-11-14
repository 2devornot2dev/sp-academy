// lib/system-tasks/handlers/handle-trial-generation.ts
import { Prisma, SystemTask } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { clearLiveTaskState } from "@/app/actions/system-task-actions";

const json = (v: unknown) => v as Prisma.InputJsonValue;

export async function handleTrialGeneration(
  task: SystemTask,
  body: any,
): Promise<NextResponse> {
  try {
    const userId = body?.userId as string;
    const courseId = body?.foundationCourseId as string;
    const spoons = Array.isArray(body?.spoons) ? body.spoons : [];
    const bridges = Array.isArray(body?.bridges) ? body.bridges : [];
    const bossScenario = body?.boss;

    if (!userId || !courseId || spoons.length === 0) {
      return NextResponse.json(
        { message: "Invalid trial webhook payload" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const lessonIds: string[] = [];
      const bridgeIds: string[] = [];

      // 1. Upsert all 3 Trial Spoons
      for (const s of spoons) {
        const orderIndex = Number(s.orderIndex);
        const lesson = await tx.foundationLesson.upsert({
          where: {
            foundationCourseId_orderIndex: {
              foundationCourseId: courseId,
              orderIndex,
            },
          },
          create: {
            userId,
            foundationCourseId: courseId,
            orderIndex,
            title: s.title || s.lessonHandoff?.theme || `Spoon ${orderIndex}`,
            status: "READY",
            visualContent: json(s.visualContent),
            grammarContent: json(s.grammarContent),
            pronunciationData: json(s.pronunciationData),
            listeningContent: json(s.listeningContent),
            quizContent: json(s.quizContent),
            freestyle: json(s.freestyle),
            lessonHandoff: json(s.lessonHandoff),
          },
          update: {
            title: s.title || s.lessonHandoff?.theme || `Spoon ${orderIndex}`,
            status: "READY",
            visualContent: json(s.visualContent),
            grammarContent: json(s.grammarContent),
            pronunciationData: json(s.pronunciationData),
            listeningContent: json(s.listeningContent),
            quizContent: json(s.quizContent),
            freestyle: json(s.freestyle),
            lessonHandoff: json(s.lessonHandoff),
          },
          select: { id: true },
        });
        lessonIds.push(lesson.id);

        // 2. Upsert matching Trial Bridge for this Spoon
        const b = bridges.find(
          (item: any) => Number(item.bridgeIndex) === orderIndex,
        );
        if (b) {
          const bridge = await tx.foundationBridge.upsert({
            where: {
              foundationCourseId_bridgeIndex: {
                foundationCourseId: courseId,
                bridgeIndex: orderIndex,
              },
            },
            create: {
              userId,
              foundationCourseId: courseId,
              foundationLessonId: lesson.id,
              bridgeIndex: orderIndex,
              bridgeScene: json(b.bridgeScene),
              vocabMoment: json(b.vocabMoment),
              cooldown: json(b.cooldown),
              pronunciationCheck: json(b.pronunciationCheck),
              handoffFragment: json(b.handoffFragment),
              wordAudio: json(b.wordAudio ?? {}),
            },
            update: {
              bridgeScene: json(b.bridgeScene),
              vocabMoment: json(b.vocabMoment),
              cooldown: json(b.cooldown),
              pronunciationCheck: json(b.pronunciationCheck),
              handoffFragment: json(b.handoffFragment),
              wordAudio: json(b.wordAudio ?? {}),
            },
            select: { id: true },
          });
          bridgeIds.push(bridge.id);
        }
      }

// 3. Upsert Trial Boss 1 (Milestone 1)
      if (bossScenario) {
        const introVideoS3Key =
          bossScenario?.boss?.introVideoKey ||
          bossScenario?.boss?.introVideoS3Key ||
          bossScenario?.introVideoS3Key ||
          null;

        await tx.foundationBossStage.upsert({
          where: {
            foundationCourseId_milestoneIndex: {
              foundationCourseId: courseId,
              milestoneIndex: 1,
            },
          },
          create: {
            userId,
            foundationCourseId: courseId,
            milestoneIndex: 1,
            targetLessonIds: lessonIds,
            targetBridgeIds: bridgeIds,
            status: "READY",
            introVideoS3Key,
            scenarioData: json(bossScenario),
          },
          update: {
            targetLessonIds: lessonIds,
            targetBridgeIds: bridgeIds,
            status: "READY",
            introVideoS3Key,
            scenarioData: json(bossScenario),
          },
        });
      }

      // 4. Mark SystemTask COMPLETED
      await tx.systemTask.update({
        where: { id: task.id },
        data: { status: "COMPLETED" },
      });
    });

    await clearLiveTaskState(userId).catch(() => {});

    console.log(
      `✅ [TrialHandler] Saved 3 Spoons, 3 Bridges, and Boss 1 in one go for course ${courseId}`,
    );

    return NextResponse.json({ ok: true, lessonId: courseId }, { status: 200 });
  } catch (error: any) {
    console.error("❌ [TrialHandler] Error saving trial milestone:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save trial milestone" },
      { status: 500 },
    );
  }
}