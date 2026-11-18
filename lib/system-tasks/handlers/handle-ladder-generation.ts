// lib/system-tasks/handlers/handle-ladder-generation.ts
import { Prisma, SystemTask } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { LadderWebhookPayloadSchema } from "@/lib/schema/ladder-schema";

const json = (v: unknown) => v as Prisma.InputJsonValue;

export async function handleLadderGeneration(
  task: SystemTask,
  body: unknown,
): Promise<NextResponse> {
  try {
    const parsed = LadderWebhookPayloadSchema.safeParse(body);

    if (!parsed.success) {
      console.error(
        "❌ [LadderHandler] Invalid webhook payload:",
        parsed.error.flatten(),
      );
      return NextResponse.json(
        { message: "Invalid ladder webhook payload", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.status === "FAILED") {
      console.error(
        `❌ [LadderHandler] Lambda failed for ${data.slug}:`,
        data.error,
      );
      await prisma.systemTask.update({
        where: { id: task.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ message: "Handled failure" }, { status: 200 });
    }

    const pack = await prisma.$transaction(async (tx) => {
      const upserted = await tx.vocabLadderPack.upsert({
        where: { slug: data.slug },
        create: {
          slug: data.slug,
          rungOrder: data.rungOrder,
          tier: data.tier,
          category: data.category,
          icon: data.icon,
          accentColor: data.accentColor,
          imageS3Keys: data.imageS3Keys,
          translations: json(data.translations),
          isPublished: true,
        },
        update: {
          rungOrder: data.rungOrder,
          tier: data.tier,
          category: data.category,
          icon: data.icon,
          accentColor: data.accentColor,
          imageS3Keys: data.imageS3Keys,
          translations: json(data.translations),
          isPublished: true,
        },
        select: { id: true, slug: true, rungOrder: true },
      });

      await tx.systemTask.update({
        where: { id: task.id },
        data: { status: "COMPLETED" },
      });

      return upserted;
    });

    console.log(
      `✅ [LadderHandler] Saved Rung ${pack.rungOrder} (${pack.slug}) across all languages.`,
    );
    return NextResponse.json({ ok: true, packId: pack.id, slug: pack.slug });
  } catch (error: any) {
    console.error("❌ [LadderHandler] Error saving ladder pack:", error);
    await prisma.systemTask
      .update({
        where: { id: task.id },
        data: { status: "FAILED" },
      })
      .catch(() => {});

    return NextResponse.json(
      { error: error?.message || "Failed to save ladder pack" },
      { status: 500 },
    );
  }
}