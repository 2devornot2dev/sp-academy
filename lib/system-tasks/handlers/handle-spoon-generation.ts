// lib/system-tasks/handlers/handle-spoon-generation.ts
import { FoundationLessonStatus, Prisma, SystemTask } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { foundationLessonWebhookSchema } from "@/lib/schema/foundation/lesson-schema";
import { clearLiveTaskState } from "@/app/actions/system-task-actions";
import { invalidateDossierCache } from "@/lib/sprites/get-cached-dossier";
import { advanceMilestoneBuildChain } from "@/lib/foundation/advance-build-chain";

const json = (v: unknown) => v as Prisma.InputJsonValue;

export async function handleSpoonGeneration(task: SystemTask, body: unknown) {
  console.log(
    `[spoon-generation] received body for task ${task.id}:\n${JSON.stringify(body, null, 2)}`
  );

  // 1. Validate (now includes listeningContent.wordTimestamps)
  const parsed = foundationLessonWebhookSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      `[spoon-generation] invalid payload for task ${task.id}:\n${JSON.stringify(
        parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          code: i.code,
          message: i.message,
        })),
        null,
        2
      )}`
    );
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  console.log(
    `[spoon-generation] payload valid (user=${data.userId}, course=${data.foundationCourseId}, orderIndex=${data.orderIndex}, wordTimestamps=${data.listeningContent.wordTimestamps?.length ?? 0})`
  );

  // 2. Make sure the course exists and belongs to this user
  const course = await prisma.foundationCourse.findFirst({
    where: { id: data.foundationCourseId, userId: data.userId },
    select: { id: true },
  });
  if (!course) {
    console.warn(
      `[spoon-generation] course not found: course=${data.foundationCourseId} user=${data.userId} task=${task.id}`
    );
    return NextResponse.json(
      { message: "Foundation course not found" },
      { status: 404 }
    );
  }

  // 3. Upsert (idempotent on courseId + orderIndex, so lambda retries are safe)
  const where = {
    foundationCourseId_orderIndex: {
      foundationCourseId: data.foundationCourseId,
      orderIndex: data.orderIndex,
    },
  };

  const existing = await prisma.foundationLesson.findUnique({
    where,
    select: { status: true },
  });

  const status =
    existing?.status === FoundationLessonStatus.COMPLETED
      ? FoundationLessonStatus.COMPLETED
      : FoundationLessonStatus.IN_PROGRESS;

  console.log(
    `[spoon-generation] upserting lesson (existing=${existing?.status ?? "none"} -> status=${status})`
  );

  const content = {
    title: data.lessonHandoff.theme,
    status,
    visualContent: json(data.visualContent),
    grammarContent: json(data.grammarContent),
    pronunciationData: json(data.pronunciationData),
    listeningContent: json(data.listeningContent),
    quizContent: json(data.quizContent),
    freestyle: json(data.freestyle),
    lessonHandoff: json(data.lessonHandoff),
  };

  const lesson = await prisma.foundationLesson.upsert({
    where,
    create: {
      userId: data.userId,
      foundationCourseId: data.foundationCourseId,
      orderIndex: data.orderIndex,
      ...content,
    },
    update: content,
    select: { id: true },
  });

  // 3.5 Seed / Enrich User's Word Matrix from lessonHandoff.wordLexicon
  const targetLang = data.targetLang;
  const wordLexicon = data.lessonHandoff.wordLexicon;

  if (targetLang && wordLexicon && Object.keys(wordLexicon).length > 0) {
    try {
      const profile = await prisma.languageProfile.upsert({
        where: {
          userId_languageCode: {
            userId: data.userId,
            languageCode: targetLang,
          },
        },
        update: {},
        create: {
          userId: data.userId,
          languageCode: targetLang,
        },
      });

      const lexiconEntries = Object.values(wordLexicon);

      await prisma.$transaction(
        lexiconEntries.map((entry) => {
          const cleanWord = entry.word.trim().toLowerCase();
          return prisma.wordStat.upsert({
            where: {
              languageProfileId_word: {
                languageProfileId: profile.id,
                word: cleanWord,
              },
            },
            update: {
              wordType: entry.wordType,
              partOfSpeech: entry.partOfSpeech,
              ...(entry.translation ? { translation: entry.translation } : {}),
              ...(entry.lemma ? { lemma: entry.lemma } : {}),
              ...(entry.grammaticalGender
                ? { grammaticalGender: entry.grammaticalGender }
                : {}),
              ...(entry.componentWords?.length
                ? { componentWords: entry.componentWords }
                : {}),
              ...(entry.audio?.m ? { audioMaleKey: entry.audio.m } : {}),
              ...(entry.audio?.f ? { audioFemaleKey: entry.audio.f } : {}),
            },
            create: {
              languageProfileId: profile.id,
              word: cleanWord,
              wordType: entry.wordType,
              partOfSpeech: entry.partOfSpeech,
              translation: entry.translation || null,
              lemma: entry.lemma || null,
              grammaticalGender: entry.grammaticalGender || null,
              componentWords: entry.componentWords || [],
              audioMaleKey: entry.audio?.m || null,
              audioFemaleKey: entry.audio?.f || null,
              seenCount: 0,
              status: "NEW",
            },
          });
        })
      );

      console.log(
        `[spoon-generation] 🧠 Enriched ${lexiconEntries.length} lexicon items in Word Matrix for user=${data.userId}`
      );
    } catch (matrixErr) {
      console.error("[spoon-generation] matrix lexicon seed error:", matrixErr);
    }
  }

  // 4. Clear live Redis task state & invalidate Sprite Dossier cache so the AI sees the new lesson immediately
  await Promise.all([
    clearLiveTaskState(data.userId),
    invalidateDossierCache(data.userId),
  ]);

  // 5. Tell the client it's ready via Pusher
  try {
    await Promise.all([
      pusherServer.trigger(`user-${data.userId}`, "foundation-lesson-ready", {
        lessonId: lesson.id,
        orderIndex: data.orderIndex,
      }),
      pusherServer.trigger(`user-${data.userId}`, "system-task-completed", {
        taskId: task.id,
        lessonId: lesson.id,
      }),
    ]);
  } catch (err) {
    console.error("[spoon-generation] pusher failed", err);
  }

  // 6. Mark the SystemTask complete
  await prisma.systemTask.update({
    where: { id: task.id },
    data: { status: "COMPLETED" },
  });

  // 7. DAISY-CHAIN: Automatically bake next Spoon in this milestone (1 -> 2 -> 3) or Boss (after 3)!
  await advanceMilestoneBuildChain({
    courseId: data.foundationCourseId,
    completedSpoonNumber: data.orderIndex,
  });

  console.log(
    `[spoon-generation] ✅ lesson saved & completed taskId=${task.id} lessonId=${lesson.id}`
  );

  return NextResponse.json({ lessonId: lesson.id });
}