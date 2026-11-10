// app/api/livekit/token/route.ts
import { NextResponse } from "next/server";
import {
  AccessToken,
  RoomAgentDispatch,
  RoomConfiguration,
} from "livekit-server-sdk";
import { requireUser } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const {
      lessonId,
      nativeLanguage = "en-US",
      targetLanguage = "fr-FR",
      targetVoiceId,
      freestyleData = {},
    } = body;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl =
      process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: "LiveKit environment variables missing" },
        { status: 500 }
      );
    }

    const roomName = `freestyle-${user.id}-${lessonId || Date.now()}`;

    const metadata = JSON.stringify({
      userId: user.id,
      firstName: user.firstName || "Learner",
      nativeLanguage,
      targetLanguage,
      targetVoiceId: targetVoiceId || `${targetLanguage}-boy-01`,
      mode: freestyleData.mode || "SPECIFIC", // <-- Added optional mode
      level: freestyleData.level || "EASY",   // <-- Added optional level
      topic: freestyleData.topic || "Casual conversation",
      persona:
        freestyleData.persona ||
        freestyleData.aiRole ||
        "A friendly native speaker",
      openingLine:
        freestyleData.openingLine ||
        freestyleData.objective ||
        "Practice speaking naturally",
      requiredChunks:
        freestyleData.requiredChunks || freestyleData.targetPhrases || [],
      aiOpeningTarget: freestyleData.aiOpeningTarget || "",
      npcLine: freestyleData.npcLine || "",
      nativeSentence: freestyleData.nativeSentence || "",
    });

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: user.firstName || "Learner",
      ttl: "6m",
      metadata,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    // Explicitly dispatch "my-agent" into this room when the user joins
    at.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: "my-agent",
        }),
      ],
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      wsUrl,
      roomName,
    });
  } catch (err) {
    console.error("[LIVEKIT_TOKEN_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to generate LiveKit token" },
      { status: 500 }
    );
  }
}