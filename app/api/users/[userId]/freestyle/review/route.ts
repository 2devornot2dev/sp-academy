// app/api/users/[userId]/freestyle/review/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lambda, createCommand } from "@/lib/aws/lambda";

const BASE_WEBHOOK = `${
  process.env.NEXT_PUBLIC_APP_URL2 ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://spoonacademy.com"
}/api/webhooks/system-tasks`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const body = await request.json();

    const {
      sessionId,
      messages,
      mistakes = [],
      duration = 0,
      mode,
      topic,
      level,
      nativeLanguage,
      targetLanguage,
    } = body;

    if (!sessionId || !messages) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 1. Format the full transcript for easy reading in the DB
    const fullTranscript = messages
      .map((m: any) => `[${(m.role || "user").toUpperCase()}]: ${m.text || ""}`)
      .join("\n");

    // 2. Separate the mistakes into 3 distinct buckets for the Lambda
    const grammarAndGenderMistakes = mistakes.filter(
      (m: any) =>
        m.category?.toUpperCase() === "GRAMMAR" ||
        m.category?.toUpperCase() === "GENDER",
    );
    const vocabMistakes = mistakes.filter(
      (m: any) => m.category?.toUpperCase() === "VOCABULARY",
    );
    const pronunciationMistakes = mistakes.filter(
      (m: any) => m.category?.toUpperCase() === "PRONUNCIATION",
    );

    // 3. Update the session in Prisma
    const updatedSession = await prisma.freestyleSession.update({
      where: { id: sessionId },
      data: {
        status: "REVIEW_PENDING",
        duration,
        fullTranscript,
        messages,
      },
    });

    const resolvedMode = mode || updatedSession.mode || "SPECIFIC";
    const resolvedTopic = topic || updatedSession.topic || "Conversation";
    const resolvedNative =
      nativeLanguage || updatedSession.nativeLanguage || "en-US";
    const resolvedTarget =
      targetLanguage || updatedSession.targetLanguage || "fr-FR";
    const resolvedLevel = level || "EASY";

    // 4. Create the SystemTask with userId in metadata
    const task = await prisma.systemTask.create({
      data: {
        type: "FREESTYLE_REVIEW",
        metadata: {
          userId,
          sessionId,
          mode: resolvedMode,
          topic: resolvedTopic,
          level: resolvedLevel,
          nativeLanguage: resolvedNative,
          targetLanguage: resolvedTarget,
        },
      },
    });

    const webhookUrl = `${BASE_WEBHOOK}/${task.id}`;

    // 5. Payload for Lambda
    const payload = {
      taskId: task.id,
      userId,
      sessionId,
      webhookUrl,
      mode: resolvedMode,
      topic: resolvedTopic,
      level: resolvedLevel,
      nativeLanguage: resolvedNative,
      targetLanguage: resolvedTarget,
      duration,
      fullTranscript,
      messages,
      separatedMistakes: {
        grammarAndGender: grammarAndGenderMistakes,
        vocabulary: vocabMistakes,
        pronunciation: pronunciationMistakes,
      },
      mistakes,
    };

    const command = createCommand({
      functionName: "spoon-freestyle-review",
      payload,
      invocationType: "Event",
    });

    // 6. Trigger AWS Lambda function
    await lambda.send(command);

    return NextResponse.json({
      success: true,
      taskId: task.id,
      message: "Session saved and Lambda review triggered.",
    });
  } catch (error) {
    console.error("Review Route Error:", error);
    return NextResponse.json(
      { error: "Failed to process review" },
      { status: 500 },
    );
  }
}