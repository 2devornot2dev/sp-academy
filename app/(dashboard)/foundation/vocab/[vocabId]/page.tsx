import { VocabBridgeWrapper } from "@/components/foundation/vocab/vocab-bridge-wrapper";
import { requireUser } from "@/lib/auth-guard";
import { getVocabBridge } from "@/app/actions/get-vocab-bridge";

interface Params {
  params: Promise<{
    vocabId: string;
  }>;
}

export default async function Page({ params }: Params) {
  const { vocabId } = await params;
  const user = await requireUser();

  const bridge = await getVocabBridge({
    userId: user.id,
    vocabId,
  });

  return (
    <div className="min-h-screen animate-bg">
      <VocabBridgeWrapper bridge={bridge} />
    </div>
  );
}