// app/(dashboard)/conversation/[sessionId]/page.tsx
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { getConversationReview } from "@/app/actions/get-user-reviews";
import { ConversationReviewWrapper } from "@/components/freestyle/review/conversation-review-wrapper";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ sessionId: string }>;
}

export default async function ConversationReviewDetailPage({ params }: Params) {
  const { sessionId } = await params;
  const user = await requireUser();

  const result = await getConversationReview(sessionId, user.id);

  if (!result.found) {
    notFound();
  }

  return (
    <ConversationReviewWrapper
      sessionId={sessionId}
      initialData={result.data}
      isBaking={result.isBaking}
      isFailed={result.isFailed}
    />
  );
}