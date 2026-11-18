// app/(dashboard)/learning-hub/ladder/[slug]/page.tsx
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { getUserLanguage } from "@/app/actions/get-user-language";
import { getLadderRung } from "@/app/actions/ladder-actions";
import { toLanguageCode } from "@/lib/languages";
import { LadderWorksheetArcade } from "@/components/learning-hub/ladder/ladder-worksheet-arcade";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function LadderRungPage({ params }: Params) {
  const { slug } = await params;
  const user = await requireUser();
  const { lang } = await getUserLanguage(user.id);
  const targetLang = toLanguageCode(lang?.targetLanguage || "FRENCH");

  const rung = await getLadderRung(slug, user.id, targetLang);

  if (!rung) {
    notFound();
  }

  if (!rung.isUnlocked) {
    redirect("/learning-hub/ladder");
  }

  return <LadderWorksheetArcade userId={user.id} rung={rung} />;
}