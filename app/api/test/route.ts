// app/api/test/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const nodeId = "vox:en-US-boy-01:fr-FR-boy-01:74";

    const node = await prisma.spriteNode.upsert({
      where: { nodeId },
      update: {
        header: "Vocab Bridge 32 🌉",
        nativeBody:
          "I'm giving my voice a quick breather while you crush this speedy Vocab Bridge review! Lock in those words and let's roll straight into Spoon 33!",
        targetBody:
          "Je repose ma voix une seconde pendant que tu enchaînes cette révision express ! Grave ces mots en tête et on décolle vers la suite !",
        nativeAudioUrl:
          "sprites/vox/en-US-boy-01_fr-FR-boy-01/node_74_native.mp3",
        targetAudioUrl:
          "sprites/vox/en-US-boy-01_fr-FR-boy-01/node_74_target.mp3",
        videoUrl: "sprites/vox/videos/vox_en-US-boy-01_fr-FR-boy-01_74.mp4",
        action: "Unlock Bridge 32",
      },
      create: {
        nodeId,
        spriteSlug: "vox",
        nativeLanguage: "en-US",
        targetLanguage: "fr-FR",
        nativeVoiceId: "en-US-boy-01",
        targetVoiceId: "fr-FR-boy-01",
        orderIndex: 74,
        header: "Vocab Bridge 32 🌉",
        nativeBody:
          "I'm giving my voice a quick breather while you crush this speedy Vocab Bridge review! Lock in those words and let's roll straight into Spoon 33!",
        targetBody:
          "Je repose ma voix une seconde pendant que tu enchaînes cette révision express ! Grave ces mots en tête et on décolle vers la suite !",
        nativeAudioUrl:
          "sprites/vox/en-US-boy-01_fr-FR-boy-01/node_74_native.mp3",
        targetAudioUrl:
          "sprites/vox/en-US-boy-01_fr-FR-boy-01/node_74_target.mp3",
        videoUrl: "sprites/vox/videos/vox_en-US-boy-01_fr-FR-boy-01_74.mp4",
        action: "Unlock Bridge 32",
      },
    });

    return NextResponse.json({ ok: true, node }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/test] Prisma error:", err);
    return NextResponse.json(
      {
        ok: false,
        name: err?.name,
        code: err?.code,
        // Full untruncated error message so nothing gets cut off
        error: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}