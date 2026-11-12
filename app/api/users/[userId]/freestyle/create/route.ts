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

function extractJsonObject(raw: string): any {
  const withoutThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const match = withoutThink.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model output");
  return JSON.parse(match[0]);
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { userId } = await params;

    if (user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const firstName = user.firstName || "Learner";
    const userAvatarUrl =
      (user as any).avatarUrl || (user as any).image || null;

    const body = await request.json();

    // ========================================================================
    // BRANCH A: DYNAMIC TURN-BY-TURN COACHING HINT (`action === "HINT"`)
    // Called automatically whenever the AI partner finishes speaking a turn!
    // ========================================================================
    if (body.action === "HINT") {
      const {
        aiText = "",
        aiTranslation = "",
        nextTargetChunk = "",
        level = "ZERO",
        nativeLanguage = "en-US",
        targetLanguage = "fr-FR",
      } = body;

      try {
        const completion = await groq.chat.completions.create({
          model: "qwen/qwen3.8-27b",
          temperature: 0.4,
          max_tokens: 900,
          reasoning_effort: "low",
          messages: [
            {
              role: "system",
              content: `You are a live language coach helping ${firstName} (level: ${level}) reply to their conversation partner in ${targetLanguage}.
The AI partner just said: "${aiText}" (${aiTranslation || ""}).
${
  nextTargetChunk
    ? `Next Target Phrase to weave in if possible: "${nextTargetChunk}".`
    : ""
}

Output ONLY a JSON object with 3 keys:
{
  "coachingTip": "1 short, punchy nudge in ${nativeLanguage} guiding ${firstName} on what to say next without giving away the full foreign sentence (max 14 words)",
  "starter": "A natural 1-sentence reply in ${targetLanguage} that directly answers "${aiText}"${
                nextTargetChunk ? ` and uses "${nextTargetChunk}"` : ""
              } (keep it 3-6 words if level is ZERO/EASY)",
  "translation": "Exact translation of 'starter' in ${nativeLanguage}"
}`,
            },
            {
              role: "user",
              content: `Generate live reply coaching for: "${aiText}"`,
            },
          ],
        });

        const raw = completion.choices[0]?.message?.content || "{}";
        const parsed = extractJsonObject(raw);

        return NextResponse.json({
          coachingTip:
            parsed.coachingTip ||
            (nextTargetChunk
              ? `Reply to your partner and try using "${nextTargetChunk}"!`
              : "Answer your partner's question naturally!"),
          starter: parsed.starter || nextTargetChunk || "Oui, bien sûr !",
          translation: parsed.translation || "Yes, of course!",
        });
      } catch (e) {
        return NextResponse.json({
          coachingTip: nextTargetChunk
            ? `Answer the question and try using "${nextTargetChunk}"!`
            : "Answer your partner's question!",
          starter: nextTargetChunk || "Oui, c'est vrai !",
          translation: "Yes, that's true!",
        });
      }
    }

    // ========================================================================
    // BRANCH B: CREATE NEW 3-MIN FREESTYLE SESSION
    // ========================================================================
    const {
      mode = "FOCUSED",
      level = "EASY",
      persona = "FRIENDLY",
      topic,
      voiceGender = "female",
      nativeLanguage = "en-US",
      targetLanguage = "fr-FR",
    } = body;

    // 1. RESOLVE USER'S ACTIVE MILESTONE & FULL SPEAKABLE SPOON SENTENCES
    let currentMilestoneIndex = 1;
    const speakablePhrases: string[] = [];
    const spoonThemes: string[] = [];

    try {
      const activeCourse = await prisma.foundationCourse.findFirst({
        where: { userId, isHardMode: false },
        orderBy: { createdAt: "asc" },
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
              grammarContent: true,
              visualContent: true,
              freestyle: true,
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

        const startOrder = (currentMilestoneIndex - 1) * 3 + 1;
        const endOrder = currentMilestoneIndex * 3;
        const milestoneLessons = activeCourse.lessons.filter(
          (l) => l.orderIndex >= startOrder && l.orderIndex <= endOrder,
        );

        const addPhrase = (raw?: string | null) => {
          if (!raw || typeof raw !== "string") return;
          const clean = raw
            .split("=")[0]
            .replace(/^[«"“]+|[»"”]+$/g, "")
            .trim();
          // Prefer multi-word speakable phrases (2 to 7 words) over 1-word fragments!
          const wordCount = clean.split(/\s+/).filter(Boolean).length;
          if (
            wordCount >= 2 &&
            wordCount <= 7 &&
            !speakablePhrases.some(
              (p) => p.toLowerCase() === clean.toLowerCase(),
            )
          ) {
            speakablePhrases.push(clean);
          }
        };

        for (const l of milestoneLessons) {
          if (l.title) spoonThemes.push(l.title);
          const gc = (l.grammarContent as any) || {};
          const vc = (l.visualContent as any) || {};
          const fs = (l.freestyle as any) || {};
          const lh = (l.lessonHandoff as any) || {};

          // Priority 1: Full target sentences & valid NPC replies
          addPhrase(gc.targetSentence);
          addPhrase(lh.targetSentence);
          if (Array.isArray(vc?.constraint?.validReplies)) {
            vc.constraint.validReplies.forEach(addPhrase);
          }
          // Priority 2: Freestyle requiredChunks & multi-word taughtChunks
          if (Array.isArray(fs?.requiredChunks)) {
            fs.requiredChunks.forEach(addPhrase);
          }
          if (Array.isArray(lh?.taughtChunks)) {
            lh.taughtChunks.forEach(addPhrase);
          }
        }
      }
    } catch (e) {
      console.warn("[freestyle/create] Could not resolve milestone phrases:", e);
    }

    const tutorName = voiceGender === "female" ? "Sophie" : "Antoine";
    const targetVoiceId = `${targetLanguage}-${
      voiceGender === "female" ? "girl-01" : "boy-01"
    }`;
    const personaDesc =
      PERSONA_STYLES[String(persona).toUpperCase()] || PERSONA_STYLES.FRIENDLY;

    const defaultChunks =
      speakablePhrases.length >= 3
        ? speakablePhrases.slice(0, 3)
        : targetLanguage.startsWith("es")
          ? [
              "Me gustaría un café",
              "Trabajo todos los días",
              "Muchas gracias por todo",
            ]
          : [
              "Je voudrais un café",
              "Je travaille chaque jour",
              "C'est une bonne idée",
            ];

    let generated = {
      topic:
        mode === "FOCUSED" && spoonThemes.length > 0
          ? `Milestone ${currentMilestoneIndex}: ${spoonThemes[0]}`
          : topic || "Everyday Conversation",
      persona: `${tutorName}, a ${personaDesc} native speaker. Actively guide ${firstName} by asking questions that naturally prompt them to say their 3 target phrases (${defaultChunks.join(
        " / ",
      )}) one by one! Do NOT ask "Are you ready to start?"—jump straight into the scenario!`,
      requiredChunks: defaultChunks,
      chunkTranslations: [] as string[],
      openingLine: `Chat with ${tutorName} and work your 3 target phrases into the conversation!`,
      aiOpeningTarget: targetLanguage.startsWith("es")
        ? `¡Hola ${firstName}! ¿Qué te gustaría hacer hoy?`
        : `Bonjour ${firstName} ! Dis-moi, comment se passe ta journée ?`,
      starterHintTarget: defaultChunks[0],
      starterHintNative: "Start by using your first target phrase!",
    };

    // 2. GENERATE ROLEPLAY CONFIG WITH QWEN (qwen/qwen3.8-27b)
    try {
      const focusedContext =
        mode === "FOCUSED" && speakablePhrases.length > 0
          ? `\n- FOCUSED MODE: The learner is practicing Milestone ${currentMilestoneIndex} (${spoonThemes.join(
              ", ",
            )}). Use or lightly adapt 3 complete, speakable 2-to-5 word phrases from this lesson list: ${JSON.stringify(
              speakablePhrases.slice(0, 8),
            )}.`
          : "";

      const completion = await groq.chat.completions.create({
        model: "qwen/qwen3.8-27b",
        temperature: 0.5,
        max_tokens: 10000,
        reasoning_effort: "low",
        messages: [
          {
            role: "system",
            content: `Generate a 3-minute guided language roleplay config. Output ONLY a valid JSON object:
{
  "topic": "Short scenario title in ${nativeLanguage} (3-6 words)",
  "persona": "1-sentence role for ${tutorName} (${personaDesc}) in ${nativeLanguage}",
  "requiredChunks": ["2-to-5 word speakable phrase 1 in ${targetLanguage}", "2-to-5 word phrase 2", "2-to-5 word phrase 3"],
  "chunkTranslations": ["English meaning of phrase 1", "English meaning of phrase 2", "English meaning of phrase 3"],
  "openingLine": "1-sentence coaching tip for ${firstName} in ${nativeLanguage}",
  "aiOpeningTarget": "First in-character question spoken by ${tutorName} in ${targetLanguage} that naturally sets up ${firstName} to reply using requiredChunks[0] (NEVER ask 'Are you ready?')",
  "starterHintTarget": "Complete example reply in ${targetLanguage} that answers aiOpeningTarget using requiredChunks[0]",
  "starterHintNative": "Translation of starterHintTarget in ${nativeLanguage}"
}
CRITICAL RULES:
- NEVER put single isolated 1-word fragments in 'requiredChunks'! Every item in 'requiredChunks' MUST be a complete, natural 2-to-5 word phrase or mini-sentence that a learner can say out loud.
- Mode: ${mode} (SPECIFIC=use "${topic || "Introductions & Small Talk"}"; RANDOM=fun real-world cafe/travel/shop scenario; ARGUMENTATIVE=friendly debate; FOCUSED=practice current Spoon lesson sentences).${focusedContext}
- Level: ${level} (ZERO=simple 2-4 word survival sentences; EASY=3-5 word A1 sentences; MEDIUM=B1 expressions; FLUENT=C1 idioms).`,
          },
          {
            role: "user",
            content: JSON.stringify({
              mode,
              level,
              persona,
              topic: topic || null,
              speakablePhrases:
                mode === "FOCUSED" ? speakablePhrases.slice(0, 8) : undefined,
              nativeLanguage,
              targetLanguage,
            }),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const parsed = extractJsonObject(raw);

      if (parsed.topic && Array.isArray(parsed.requiredChunks)) {
        const cleanChunks = parsed.requiredChunks.slice(0, 3);
        generated = {
          topic: parsed.topic,
          persona: `${parsed.persona || generated.persona}. IMPORTANT: Do NOT ask "Are you ready?" or "Shall we start?". Stay in character and ask questions that help ${firstName} use their 3 target phrases: ${cleanChunks.join(
            ", ",
          )}.`,
          requiredChunks: cleanChunks,
          chunkTranslations: Array.isArray(parsed.chunkTranslations)
            ? parsed.chunkTranslations.slice(0, 3)
            : [],
          openingLine: parsed.openingLine || generated.openingLine,
          aiOpeningTarget: parsed.aiOpeningTarget || generated.aiOpeningTarget,
          starterHintTarget:
            parsed.starterHintTarget || generated.starterHintTarget,
          starterHintNative:
            parsed.starterHintNative || generated.starterHintNative,
        };
      }
    } catch (e) {
      console.warn("[freestyle/create] Qwen fallback used:", e);
    }

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
      userAvatarUrl,
      targetVoiceId,
      freestyleData: {
        mode,
        level,
        topic: generated.topic,
        persona: generated.persona,
        requiredChunks: generated.requiredChunks,
        chunkTranslations: generated.chunkTranslations,
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