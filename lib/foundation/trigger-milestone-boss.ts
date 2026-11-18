// lib/foundation/trigger-milestone-boss.ts
"use server";

import { prisma } from "@/lib/prisma";
import { createCommand, lambda } from "@/lib/aws/lambda";
import { toLanguageCode } from "@/lib/languages";
import { getWordMatrix } from "@/lib/boss/get-word-matrix";
import { buildBossPayload } from "@/lib/boss/build-boss-payload";
import { SpoonBossTaskMetadataSchema } from "@/lib/boss/schemas";
import { getBossSpriteOrderIndex } from "@/lib/foundation/tools";
import { invokeEduBuilder } from "@/app/actions/invoke-edu-builder";
import { SystemTaskType } from "@prisma/client";

const BOSS_LAMBDA =
  process.env.BOSS_BUILDER_LAMBDA_NAME ?? "spoon-boss-builder";
const EVENT_PAYLOAD_LIMIT_BYTES = 256 * 1024;
const BASE_WEBHOOK = `${process.env.NEXT_PUBLIC_APP_URL2 ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://spoonacademy.com"}/api/webhooks/system-tasks`;

export async function triggerMilestoneBossAndNextSpoon({
  userId,
  courseId,
  milestoneIndex,
  prebakeNextSpoon = true,
}: {
  userId: string;
  courseId: string;
  milestoneIndex: number;
  prebakeNextSpoon?: boolean;
}) {
  const startIndex = (milestoneIndex - 1) * 3 + 1; // e.g. 1
  const endIndex = milestoneIndex * 3;             // e.g. 3
  const nextSpoonNumber = endIndex + 1;            // e.g. 4

  // 1. Check existing Boss Stage (Idempotency guard so webhook + completeVocabBridge never double-fire)
  const [course, existingBossStage, spriteProfile] = await Promise.all([
    prisma.foundationCourse.findUnique({
      where: { id: courseId },
      include: { user: { select: { firstName: true, gender: true } } },
    }),
    prisma.foundationBossStage.findUnique({
      where: {
        foundationCourseId_milestoneIndex: {
          foundationCourseId: courseId,
          milestoneIndex,
        },
      },
    }),
    prisma.spriteProfile.findUnique({
      where: { userId },
      include: { sprite: true },
    }),
  ]);

  if (!course) throw new Error(`Course ${courseId} not found`);

  const targetLanguage = toLanguageCode(course.targetLanguage);
  const nativeLanguage = toLanguageCode(course.nativeLanguage);

  // 2. Build Boss Stage + Boss Sprite if not already BUILDING / READY / COMPLETED
  if (
    !existingBossStage ||
    existingBossStage.status === "FAILED"
  ) {
const [targetLessons, targetBridges, wordMatrix, completedLadderRows] =
      await Promise.all([
        prisma.foundationLesson.findMany({
          where: {
            foundationCourseId: courseId,
            orderIndex: { gte: startIndex, lte: endIndex },
          },
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            title: true,
            orderIndex: true,
            lessonHandoff: true,
            grammarContent: true,
            freestyle: true,
          },
        }),
        prisma.foundationBridge.findMany({
          where: {
            foundationCourseId: courseId,
            bridgeIndex: { gte: startIndex, lte: endIndex },
          },
          orderBy: { bridgeIndex: "asc" },
          select: {
            id: true,
            foundationLessonId: true,
            bridgeIndex: true,
            vocabMoment: true,
            handoffFragment: true,
          },
        }),
        getWordMatrix(userId, targetLanguage),
        course.isHardMode
          ? prisma.userLadderProgress.findMany({
              where: {
                userId,
                passed: true,
                targetLanguage,
              },
              include: {
                ladderPack: { select: { translations: true } },
              },
            })
          : Promise.resolve([]),
      ]);

    const ladderWords = completedLadderRows.flatMap((row) => {
      const trans = (row.ladderPack.translations as Record<string, any>)?.[
        targetLanguage
      ];
      return (trans?.items || []).map((it: any) => ({
        word: it.word,
        tappedCorrect: 1,
        tappedWrong: 0,
        spokenAttempts: 1,
        avgSpokenScore: 70,
      }));
    });

    const combinedWordMatrix =
      ladderWords.length > 0 ? [...wordMatrix, ...ladderWords] : wordMatrix;

    if (targetLessons.length === 3 && targetBridges.length === 3) {
      const bossStage = await prisma.foundationBossStage.upsert({
        where: {
          foundationCourseId_milestoneIndex: {
            foundationCourseId: courseId,
            milestoneIndex,
          },
        },
        create: {
          userId,
          foundationCourseId: courseId,
          milestoneIndex,
          targetLessonIds: targetLessons.map((l) => l.id),
          targetBridgeIds: targetBridges.map((b) => b.id),
          status: "BUILDING",
        },
        update: {
          targetLessonIds: targetLessons.map((l) => l.id),
          targetBridgeIds: targetBridges.map((b) => b.id),
          status: "BUILDING",
          scenarioData: undefined,
        },
      });

      const metadata = SpoonBossTaskMetadataSchema.parse({
        bossStageId: bossStage.id,
        userId,
        courseId,
        milestoneIndex,
      });

      const systemTask = await prisma.systemTask.create({
        data: {
          type: "SPOON_BOSS_GENERATION",
          metadata,
        },
      });

      const webhookUrl = `${BASE_WEBHOOK}/${systemTask.id}`;

      const payload = buildBossPayload({
        taskId: systemTask.id,
        bossStageId: bossStage.id,
        targetLanguage,
        nativeLanguage,
        milestoneIndex,
        lessons: targetLessons,
        bridges: targetBridges,
        wordMatrix: combinedWordMatrix,
        webhookUrl,
      });

      const body = JSON.stringify(payload);
      const sizeBytes = Buffer.byteLength(body);

      if (sizeBytes > EVENT_PAYLOAD_LIMIT_BYTES) {
        throw new Error(
          `Boss payload is ${(sizeBytes / 1024).toFixed(1)} KB, exceeding 256 KB limit.`
        );
      }

      const lambdaPromises: Promise<any>[] = [
        lambda.send(
          createCommand({
            functionName: BOSS_LAMBDA,
            invocationType: "Event",
            payload: body,
          })
        ),
      ];

      // Also check/generate Boss SpriteNode (orderIndex = 7, 14, 21...)
      if (spriteProfile) {
        const bossSpriteOrderIndex = getBossSpriteOrderIndex(milestoneIndex);
        const bossNodeId = `${spriteProfile.sprite.slug}:${spriteProfile.nativeVoiceId}:${spriteProfile.targetVoiceId}:${bossSpriteOrderIndex}`;

        const cachedBossSprite = await prisma.spriteNode.findUnique({
          where: { nodeId: bossNodeId },
        });

        if (!cachedBossSprite) {
          const bossSpriteTask = await prisma.systemTask.create({
            data: {
              type: SystemTaskType.SPRITE_NOTIFICATION_GENERATION,
              payload: JSON.stringify({
                userId,
                courseId,
                milestoneIndex,
                orderIndex: bossSpriteOrderIndex,
                nodeId: bossNodeId,
              }),
              metadata: {
                userId,
                courseId,
                foundationCourseId: courseId,
                spriteProfileId: spriteProfile.id,
                orderIndex: bossSpriteOrderIndex,
                nodeId: bossNodeId,
                stepType: "BOSS",
              },
            },
          });

          lambdaPromises.push(
            lambda.send(
              createCommand({
                functionName: "spoon-sprite-builder",
                invocationType: "Event",
                payload: {
                  body: JSON.stringify({
                    spriteSlug: spriteProfile.sprite.slug,
                    spriteName: spriteProfile.sprite.name,
                    persona: spriteProfile.sprite.persona || "",
                    nativeLanguage,
                    targetLanguage,
                    nativeVoiceId: spriteProfile.nativeVoiceId,
                    targetVoiceId: spriteProfile.targetVoiceId,
                    spoon: endIndex,
                    milestoneIndex,
                    subStep: 4, // Boss step
                    orderIndex: bossSpriteOrderIndex,
                    stepType: "BOSS",
                    levelBand: "beginner",
                    goal: "general",
                    nodeId: bossNodeId,
                    webhookUrl: `${BASE_WEBHOOK}/${bossSpriteTask.id}`,
                  }),
                },
              })
            )
          );
        }
      }

      await Promise.all(lambdaPromises);
      console.log(
        `🚀 Triggered Boss Stage ${milestoneIndex} + Boss Sprite for course ${courseId}`
      );
    }
  }

  // 3. PRE-BAKE NEXT SPOON (e.g. Spoon 4, 7, 10) + ITS VOCAB BRIDGE & SPRITE
  if (prebakeNextSpoon) {
    const existingNextSpoon = await prisma.foundationLesson.findUnique({
      where: {
        foundationCourseId_orderIndex: {
          foundationCourseId: courseId,
          orderIndex: nextSpoonNumber,
        },
      },
      select: { id: true, title: true },
    });

    if (!existingNextSpoon) {
      await invokeEduBuilder({
        userId,
        firstName: course.user.firstName || "Learner",
        gender: course.user.gender || "M",
        foundationCourseId: courseId,
        spoon: nextSpoonNumber,
        nativeLanguage,
        targetLanguage,
        levelBand: "unspecified", // Automatically recovered inside invokeEduBuilder from Spoon 1
        goal: "unspecified",
        scriptComfort: "unspecified",
        type: "lang",
        isOnboarding: false,
      });
      console.log(
        `🔥 Pre-baking Spoon ${nextSpoonNumber} while user is on Boss ${milestoneIndex}!`
      );
    }
  }
}