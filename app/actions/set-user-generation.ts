// app/actions/set-user-generation.ts
"use server";

import {
  setUserGeneration as saveToRedis,
  type UserGenerationData,
} from "@/lib/upstash";

export async function setUserGeneration(
  data: UserGenerationData,
): Promise<string> {
  return saveToRedis(data);
}