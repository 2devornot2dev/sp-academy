// app/api/users/[userId]/freestyle/review/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lambda, createCommand } from "@/lib/aws/lambda";
import { groq } from "@/lib/groq";
import { recordValidFreestyleInRedis } from "@/lib/upstash";

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
      messages = [],
      mistakes = [],
      duration = 0,
      mode,
      topic,
      level,
      nativeLanguage,
      targetLanguage,
    } = body;

    if (!sessionId || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------------
    // 1. LAYER 1: FAST DETERMINISTIC PARTICIPATION CHECK
    // ------------------------------------------------------------------------
    const userMessages = messages.filter(
      (m: any) =>
        m.role === "user" &&
        typeof m.text === "string" &&
        m.text.trim().length > 1,
    );

    const totalUserWords = userMessages.reduce(
      (acc: number, m: any) => acc + m.text.trim().split(/\s+/).length,
      0,
    );

    if (userMessages.length < 3 || totalUserWords < 6) {
      // Delete the incomplete session so it doesn't unlock the Boss or eat a daily slot
      await prisma.freestyleSession
        .delete({ where: { id: sessionId } })
        .catch(() => {});

      return NextResponse.json({
        valid: false,
        reason:
          "Session too short! Speak at least 3–4 back-and-forth turns with your AI partner to count as an official conversation.",
      });
    }

    // Format the full transcript
    const fullTranscript = messages
      .map((m: any) => `[${(m.role || "user").toUpperCase()}]: ${m.text || ""}`)
      .join("\n");

    // ------------------------------------------------------------------------
    // 2. LAYER 2: GROQ AI PARTICIPATION VALIDATION (~300ms)
    // ------------------------------------------------------------------------
    let isValidConversation = true;
    let rejectionReason = "";

    try {
      const validationRes = await groq.chat.completions.create({
        model: "qwen/qwen3.8-27b",
        temperature: 0.1,
        max_tokens: 200,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You validate whether a language learner genuinely participated in a short conversation in ${targetLanguage || "French"} (level: ${level || "ZERO"}).
Be generous to beginners making grammar mistakes or short replies. Status is ONLY invalid if:
- The user only said random gibberish, silence, or repeated a single word 3 times with zero effort to reply, OR
- The user spoke 100% in ${nativeLanguage || "English"} refusing to use ${targetLanguage || "French"} at all.
Return ONLY JSON: { "isValid": boolean, "reason": "1 short friendly sentence explaining why if false, or empty string if true" }`,
          },
          {
            role: "user",
            content: fullTranscript,
          },
        ],
      });

      const raw = (validationRes.choices[0]?.message?.content || "{}")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();
      const parsed = JSON.parse(raw);

      if (parsed.isValid === false) {
        isValidConversation = false;
        rejectionReason =
          parsed.reason ||
          "We couldn't detect enough target-language conversation to generate a report. Give it another try!";
      }
    } catch (e) {
      console.warn("[freestyle/review] Groq validation fallback to true:", e);
    }

    if (!isValidConversation) {
      await prisma.freestyleSession
        .delete({ where: { id: sessionId } })
        .catch(() => {});

      return NextResponse.json({
        valid: false,
        reason: rejectionReason,
      });
    }

    // ------------------------------------------------------------------------
    // 3. VALID SESSION! MARK AS REVIEW_PENDING, SET REDIS TTL & FIRE LAMBDA
    // ------------------------------------------------------------------------
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

    const [updatedSession, redisRecord] = await Promise.all([
      prisma.freestyleSession.update({
        where: { id: sessionId },
        data: {
          status: "REVIEW_PENDING",
          duration,
          fullTranscript,
          messages,
        },
      }),
      recordValidFreestyleInRedis(userId, sessionId),
    ]);

    const resolvedMode = mode || updatedSession.mode || "FOCUSED";
    const resolvedTopic = topic || updatedSession.topic || "Conversation";
    const resolvedNative =
      nativeLanguage || updatedSession.nativeLanguage || "en-US";
    const resolvedTarget =
      targetLanguage || updatedSession.targetLanguage || "fr-FR";
    const resolvedLevel = level || "EASY";

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

    await lambda.send(command);

    return NextResponse.json({
      valid: true,
      success: true,
      sessionId,
      taskId: task.id,
      dailyUsed: redisRecord.dailyUsed,
      cooldownSeconds: redisRecord.cooldownSeconds,
      cooldownUntil: Date.now() + redisRecord.cooldownSeconds * 1000,
    });
  } catch (error) {
    console.error("Review Route Error:", error);
    return NextResponse.json(
      { error: "Failed to process review" },
      { status: 500 },
    );
  }
}