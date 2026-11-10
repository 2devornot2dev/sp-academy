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
import z from "zod";
import { pusherServer } from "@/lib/pusher-server";
import { invalidateDossierCache } from "@/lib/sprites/get-cached-dossier";

export async function handleFreestyleReview(task: SystemTask, body: unknown) {
  try {
    const parsedResult = FreestyleReviewWebhookSchema.safeParse(body);
    console.log("Parsed Freestyle Review:", parsedResult.success);

    if (!parsedResult.success) {
      console.error(
        "Invalid Webhook Payload:",
        z.flattenError(parsedResult.error),
      );
      return NextResponse.json(
        {
          message: "Invalid payload",
          errors: z.flattenError(parsedResult.error),
        },
        { status: 400 },
      );
    }

    const { sessionId, status, review, error } = parsedResult.data;

    // 🚨 1. HANDLE FAILURE
    if (status === "FAILED") {
      console.error(`Lambda failed for session ${sessionId}:`, error);

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

      // Tell the UI that the review failed so it doesn't spin forever
      await pusherServer.trigger(`session-${sessionId}`, "review:completed", {
        sessionId,
        status: "FAILED",
      });

      return NextResponse.json({ message: "Handled failure" }, { status: 200 });
    }

    // 🚨 2. HANDLE SUCCESS
    if (!review) {
      throw new Error("SUCCESS status but no review data");
    }

    const {
      mistakes,
      overallFeedback,
      metrics,
      grammarAnalysis,
      vocabUpgrades,
    } = review;

    const jsonOrNull = (v: unknown) =>
      v ? (v as Prisma.InputJsonValue) : Prisma.JsonNull;

    const updatedSession = await prisma.$transaction(async (tx) => {
      const data = {
        lambdaStatus: LambdaStatus.SUCCESS,
        mistakes: mistakes as Prisma.InputJsonValue[],
        overallFeedback: jsonOrNull(overallFeedback),
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

    // 3. ENRICH USER'S WORD MATRIX (`WordStat`) & INVALIDATE VOX DOSSIER CACHE
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

        // 3a. Add/update vocabulary upgrades in WordStat
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

        // 3b. Log corrected mistakes into WordStat so Vox prioritizes them for practice
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

        // Refresh Vox/Vivi's cached dossier so new mistakes & words appear in Briefing immediately
        await invalidateDossierCache(userId);
      }
    } catch (matrixErr) {
      console.error(
        "[handleFreestyleReview] WordStat/Dossier enrichment error:",
        matrixErr,
      );
    }

    // 4. Tell the UI that the review is ready!
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

    // Fallback trigger so UI gets unstuck in case of a server crash
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