// lib/system-tasks/handlers/handle-vocab-bridge.ts
import { Prisma, SystemTask } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { foundationBridgeWebhookSchema } from "@/lib/schema/foundation/vocab-schema";
import { advanceMilestoneBuildChain } from "@/lib/foundation/advance-build-chain";

const json = (v: unknown) => v as Prisma.InputJsonValue;

function normalizeSlug(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "_");
}

function inferNounMeta(cleanWord: string) {
  if (cleanWord.startsWith("le ") || cleanWord.startsWith("un ")) {
    return {
      gender: "M",
      lemma: cleanWord.replace(/^(le|un)\s+/, ""),
      pos: "NOUN",
    };
  }
  if (cleanWord.startsWith("la ") || cleanWord.startsWith("une ")) {
    return {
      gender: "F",
      lemma: cleanWord.replace(/^(la|une)\s+/, ""),
      pos: "NOUN",
    };
  }
  return {
    gender: null,
    lemma: cleanWord,
    pos: cleanWord.includes(" ") ? "EXPRESSION" : "NOUN",
  };
}

export async function handleVocabBridgeGeneration(
  task: SystemTask,
  body: unknown,
) {
  // 1. Validate
  const parsed = foundationBridgeWebhookSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      `[vocab-bridge] invalid payload for task ${task.id}`,
      parsed.error.issues,
    );
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const { userId, courseId, bridgeIndex } = data.meta;

  const { wordAudio, ...rest } = data;
  console.log(
    `[vocab-bridge] parsed body for task ${task.id} (wordAudio: ${Object.keys(wordAudio ?? {}).length} words):`,
    JSON.stringify(rest, null, 2),
  );

  console.log(
    `[vocab-bridge] received task ${task.id} (user=${userId}, course=${courseId}, bridgeIndex=${bridgeIndex})`,
  );

  // 2. Find the lesson this bridge belongs to (bridgeIndex === lesson.orderIndex)
  const lesson = await prisma.foundationLesson.findUnique({
    where: {
      foundationCourseId_orderIndex: {
        foundationCourseId: courseId,
        orderIndex: bridgeIndex,
      },
    },
    select: { id: true, userId: true, title: true },
  });

  if (!lesson || lesson.userId !== userId) {
    // 409 so the vocab lambda knows to retry if the lesson webhook hasn't landed yet
    return NextResponse.json(
      { message: "Lesson not found for this bridge" },
      { status: 409 },
    );
  }

  // 3. Clean up before saving
  const cooldown = data.cooldown.map((item, i) => ({
    ...item,
    itemId: `${bridgeIndex}-${item.mechanic}-${i}`,
  }));

  const { wordAudio: _duplicate, ...handoffFragment } = data.handoffFragment;

  const content = {
    userId,
    bridgeScene: json(data.bridgeScene),
    vocabMoment: json(data.vocabMoment),
    cooldown: json(cooldown),
    pronunciationCheck: json(data.pronunciationCheck),
    handoffFragment: json(handoffFragment),
    wordAudio: json(data.wordAudio),
  };

  // 4. Upsert (idempotent on course + bridgeIndex, so retries are safe)
  const bridge = await prisma.foundationBridge.upsert({
    where: {
      foundationCourseId_bridgeIndex: {
        foundationCourseId: courseId,
        bridgeIndex,
      },
    },
    create: {
      foundationCourseId: courseId,
      foundationLessonId: lesson.id,
      bridgeIndex,
      ...content,
    },
    update: content,
    select: { id: true },
  });

  // 4.5. Pre-populate WordStat with all vocabMoment items + S3 wordAudio so Matrix is 100% enriched!
  try {
    const rawLang = data.meta.targetLanguage || "fr-FR";
    const targetLang =
      rawLang === "fr"
        ? "fr-FR"
        : rawLang === "es"
          ? "es-ES"
          : rawLang;

    const profile = await prisma.languageProfile.upsert({
      where: {
        userId_languageCode: {
          userId,
          languageCode: targetLang,
        },
      },
      update: {},
      create: {
        userId,
        languageCode: targetLang,
      },
    });

    const audioMap = (data.wordAudio ?? {}) as Record<
      string,
      { m?: string; f?: string }
    >;

    for (const item of data.vocabMoment ?? []) {
      const cleanWord = item.word
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:"]+$/g, "")
        .trim();
      if (!cleanWord) continue;

      const slug = normalizeSlug(cleanWord);
      const inferred = inferNounMeta(cleanWord);
      const wordType =
        cleanWord.includes(" ") || cleanWord.includes("'") ? "PHRASE" : "WORD";
      const componentWords =
        wordType === "PHRASE"
          ? cleanWord.split(/[\s']+/).filter(Boolean)
          : [];

      const audioEntry = audioMap[slug] || {};
      const audioMaleKey =
        audioEntry.m || `foundation/words/${targetLang}/m/${slug}.mp3`;
      const audioFemaleKey =
        audioEntry.f ||
        item.audioS3Key ||
        `foundation/words/${targetLang}/f/${slug}.mp3`;

      await prisma.wordStat.upsert({
        where: {
          languageProfileId_word: {
            languageProfileId: profile.id,
            word: cleanWord,
          },
        },
        update: {
          translation: item.gloss,
          partOfSpeech: inferred.pos,
          lemma: inferred.lemma,
          ...(inferred.gender ? { grammaticalGender: inferred.gender } : {}),
          audioMaleKey,
          audioFemaleKey,
        },
        create: {
          languageProfileId: profile.id,
          word: cleanWord,
          wordType,
          partOfSpeech: inferred.pos,
          translation: item.gloss,
          lemma: inferred.lemma,
          grammaticalGender: inferred.gender,
          componentWords,
          audioMaleKey,
          audioFemaleKey,
          seenCount: 0,
          heardCount: 0,
          masteryScore: 0,
          status: "NEW",
        },
      });
    }
  } catch (err) {
    console.error("[vocab-bridge] failed to pre-seed WordStat:", err);
  }

  // 5. Notify the client (a Pusher failure must not fail the webhook)
  try {
    await pusherServer.trigger(`user-${userId}`, "foundation-bridge-ready", {
      lessonId: lesson.id,
      bridgeId: bridge.id,
      bridgeIndex,
    });
  } catch (err) {
    console.error("[vocab-bridge] pusher failed", err);
  }

  // 6. Mark the task complete
  await prisma.systemTask.update({
    where: { id: task.id },
    data: { status: "COMPLETED" },
  });

  console.log(
    `[vocab-bridge] completed task ${task.id} (bridgeId=${bridge.id}, lessonId=${lesson.id})`,
  );

  // 7. DAISY-CHAIN: Advance the milestone build chain (1 -> 2 -> 3 -> Boss)!
  await advanceMilestoneBuildChain({
    courseId,
    completedSpoonNumber: bridgeIndex,
  });

  return NextResponse.json({ bridgeId: bridge.id, lessonId: lesson.id });
}