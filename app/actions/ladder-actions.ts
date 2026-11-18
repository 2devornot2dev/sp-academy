// app/actions/ladder-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { lambda, createCommand } from "@/lib/aws/lambda";
import { getPresignedImageUrl } from "@/lib/aws/services/s3-presigned-url";
import { requireUser } from "@/lib/auth-guard";
import { Prisma, SystemTaskType } from "@prisma/client";
import type {
  LadderFlipChallenge,
  LadderItem,
  LadderLocaleContent,
} from "@/lib/schema/ladder-schema";

const LADDER_LAMBDA_NAME =
  process.env.LADDER_BUILDER_LAMBDA_NAME ?? "spoon-ladder-builder";

const BASE_WEBHOOK = `${
  process.env.NEXT_PUBLIC_APP_URL2 ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://spoonacademy.com"
}/api/webhooks/system-tasks`;

const LADDER_UNLOCK_SPOON = 15;

const STARTER_LADDER_SLUGS = [
  "colors-1",
  "numbers-time-1",
  "everyday-objects-1",
  "opposites-1",
  "moods-1",
  "weather-1",
  "body-1",
  "verbs-present-1",
  "verbs-past-1",
  "verbs-future-1",
] as const;

function normalizeLocale(raw?: string | null, fallback = "fr-FR"): string {
  if (!raw) return fallback;
  const v = raw.trim();
  const lower = v.toLowerCase();
  if (lower === "fr" || lower === "french") return "fr-FR";
  if (lower === "es" || lower === "spanish") return "es-ES";
  if (lower === "en" || lower === "english") return "en-US";
  return v;
}

async function safePresign(key?: string | null): Promise<string | null> {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  try {
    return await getPresignedImageUrl(key);
  } catch {
    return null;
  }
}

// ============================================================================
// 1. ADMIN / SEED TRIGGERS (Invoke spoon-ladder-builder)
// ============================================================================
export async function invokeLadderBuilder({
  slug,
  languages = ["fr-FR", "es-ES", "en-US"],
}: {
  slug: string;
  languages?: string[];
}): Promise<{ ok: boolean; taskId?: string; error?: string }> {
  try {
    const user = await requireUser();

    const task = await prisma.systemTask.create({
      data: {
        type: SystemTaskType.LADDER_GENERATION,
        status: "IN_PROGRESS",
        metadata: {
          triggeredBy: user.id,
          slug,
          languages,
        },
      },
    });

    const webhookUrl = `${BASE_WEBHOOK}/${task.id}`;
    const payload = {
      taskId: task.id,
      slug,
      languages,
      webhookUrl,
    };

    await prisma.systemTask.update({
      where: { id: task.id },
      data: { payload: payload as unknown as Prisma.InputJsonValue },
    });

    const res = await lambda.send(
      createCommand({
        functionName: LADDER_LAMBDA_NAME,
        invocationType: "Event",
        payload: { body: JSON.stringify(payload) },
      }),
    );

    if (res.StatusCode !== 202) {
      throw new Error(`Unexpected Lambda status: ${res.StatusCode}`);
    }

    return { ok: true, taskId: task.id };
  } catch (err: any) {
    console.error(`❌ [invokeLadderBuilder] failed for ${slug}:`, err);
    return { ok: false, error: err?.message || "Failed to trigger ladder bake" };
  }
}

export async function seedAllLadderRungs(): Promise<{
  ok: boolean;
  triggered: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let triggered = 0;

  for (const slug of STARTER_LADDER_SLUGS) {
    const res = await invokeLadderBuilder({ slug });
    if (res.ok) {
      triggered += 1;
    } else {
      errors.push(`${slug}: ${res.error}`);
    }
  }

  return { ok: errors.length === 0, triggered, errors };
}

// ============================================================================
// 2. READ ACTIONS (Overview for /learning-hub + Rung Hydration for Player)
// ============================================================================
export interface LadderRungSummary {
  id: string;
  slug: string;
  rungOrder: number;
  tier: number;
  category: string;
  icon: string;
  accentColor: string;
  title: string;
  subtitle: string;
  previewImageUrl: string | null;
  status: "COMPLETED" | "ACTIVE" | "LOCKED";
  score: number | null;
  attempts: number;
}

export interface LadderOverviewData {
  targetLanguage: string;
  completedSpoonsCount: number;
  unlockThreshold: number;
  isUnlocked: boolean;
  rungs: LadderRungSummary[];
  completedCount: number;
  totalCount: number;
  activeRung: LadderRungSummary | null;
}

export async function getLadderOverview(
  userId: string,
  rawTargetLanguage?: string | null,
): Promise<LadderOverviewData> {
  const targetLang = normalizeLocale(rawTargetLanguage, "fr-FR");

  const [standardCourse, packs, progressRows] = await Promise.all([
    prisma.foundationCourse.findFirst({
      where: { userId, isHardMode: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        targetLanguage: true,
        lessons: {
          where: { completedAt: { not: null } },
          select: { id: true },
        },
      },
    }),
    prisma.vocabLadderPack.findMany({
      where: { isPublished: true },
      orderBy: { rungOrder: "asc" },
    }),
    prisma.userLadderProgress.findMany({
      where: { userId, targetLanguage: targetLang },
    }),
  ]);

  const resolvedLang = normalizeLocale(
    rawTargetLanguage || standardCourse?.targetLanguage,
    "fr-FR",
  );
  const completedSpoonsCount = standardCourse?.lessons.length ?? 0;
  const isUnlocked = completedSpoonsCount >= LADDER_UNLOCK_SPOON;

  const progressByPackId = new Map(
    progressRows
      .filter((p) => p.targetLanguage === resolvedLang)
      .map((p) => [p.ladderPackId, p]),
  );

  let foundFirstIncomplete = false;
  const rawSummaries = packs.map((pack) => {
    const translations = (pack.translations as Record<string, LadderLocaleContent>) || {};
    const localeContent =
      translations[resolvedLang] ||
      translations["fr-FR"] ||
      Object.values(translations)[0];

    const prog = progressByPackId.get(pack.id);
    const isPassed = Boolean(prog?.passed);

    let status: "COMPLETED" | "ACTIVE" | "LOCKED" = "LOCKED";
    if (isUnlocked) {
      if (isPassed) {
        status = "COMPLETED";
      } else if (!foundFirstIncomplete) {
        status = "ACTIVE";
        foundFirstIncomplete = true;
      }
    }

    return {
      id: pack.id,
      slug: pack.slug,
      rungOrder: pack.rungOrder,
      tier: pack.tier,
      category: pack.category,
      icon: pack.icon,
      accentColor: pack.accentColor,
      title: localeContent?.title || pack.slug,
      subtitle: localeContent?.subtitle || "",
      previewKey: pack.imageS3Keys?.[0] ?? null,
      status,
      score: prog?.score ?? null,
      attempts: prog?.attempts ?? 0,
    };
  });

  // Only presign the active rung's preview thumbnail to keep Hub loads instant
  const activeSummary =
    rawSummaries.find((r) => r.status === "ACTIVE") ||
    rawSummaries[rawSummaries.length - 1] ||
    null;

  const activePreviewUrl = activeSummary?.previewKey
    ? await safePresign(activeSummary.previewKey)
    : null;

  const rungs: LadderRungSummary[] = rawSummaries.map(
    ({ previewKey: _k, ...rest }) => ({
      ...rest,
      previewImageUrl:
        activeSummary && rest.id === activeSummary.id ? activePreviewUrl : null,
    }),
  );

  const activeRung =
    rungs.find((r) => r.status === "ACTIVE") ||
    (isUnlocked ? rungs[rungs.length - 1] ?? null : null);

  return {
    targetLanguage: resolvedLang,
    completedSpoonsCount,
    unlockThreshold: LADDER_UNLOCK_SPOON,
    isUnlocked,
    rungs,
    completedCount: rungs.filter((r) => r.status === "COMPLETED").length,
    totalCount: rungs.length,
    activeRung,
  };
}

export interface HydratedLadderItem extends LadderItem {
  imageUrl: string | null;
  wordAudioUrl: string | null;
  rung2AudioUrl: string | null;
  rung3AudioUrl: string | null;
}

export interface HydratedLadderFlip extends LadderFlipChallenge {
  promptAudioUrl: string | null;
  targetAnswerAudioUrl: string | null;
}

export interface HydratedLadderRung {
  id: string;
  slug: string;
  rungOrder: number;
  tier: number;
  category: string;
  icon: string;
  accentColor: string;
  targetLanguage: string;
  title: string;
  subtitle: string;
  isUnlocked: boolean;
  passed: boolean;
  items: HydratedLadderItem[];
  flips: HydratedLadderFlip[];
}

export async function getLadderRung(
  slug: string,
  userId: string,
  rawTargetLanguage?: string | null,
): Promise<HydratedLadderRung | null> {
  const [pack, standardCourse] = await Promise.all([
    prisma.vocabLadderPack.findUnique({ where: { slug } }),
    prisma.foundationCourse.findFirst({
      where: { userId, isHardMode: false },
      orderBy: { createdAt: "desc" },
      select: {
        targetLanguage: true,
        lessons: {
          where: { completedAt: { not: null } },
          select: { id: true },
        },
      },
    }),
  ]);

  if (!pack) return null;

  const targetLang = normalizeLocale(
    rawTargetLanguage || standardCourse?.targetLanguage,
    "fr-FR",
  );
  const completedSpoonsCount = standardCourse?.lessons.length ?? 0;
  const isUnlocked = completedSpoonsCount >= LADDER_UNLOCK_SPOON;

  const progress = await prisma.userLadderProgress.findUnique({
    where: {
      userId_ladderPackId_targetLanguage: {
        userId,
        ladderPackId: pack.id,
        targetLanguage: targetLang,
      },
    },
  });

  const translations =
    (pack.translations as Record<string, LadderLocaleContent>) || {};
  const localeContent =
    translations[targetLang] ||
    translations["fr-FR"] ||
    Object.values(translations)[0];

  if (!localeContent) return null;

  // Presign all 8 images + all item & flip audio URLs in parallel
  const [imageUrls, hydratedItems, hydratedFlips] = await Promise.all([
    Promise.all((pack.imageS3Keys || []).map((k) => safePresign(k))),
    Promise.all(
      (localeContent.items || []).map(async (item) => {
        const [wordAudioUrl, rung2AudioUrl, rung3AudioUrl] = await Promise.all([
          safePresign(item.wordAudioS3Key),
          safePresign(item.rung2AudioS3Key),
          safePresign(item.rung3AudioS3Key),
        ]);
        return {
          ...item,
          wordAudioUrl,
          rung2AudioUrl,
          rung3AudioUrl,
          imageUrl: null as string | null,
        };
      }),
    ),
    Promise.all(
      (localeContent.flips || []).map(async (flip) => {
        const [promptAudioUrl, targetAnswerAudioUrl] = await Promise.all([
          safePresign(flip.promptAudioS3Key),
          safePresign(flip.targetAnswerAudioS3Key),
        ]);
        return {
          ...flip,
          promptAudioUrl,
          targetAnswerAudioUrl,
        };
      }),
    ),
  ]);

  const itemsWithImages: HydratedLadderItem[] = hydratedItems.map((item) => ({
    ...item,
    imageUrl: imageUrls[item.imageIndex] ?? null,
  }));

  return {
    id: pack.id,
    slug: pack.slug,
    rungOrder: pack.rungOrder,
    tier: pack.tier,
    category: pack.category,
    icon: pack.icon,
    accentColor: pack.accentColor,
    targetLanguage: targetLang,
    title: localeContent.title,
    subtitle: localeContent.subtitle,
    isUnlocked,
    passed: Boolean(progress?.passed),
    items: itemsWithImages,
    flips: hydratedFlips,
  };
}

// ============================================================================
// 3. COMPLETION ACTION (Saves Progress + Enriches WordStat Matrix)
// ============================================================================
export async function completeLadderRung({
  userId,
  ladderPackId,
  targetLanguage,
  score = 100,
}: {
  userId: string;
  ladderPackId: string;
  targetLanguage: string;
  score?: number;
}): Promise<{ ok: boolean }> {
  try {
    const resolvedLang = normalizeLocale(targetLanguage, "fr-FR");

    const pack = await prisma.vocabLadderPack.findUnique({
      where: { id: ladderPackId },
      select: { id: true, category: true, translations: true },
    });

    if (!pack) return { ok: false };

    await prisma.userLadderProgress.upsert({
      where: {
        userId_ladderPackId_targetLanguage: {
          userId,
          ladderPackId: pack.id,
          targetLanguage: resolvedLang,
        },
      },
      create: {
        userId,
        ladderPackId: pack.id,
        targetLanguage: resolvedLang,
        passed: true,
        score,
        attempts: 1,
        completedAt: new Date(),
      },
      update: {
        passed: true,
        score,
        attempts: { increment: 1 },
        completedAt: new Date(),
      },
    });

    // Enrich WordStat in Word Matrix for all 8 items in this Rung
    try {
      const translations =
        (pack.translations as Record<string, LadderLocaleContent>) || {};
      const localeContent = translations[resolvedLang];

      if (localeContent?.items?.length) {
        const profile = await prisma.languageProfile.upsert({
          where: {
            userId_languageCode: { userId, languageCode: resolvedLang },
          },
          update: {},
          create: { userId, languageCode: resolvedLang },
        });

        for (const item of localeContent.items) {
          const cleanWord = item.word
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
              translation: item.gloss,
              seenCount: { increment: 1 },
              tappedCorrect: { increment: 1 },
              spokenAttempts: { increment: 1 },
              status: "FAMILIAR",
            },
            create: {
              languageProfileId: profile.id,
              word: cleanWord,
              wordType,
              partOfSpeech:
                pack.category === "VERBS"
                  ? "VERB"
                  : pack.category === "MODIFIERS"
                    ? "ADJECTIVE"
                    : "NOUN",
              translation: item.gloss,
              seenCount: 1,
              tappedCorrect: 1,
              spokenAttempts: 1,
              avgSpokenScore: score,
              status: "FAMILIAR",
            },
          });
        }
      }
    } catch (matrixErr) {
      console.warn("[completeLadderRung] WordStat enrichment skipped:", matrixErr);
    }

    return { ok: true };
  } catch (err) {
    console.error("❌ [completeLadderRung] failed:", err);
    return { ok: false };
  }
}