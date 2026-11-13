// lib/system-tasks/handlers/handler-freestyle-review.ts
import { prisma } from "@/lib/prisma";
import {
  SystemTask,
  LambdaStatus,
  SessionStatus,
  Prisma,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { FreestyleReviewWebhookSchema } from "@/lib/schema/freestyle-review-schema";
import { pusherServer } from "@/lib/pusher-server";
import { invalidateDossierCache } from "@/lib/sprites/get-cached-dossier";

export async function handleFreestyleReview(task: SystemTask, body: unknown) {
  try {
    // 🔍 1. LOG RAW INCOMING BODY
    console.log("====================================================");
    console.log("📥 [FREESTYLE REVIEW WEBHOOK] Raw Body Received:");
    console.log(JSON.stringify(body, null, 2));
    console.log("====================================================");

    const parsedResult = FreestyleReviewWebhookSchema.safeParse(body);
    console.log("🔍 Schema Validation Success:", parsedResult.success);

    if (!parsedResult.success) {
      console.error(
        "❌ [FREESTYLE REVIEW] Invalid Webhook Payload:",
        parsedResult.error.flatten
          ? parsedResult.error.flatten()
          : parsedResult.error,
      );
      return NextResponse.json(
        {
          message: "Invalid payload",
          errors: parsedResult.error.flatten
            ? parsedResult.error.flatten()
            : parsedResult.error,
        },
        { status: 400 },
      );
    }

    const { sessionId, status, review, error } = parsedResult.data;

    // 🚨 2. HANDLE FAILURE
    if (status === "FAILED") {
      console.error(
        `❌ [FREESTYLE REVIEW] Lambda failed for session ${sessionId}:`,
        error,
      );

      await prisma.freestyleReview.upsert({
        where: { freestyleSessionId: sessionId },
        update: { lambdaStatus: LambdaStatus.FAILED },
        create: {
          freestyleSessionId: sessionId,
          lambdaStatus: LambdaStatus.FAILED,
        },
      });

      await prisma.systemTask.update({
        where: { id: task.id },
        data: { status: "FAILED" },
      });

      await pusherServer.trigger(`session-${sessionId}`, "review:completed", {
        sessionId,
        status: "FAILED",
      });

      return NextResponse.json({ message: "Handled failure" }, { status: 200 });
    }

    // 🚨 3. HANDLE SUCCESS
    if (!review) {
      throw new Error("SUCCESS status but no review data");
    }

    // 📊 4. DETAILED BREAKDOWN LOGGING
    console.log("====================================================");
    console.log(`✅ [FREESTYLE REVIEW] Session ${sessionId} Succeeded!`);
    console.log("📈 METRICS:", JSON.stringify(review.metrics, null, 2));
    console.log("⚠️ MISTAKES COUNT:", review.mistakes?.length ?? 0);
    console.log("⚠️ MISTAKES LIST:", JSON.stringify(review.mistakes, null, 2));
    console.log(
      "🧠 GRAMMAR ANALYSIS:",
      JSON.stringify(review.grammarAnalysis, null, 2),
    );
    console.log(
      "💡 VOCAB UPGRADES:",
      JSON.stringify(review.vocabUpgrades, null, 2),
    );
    console.log(
      "💬 OVERALL FEEDBACK:",
      JSON.stringify(review.overallFeedback, null, 2),
    );
    console.log(
      "🤖 SPRITE OUTRO:",
      JSON.stringify(review.spriteOutro, null, 2),
    );
    console.log("====================================================");

    const {
      mistakes,
      overallFeedback,
      metrics,
      grammarAnalysis,
      vocabUpgrades,
      spriteOutro,
    } = review;

    const meta = (task.metadata as Record<string, any>) || {};
    const feedbackWithOutro = {
      ...overallFeedback,
      ...(spriteOutro ? { spriteOutro } : {}),
      tutorName: meta.tutorName || "Sophie",
      voiceGender: meta.voiceGender || "female",
    };

    const jsonOrNull = (v: unknown) =>
      v ? (v as Prisma.InputJsonValue) : Prisma.JsonNull;

    const updatedSession = await prisma.$transaction(async (tx) => {
      const data = {
        lambdaStatus: LambdaStatus.SUCCESS,
        mistakes: mistakes as Prisma.InputJsonValue[],
        overallFeedback: jsonOrNull(feedbackWithOutro),
        metrics: jsonOrNull(metrics),
        grammarAnalysis: jsonOrNull(grammarAnalysis),
        vocabUpgrades: jsonOrNull(vocabUpgrades),
      };

      await tx.freestyleReview.upsert({
        where: { freestyleSessionId: sessionId },
        update: data,
        create: { freestyleSessionId: sessionId, ...data },
      });

      const sess = await tx.freestyleSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.REVIEWED },
        select: { userId: true, targetLanguage: true },
      });

      await tx.systemTask.update({
        where: { id: task.id },
        data: { status: "COMPLETED" },
      });

      return sess;
    });

    // 5. ENRICH USER'S WORD MATRIX (`WordStat`) & INVALIDATE VOX DOSSIER CACHE
    try {
      const meta = (task.metadata as Record<string, any>) || {};
      const userId = updatedSession?.userId || meta.userId;
      const rawLang =
        updatedSession?.targetLanguage || meta.targetLanguage || "fr-FR";
      const targetLang =
        rawLang === "fr" ? "fr-FR" : rawLang === "es" ? "es-ES" : rawLang;

      if (userId) {
        const profile = await prisma.languageProfile.upsert({
          where: {
            userId_languageCode: { userId, languageCode: targetLang },
          },
          update: {},
          create: { userId, languageCode: targetLang },
        });

        // 5a. Add/update vocabulary upgrades in WordStat
        for (const item of vocabUpgrades ?? []) {
          const cleanWord = item.better
            .trim()
            .toLowerCase()
            .replace(/[.,!?;:"]+$/g, "")
            .trim();
          if (!cleanWord) continue;

          const wordType =
            cleanWord.includes(" ") || cleanWord.includes("'")
              ? "PHRASE"
              : "WORD";

          await prisma.wordStat.upsert({
            where: {
              languageProfileId_word: {
                languageProfileId: profile.id,
                word: cleanWord,
              },
            },
            update: {
              translation: item.explanation,
            },
            create: {
              languageProfileId: profile.id,
              word: cleanWord,
              wordType,
              partOfSpeech: wordType === "PHRASE" ? "EXPRESSION" : "NOUN",
              translation: item.explanation,
              seenCount: 1,
              status: "NEW",
            },
          });
        }

        // 5b. Log corrected mistakes into WordStat so Vox prioritizes them for practice
        for (const m of mistakes ?? []) {
          const cleanCorrection = m.correction
            .trim()
            .toLowerCase()
            .replace(/[.,!?;:"]+$/g, "")
            .trim();
          if (!cleanCorrection || cleanCorrection.split(/\s+/).length > 6) {
            continue;
          }

          const wordType =
            cleanCorrection.includes(" ") || cleanCorrection.includes("'")
              ? "PHRASE"
              : "WORD";

          await prisma.wordStat.upsert({
            where: {
              languageProfileId_word: {
                languageProfileId: profile.id,
                word: cleanCorrection,
              },
            },
            update: {
              translation: m.explanation,
              tappedWrong: { increment: 1 },
            },
            create: {
              languageProfileId: profile.id,
              word: cleanCorrection,
              wordType,
              partOfSpeech: wordType === "PHRASE" ? "EXPRESSION" : "NOUN",
              translation: m.explanation,
              seenCount: 1,
              tappedWrong: 1,
              status: "LEARNING",
            },
          });
        }

        await invalidateDossierCache(userId);
      }
    } catch (matrixErr) {
      console.error(
        "[handleFreestyleReview] WordStat/Dossier enrichment error:",
        matrixErr,
      );
    }

    // 6. Notify UI
    await pusherServer.trigger(`session-${sessionId}`, "review:completed", {
      sessionId,
      status: "SUCCESS",
    });

    return NextResponse.json(
      { message: "Review saved successfully" },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Error saving review:", err);

    await prisma.systemTask
      .update({
        where: { id: task.id },
        data: { status: "FAILED" },
      })
      .catch(console.error);

    try {
      const parsedBody = body as any;
      if (parsedBody?.sessionId) {
        await pusherServer.trigger(
          `session-${parsedBody.sessionId}`,
          "review:completed",
          {
            sessionId: parsedBody.sessionId,
            status: "FAILED",
          },
        );
      }
    } catch (pusherErr) {
      console.error("Failed to send fallback pusher event", pusherErr);
    }

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
