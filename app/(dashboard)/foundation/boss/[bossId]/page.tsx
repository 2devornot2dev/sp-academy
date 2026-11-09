// app/(dashboard)/foundation/boss/[bossId]/page.tsx
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { getBossData } from "../../actions/get-boss-data";
import BossFoundationClient from "@/components/foundation/boss/boss-foundation-client";
import { startNextMilestoneDaisyChain } from "@/lib/foundation/advance-build-chain";

interface Params {
  params: Promise<{ bossId: string }>;
}

export default async function BossIdPage({ params }: Params) {
  const { bossId } = await params;
  const user = await requireUser();

  const bossData = await getBossData(bossId, user.id);
  if (!bossData) notFound();

  const courseId =
    (bossData as any).foundationCourseId || (bossData as any).course?.id;
  const milestoneIndex = (bossData as any).milestoneIndex ?? 1;

  // Fire-and-forget: As soon as the user enters Boss M, start the next milestone's daisy-chain
  // (Spoon 3M+1 -> Spoon 3M+2 -> Spoon 3M+3 -> Boss M+1) in the background!
  if (courseId) {
    void startNextMilestoneDaisyChain({
      courseId,
      currentMilestoneIndex: milestoneIndex,
    });
  }

  return <BossFoundationClient session={bossData} />;
}