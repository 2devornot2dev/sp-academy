// app/api/users/[userId]/freestyle/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";
import { groq } from "@/lib/groq";

const PERSONA_STYLES: Record<string, string> = {
  FRIENDLY: "warm, patient, and encouraging",
  COACH: "energetic, direct, pushes the learner and corrects mistakes",
  LOCAL: "casual street-smart local using natural everyday phrasing",
  PRO: "polished, formal, and business-ready",
};

interface Params {
  params: Promise<{
    userId: string;
  }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { userId } = await params;

    if (user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const firstName = user.firstName || "Learner";

    const body = await request.json();
    const {
      mode = "FOCUSED",
      level = "EASY",
      persona = "FRIENDLY",
      topic,
      voiceGender = "female",
      nativeLanguage = "en-US",
      targetLanguage = "fr-FR",
    } = body;

    // ------------------------------------------------------------------------
    // 1. RESOLVE USER'S ACTIVE MILESTONE & SPOON LESSON CHUNKS
    // ------------------------------------------------------------------------
    let currentMilestoneIndex = 1;
    const spoonChunks: string[] = [];
    const spoonThemes: string[] = [];

    try {
      const activeCourse = await prisma.foundationCourse.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          lessons: {
            orderBy: { orderIndex: "asc" },
            select: {
              id: true,
              orderIndex: true,
              title: true,
              completedAt: true,
              lessonHandoff: true,
            },
          },
        },
      });

      if (activeCourse && activeCourse.lessons.length > 0) {
        const firstIncompleteLesson = activeCourse.lessons.find(
          (l) => !l.completedAt,
        );

        if (firstIncompleteLesson) {
          currentMilestoneIndex = Math.ceil(
            firstIncompleteLesson.orderIndex / 3,
          );
        } else {
          currentMilestoneIndex = Math.ceil(activeCourse.lessons.length / 3);
        }

        // Grab the 3 Spoons for this active milestone
        const startOrder = (currentMilestoneIndex - 1) * 3 + 1;
        const endOrder = currentMilestoneIndex * 3;
        const milestoneLessons = activeCourse.lessons.filter(
          (l) => l.orderIndex >= startOrder && l.orderIndex <= endOrder,
        );

        for (const l of milestoneLessons) {
          if (l.title) spoonThemes.push(l.title);
          const lh = (l.lessonHandoff as any) || {};
          const rawChunks = [
            ...(Array.isArray(lh.taughtChunks) ? lh.taughtChunks : []),
            ...(Array.isArray(lh.chunks) ? lh.chunks : []),
          ];
          for (const c of rawChunks) {
            if (typeof c === "string" && c.trim()) {
              const clean = c.split("=")[0].trim();
              if (clean && !spoonChunks.includes(clean)) {
                spoonChunks.push(clean);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[freestyle/create] Could not resolve milestone chunks:", e);
    }

    const tutorName = voiceGender === "female" ? "Sophie" : "Antoine";
    const targetVoiceId = `${targetLanguage}-${
      voiceGender === "female" ? "girl-01" : "boy-01"
    }`;
    const personaDesc =
      PERSONA_STYLES[String(persona).toUpperCase()] || PERSONA_STYLES.FRIENDLY;

    const defaultChunks =
      spoonChunks.length >= 2
        ? spoonChunks.slice(0, 3)
        : targetLanguage.startsWith("es")
          ? ["Por favor", "Me gustaría", "Gracias"]
          : ["Bonjour", "Je voudrais", "S'il vous plaît"];

    let generated = {
      topic:
        mode === "FOCUSED" && spoonThemes.length > 0
          ? `Milestone ${currentMilestoneIndex}: ${spoonThemes[0]}`
          : topic || "Everyday Conversation",
      persona: `${tutorName}, a ${personaDesc} native speaker`,
      requiredChunks: defaultChunks,
      openingLine: `${firstName}, chat naturally with ${tutorName} and use your target phrases.`,
      aiOpeningTarget: targetLanguage.startsWith("es")
        ? `¡Hola ${firstName}! ¿Cómo estás hoy?`
        : `Bonjour ${firstName} ! Comment ça va aujourd'hui ?`,
      starterHintTarget: targetLanguage.startsWith("es")
        ? "¡Hola! Me gustaría practicar español, por favor."
        : "Bonjour ! Je voudrais pratiquer mon français, s'il vous plaît.",
      starterHintNative: "Hello! I'd like to practice, please.",
    };

    // ------------------------------------------------------------------------
    // 2. GROQ CONFIG GENERATION (Fast & Reliable Model, No Token Exhaustion)
    // ------------------------------------------------------------------------
    try {
      const focusedContext =
        mode === "FOCUSED" && spoonChunks.length > 0
          ? `\n- FOCUSED MODE: Pick 3 'requiredChunks' strictly from this list: ${JSON.stringify(
              spoonChunks.slice(0, 10),
            )}.`
          : "";

      // Use llama-3.3-70b-versatile or qwen without reasoning exhaustion!
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        max_tokens: 5000,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You generate a 3-minute language conversation setup.
Return ONLY valid JSON matching this schema:
{
  "topic": "Short scenario title in ${nativeLanguage} (3-6 words)",
  "persona": "1-sentence role for ${tutorName} (${personaDesc}) in ${nativeLanguage}",
  "requiredChunks": ["phrase1", "phrase2", "phrase3"],
  "openingLine": "1-sentence goal for ${firstName} in ${nativeLanguage}",
  "aiOpeningTarget": "First spoken line by ${tutorName} in ${targetLanguage}",
  "starterHintTarget": "Example first reply in ${targetLanguage}",
  "starterHintNative": "Translation of starterHintTarget in ${nativeLanguage}"
}
Rules:
- requiredChunks MUST be 3 short phrases in ${targetLanguage}.${focusedContext}`,
          },
          {
            role: "user",
            content: JSON.stringify({
              mode,
              level,
              persona,
              topic: topic || null,
              nativeLanguage,
              targetLanguage,
            }),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "{}";
      const parsed = JSON.parse(raw);

      if (parsed.topic && Array.isArray(parsed.requiredChunks)) {
        generated = {
          topic: parsed.topic,
          persona: parsed.persona || generated.persona,
          requiredChunks: parsed.requiredChunks.slice(0, 3),
          openingLine: parsed.openingLine || generated.openingLine,
          aiOpeningTarget: parsed.aiOpeningTarget || generated.aiOpeningTarget,
          starterHintTarget:
            parsed.starterHintTarget || generated.starterHintTarget,
          starterHintNative:
            parsed.starterHintNative || generated.starterHintNative,
        };
      }
    } catch (e) {
      console.warn("[freestyle/create] Groq fallback used:", e);
    }

    // ------------------------------------------------------------------------
    // 3. CREATE PRISMA SESSION
    // ------------------------------------------------------------------------
    const session = await prisma.freestyleSession.create({
      data: {
        userId,
        mode: String(mode),
        topic: generated.topic,
        nativeLanguage,
        targetLanguage,
        status: "IN_PROGRESS",
        duration: 0,
        milestoneIndex: currentMilestoneIndex,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      milestoneIndex: currentMilestoneIndex,
      targetVoiceId,
      freestyleData: {
        mode,
        level,
        topic: generated.topic,
        persona: generated.persona,
        requiredChunks: generated.requiredChunks,
        openingLine: generated.openingLine,
        aiOpeningTarget: generated.aiOpeningTarget,
        starterHintTarget: generated.starterHintTarget,
        starterHintNative: generated.starterHintNative,
      },
    });
  } catch (error: any) {
    console.error("Create Session Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create session" },
      { status: 500 },
    );
  }
}