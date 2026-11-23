import FoundationHubPage from "@/components/learning-hub/foundation-hub-page";
import { getLearningPath } from "@/app/actions/get-learning-path";
import { getUserLanguage } from "@/app/actions/get-user-language";
import { requireUser } from "@/lib/auth-guard";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { getUserGeneration } from "@/lib/upstash";
import { PronunciationProvider } from "@/context/pronunciation-context";
import { MatrixProvider } from "@/context/matrix-context";
import { getLadderOverview } from "@/app/actions/ladder-actions";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const setupToken =
    typeof params?.setup === "string" ? params.setup : undefined;

  const [path, userLang, generationData, entitlements] = await Promise.all([
    getLearningPath(user.id),
    getUserLanguage(user.id),
    getUserGeneration(setupToken),
    getUserEntitlements(user.id),
  ]);

  const activeTargetLang =
    path?.standardTrack?.targetLanguage ||
    userLang?.lang?.targetLanguage ||
    "fr-FR";
  const ladderOverview = await getLadderOverview(user.id, activeTargetLang);

  return (
    <PronunciationProvider>
      <MatrixProvider>
        <FoundationHubPage
          path={path}
          lang={userLang as any}
          generationData={generationData}
          ladder={ladderOverview}
          isTrial={entitlements.isTrial}
        />
      </MatrixProvider>
    </PronunciationProvider>
  );
}