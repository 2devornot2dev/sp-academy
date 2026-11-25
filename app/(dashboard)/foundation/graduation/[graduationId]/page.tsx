// app/(dashboard)/foundation/graduation/[graduationId]/page.tsx
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { getGraduationData } from "../../actions/get-graduation-data";
import MilestoneGraduationView from "@/components/foundation/graduation/milestone-graduation-view";

// export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ graduationId: string }>;
}

export default async function MilestoneGraduationPage({ params }: Params) {
  const { graduationId } = await params;
  const user = await requireUser();

  const data = await getGraduationData(graduationId, user.id);
  if (!data) {
    notFound();
  }

  return <MilestoneGraduationView data={data} />;
}