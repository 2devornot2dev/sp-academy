// api/webhooks/system-tasks/[taskId]/route.ts

import { prisma } from "@/lib/prisma";
import { handleBossGeneration } from "@/lib/system-tasks/handlers/handle-boss-generation";
import { handleConversationImages } from "@/lib/system-tasks/handlers/handle-conversation-images";
import { handleGameSchema } from "@/lib/system-tasks/handlers/handle-game-schema";
import { handleGameVariation } from "@/lib/system-tasks/handlers/handle-game-variation";
import { handleSpeechAnalysisTask } from "@/lib/system-tasks/handlers/handle-speech-analysis-task";
import { handleSpoonGeneration } from "@/lib/system-tasks/handlers/handle-spoon-generation";
import { handleSpriteNotificationGeneration } from "@/lib/system-tasks/handlers/handle-sprite-notification";
import { handleVocabBridgeGeneration } from "@/lib/system-tasks/handlers/handle-vocab-bridge";
import { handleFreestyleReview } from "@/lib/system-tasks/handlers/handler-freestyle-review";
import { handleSpriteExerciseGeneration } from "@/lib/system-tasks/handlers/handle-sprite-exercise";
import { handleBookGeneration } from "@/lib/system-tasks/handlers/handle-book-generation";
import { SystemTaskType } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  isLambdaErrorPayload,
  handleLambdaError,
} from "@/lib/system-tasks/handlers/handle-lambda-error";

interface Params {
  params: Promise<{
    systemTaskId: string;
  }>;
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { systemTaskId } = await params;
    const apiKey = process.env.WEBHOOK_SECRET;

    // 1. Authenticate webhook secret
    const authHeader = req.headers.get("x-webhook-secret");
    if (!apiKey || apiKey !== authHeader) {
      return NextResponse.json({ message: "Access Denied" }, { status: 401 });
    }

    // 2. Lookup SystemTask
    const task = await prisma.systemTask.findUnique({
      where: {
        id: systemTaskId,
      },
    });

    if (!task) {
      return NextResponse.json(
        { message: "Task does not exist" },
        { status: 404 },
      );
    }

    // Parse webhook JSON body
    const body = await req.json();

    if (isLambdaErrorPayload(body)) {
      return handleLambdaError(task, body);
    }

    // 3. Dispatch Task Handler based on SystemTaskType enum
    switch (task.type) {
      case SystemTaskType.SPEECH_PRONUNCIATION_ANALYSIS: {
        return await handleSpeechAnalysisTask(task, body);
      }

      case SystemTaskType.GAME_SCHEMA_GENERATION: {
        return await handleGameSchema(task, body);
      }
      case SystemTaskType.GAME_VARIATION_GENERATION: {
        return await handleGameVariation(task, body);
      }
      case SystemTaskType.CONVERSATION_IMAGE_GENERATION: {
        return await handleConversationImages(task, body);
      }
      case SystemTaskType.FREESTYLE_REVIEW: {
        return await handleFreestyleReview(task, body);
      }
      case SystemTaskType.SPOON_GENERATION: {
        // THIS IS WHERE ARE AT !!!
        return await handleSpoonGeneration(task, body);
      }
      case SystemTaskType.VOCAB_BRIDGE_GENERATION: {
        // ALMOST DONE
        return await handleVocabBridgeGeneration(task, body);
      }

      case SystemTaskType.SPOON_BOSS_GENERATION: {
        return await handleBossGeneration(task, body);
      }

      case SystemTaskType.SPRITE_NOTIFICATION_GENERATION: {
        return await handleSpriteNotificationGeneration(task, body);
      }

      case SystemTaskType.SPRITE_EXERCISE_GENERATION: {
        return await handleSpriteExerciseGeneration(task, body);
      }

      case SystemTaskType.BOOK_GENERATION: {
        return await handleBookGeneration(task, body);
      }

      default:
        return NextResponse.json(
          { message: `Unhandled task type: ${task.type}` },
          { status: 400 },
        );
    }
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
