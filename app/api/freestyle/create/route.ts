// app/api/freestyle/create/route.ts
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

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const userId = user.id;
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

    const tutorName = voiceGender === "female" ? "Sophie" : "Antoine";
    const targetVoiceId = `${targetLanguage}-${
      voiceGender === "female" ? "girl-01" : "boy-01"
    }`;
    const personaDesc =
      PERSONA_STYLES[String(persona).toUpperCase()] || PERSONA_STYLES.FRIENDLY;

    let generated = {
      topic: topic || "Everyday Conversation",
      persona: `${tutorName}, a ${personaDesc} native speaker`,
      requiredChunks: targetLanguage.startsWith("es")
        ? ["Por favor", "Me gustaría", "Gracias"]
        : ["Bonjour", "Je voudrais", "S'il vous plaît"],
      openingLine: `${firstName}, chat naturally with ${tutorName} and use your target phrases.`,
      aiOpeningTarget: targetLanguage.startsWith("es")
        ? `¡Hola ${firstName}! ¿Cómo estás hoy?`
        : `Bonjour ${firstName} ! Comment ça va aujourd'hui ?`,
      starterHintTarget: targetLanguage.startsWith("es")
        ? "¡Hola! Me gustaría practicar español, por favor."
        : "Bonjour ! Je voudrais pratiquer mon français, s'il vous plaît.",
    };

    try {
      const completion = await groq.chat.completions.create({
        model: "qwen/qwen3.8-27b",
        temperature: 0.6,
        max_tokens: 600,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Generate a 5-minute language roleplay config. Return ONLY JSON:
{
  "topic": "Short scenario title in ${nativeLanguage} (3-6 words)",
  "persona": "1-sentence role for ${tutorName} (${personaDesc}) in ${nativeLanguage}",
  "requiredChunks": ["chunk1", "chunk2", "chunk3"],
  "openingLine": "1-sentence goal for ${firstName} in ${nativeLanguage}",
  "aiOpeningTarget": "First spoken line by ${tutorName} in ${targetLanguage}",
  "starterHintTarget": "Example first reply in ${targetLanguage} using requiredChunks[0]"
}
Rules:
- Mode: ${mode} (INTRODUCTION=icebreaker; RANDOM=invent a specific cafe/travel/shop scenario; SPECIFIC=use "${topic || ""}"; ARGUMENTATIVE=friendly debate).
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
      },
    });

    return NextResponse.json({
      sessionId: session.id,
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