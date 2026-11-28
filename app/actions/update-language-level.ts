// app/actions/update-language-level.ts
"use server";

import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const ALLOWED_LEVELS = new Set(["zero", "beginner", "intermediate"]);

export async function updateLanguageLevel({
  languageCode,
  levelBand,
}: {
  languageCode: string;
  levelBand: string;
}) {
  const user = await requireUser();
  const cleanLevel = levelBand.trim().toLowerCase();

  if (!ALLOWED_LEVELS.has(cleanLevel)) {
    return { ok: false as const, error: "Invalid level" };
  }

  await prisma.languageProfile.upsert({
    where: {
      userId_languageCode: {
        userId: user.id,
        languageCode,
      },
    },
    create: {
      userId: user.id,
      languageCode,
      levelBand: cleanLevel,
    } as any,
    update: {
      levelBand: cleanLevel,
    } as any,
  });

  return { ok: true as const };
}