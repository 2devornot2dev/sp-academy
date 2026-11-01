// lib/system-tasks/handlers/handle-book-generation.ts
import { Prisma, SystemTask } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { SpoonBookWebhookSchema } from "@/lib/schema/book-schema";

export async function handleBookGeneration(task: SystemTask, body: unknown) {
  console.log(
    `[book-generation] received webhook for task ${task.id}`
  );

  // 1. Validate incoming payload from spoon-book-builder
  const parsed = SpoonBookWebhookSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      `[book-generation] invalid payload for task ${task.id}:`,
      JSON.stringify(parsed.error.issues, null, 2)
    );
    return NextResponse.json(
      { message: "Invalid SpoonBook payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 2. Upsert SpoonBook by slug (idempotent so re-baking a book updates it cleanly)
  const book = await prisma.spoonBook.upsert({
    where: { slug: data.slug },
    create: {
      slug: data.slug,
      characterName: data.characterName,
      characterAvatarUrl: data.characterAvatarUrl,
      levelBand: data.levelBand,
      genre: data.genre,
      coverImageS3Key: data.coverImageS3Key,
      introVideoS3Key: data.introVideoS3Key ?? null,
      pageImageS3Keys: data.pageImageS3Keys,
      translations: data.translations as unknown as Prisma.InputJsonValue,
      isPublished: true,
    },
    update: {
      characterName: data.characterName,
      characterAvatarUrl: data.characterAvatarUrl,
      levelBand: data.levelBand,
      genre: data.genre,
      coverImageS3Key: data.coverImageS3Key,
      introVideoS3Key: data.introVideoS3Key ?? null,
      pageImageS3Keys: data.pageImageS3Keys,
      translations: data.translations as unknown as Prisma.InputJsonValue,
      isPublished: true,
    },
    select: { id: true, slug: true },
  });

  // 3. Mark SystemTask COMPLETED
  await prisma.systemTask.update({
    where: { id: task.id },
    data: { status: "COMPLETED" },
  });

  console.log(
    `[book-generation] ✅ SpoonBook '${book.slug}' (id=${book.id}) saved & task ${task.id} completed!`
  );

  return NextResponse.json({
    ok: true,
    bookId: book.id,
    slug: book.slug,
  });
}