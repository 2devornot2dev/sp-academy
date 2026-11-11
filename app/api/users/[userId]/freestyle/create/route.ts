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
      mode = "RANDOM",
      level = "EASY",
      persona = "FRIENDLY",
      topic,
      voiceGender = "female",
      nativeLanguage = "en-US",
      targetLanguage = "fr-FR",
    } = body;

    // ------------------------------------------------------------------------
    // 1. RESOLVE USER'S ACTIVE MILESTONE INDEX & SPOON LESSON CHUNKS
    // ------------------------------------------------------------------------
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
        foundationBossStages: {
          orderBy: { milestoneIndex: "asc" },
          select: {
            milestoneIndex: true,
            passed: true,
          },
        },
      },
    });

    // Determine current milestoneIndex:
    // Find the first unpassed boss stage, or derive from first incomplete spoon lesson
    let currentMilestoneIndex = 1;
    if (activeCourse) {
      const firstIncompleteLesson = activeCourse.lessons.find(
        (l) => !l.completedAt,
      );
      const passedMilestoneSet = new Set(
        activeCourse.foundationBossStages
          .filter((b) => b.passed)
          .map((b) => b.milestoneIndex),
      );

      if (firstIncompleteLesson) {
        currentMilestoneIndex = Math.ceil(firstIncompleteLesson.orderIndex / 3);
      } else if (activeCourse.lessons.length > 0) {
        const maxMilestone = Math.ceil(activeCourse.lessons.length / 3);
        // Find lowest milestone whose boss isn't passed yet
        for (let m = 1; m <= maxMilestone; m++) {
          if (!passedMilestoneSet.has(m)) {
            currentMilestoneIndex = m;
            break;
          }
          currentMilestoneIndex = m;
        }
      }
    }

    // Extract current milestone's 3 Spoon lessons (for FOCUSED mode)
    const startOrder = (currentMilestoneIndex - 1) * 3 + 1;
    const endOrder = currentMilestoneIndex * 3;
    const milestoneLessons =
      activeCourse?.lessons.filter(
        (l) => l.orderIndex >= startOrder && l.orderIndex <= endOrder,
      ) ?? [];

    const spoonChunks: string[] = [];
    const spoonThemes: string[] = [];

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

    const tutorName = voiceGender === "female" ? "Sophie" : "Antoine";
    const targetVoiceId = `${targetLanguage}-${
      voiceGender === "female" ? "girl-01" : "boy-01"
    }`;
    const personaDesc =
      PERSONA_STYLES[String(persona).toUpperCase()] || PERSONA_STYLES.FRIENDLY;

    const defaultChunks =
      mode === "FOCUSED" && spoonChunks.length >= 2
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

    try {
      const focusedContext =
        mode === "FOCUSED" && spoonChunks.length > 0
          ? `\n- FOCUSED MODE: The learner is practicing Milestone ${currentMilestoneIndex} Spoon lessons (${spoonThemes.join(", ")}). You MUST pick 3 'requiredChunks' directly from this list: ${JSON.stringify(spoonChunks.slice(0, 10))} and design the scenario around them!`
          : "";

      const completion = await groq.chat.completions.create({
        model: "qwen/qwen3.8-27b",
        temperature: 0.6,
        max_tokens: 600,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Generate a 3-minute language roleplay config. Return ONLY JSON:
{
  "topic": "Short scenario title in ${nativeLanguage} (3-6 words)",
  "persona": "1-sentence role for ${tutorName} (${personaDesc}) in ${nativeLanguage}",
  "requiredChunks": ["chunk1", "chunk2", "chunk3"],
  "openingLine": "1-sentence goal for ${firstName} in ${nativeLanguage}",
  "aiOpeningTarget": "First spoken line by ${tutorName} in ${targetLanguage}",
  "starterHintTarget": "Example first reply in ${targetLanguage} using requiredChunks[0]",
  "starterHintNative": "Translation of starterHintTarget in ${nativeLanguage}"
}
Rules:
- Mode: ${mode} (SPECIFIC=use custom topic "${topic || "Introduction & Small Talk"}"; RANDOM=invent a specific cafe/travel/shop scenario; ARGUMENTATIVE=friendly debate; FOCUSED=practice current Spoon lesson phrases).${focusedContext}
- Level: ${level} (ZERO=2-3 word survival chunks; EASY=short A1 phrases; MEDIUM=B1 conversational chunks; FLUENT=C1 idioms).
- requiredChunks MUST be 3 short phrases in ${targetLanguage} only (no proper names).`,
          },
          {
            role: "user",
            content: JSON.stringify({
              mode,
              level,
              persona,
              topic: topic || null,
              spoonThemes: mode === "FOCUSED" ? spoonThemes : undefined,
              spoonChunks:
                mode === "FOCUSED" ? spoonChunks.slice(0, 10) : undefined,
              nativeLanguage,
              targetLanguage,
            }),
          },
        ],
      });

      const raw = (completion.choices[0]?.message?.content || "{}")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();
      const parsed = JSON.parse(raw);

      if (parsed.topic && Array.isArray(parsed.requiredChunks)) {
        generated = { ...generated, ...parsed };
      }
    } catch (e) {
      console.warn("[freestyle/create] Groq fallback used:", e);
    }

    const session = await prisma.freestyleSession.create({
      data: {
        user: { connect: { id: userId } },
        mode,
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
  } catch (error) {
    console.error("Create Session Error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}
