// app/api/freestyle/review/[sessionId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";
import { getPresignedImageUrl } from "@/lib/aws/services/s3-presigned-url";
import { extractTrickyWords } from "@/lib/freestyle/grades";

interface Params {
  params: Promise<{
    sessionId: string;
  }>;
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

export async function GET(_req: Request, { params }: Params) {
  const { sessionId } = await params;
  try {
    const user = await requireUser();

    const session = await prisma.freestyleSession.findUnique({
      where: { id: sessionId },
      include: { review: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!session.review || session.review.lambdaStatus !== "SUCCESS") {
      return NextResponse.json({ error: "Review not ready" }, { status: 404 });
    }

    const rawFeedback = (session.review.overallFeedback as any) || {};
    const rawOutro = rawFeedback.spriteOutro || null;

    let spriteOutro = null;
    if (rawOutro) {
      const [nativeAudioUrl, targetAudioUrl] = await Promise.all([
        safePresign(rawOutro.nativeAudioKey),
        safePresign(rawOutro.targetAudioKey),
      ]);
      spriteOutro = {
        ...rawOutro,
        nativeAudioUrl,
        targetAudioUrl,
      };
    }

    return NextResponse.json({
      session: {
        id: session.id,
        nativeLanguage: session.nativeLanguage,
        targetLanguage: session.targetLanguage,
        level: session.level,
        mode: session.mode,
        topic: session.topic,
        duration: session.duration,
      },
      review: {
        ...session.review,
        spriteOutro,
      },
      trickyWords: extractTrickyWords(session.messages),
    });
  } catch (error) {
    console.error("Fetch review error:", error);
    return NextResponse.json(
      { error: "Failed to fetch review" },
      { status: 500 },
    );
  }
}