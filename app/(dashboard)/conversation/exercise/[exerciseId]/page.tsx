// app/(dashboard)/conversation/exercise/[exerciseId]/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { getTutorExercise } from "@/app/actions/tutor-exercise-actions";
import { TutorExerciseArcade } from "@/components/freestyle/exercise/tutor-exercise-arcade";
import { BuildingWorkoutPoller } from "@/components/freestyle/exercise/building-workout-poller";
import { ArrowLeft, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{
    exerciseId: string;
  }>;
}

export default async function ExercisePage({ params }: Params) {
  const { exerciseId } = await params;
  const user = await requireUser();

  const exercise = await getTutorExercise(exerciseId, user.id);

  if (!exercise) {
    notFound();
  }

  if (exercise.status === "FAILED") {
    redirect("/conversation/review");
  }

  if (!exercise.content || exercise.status === "BUILDING") {
    return (
     <div className="flex min-h-[calc(100dvh-3rem)] md:min-h-dvh flex-col animate-bg px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto my-auto flex max-w-md flex-col items-center justify-center rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-10 text-center shadow-md">
          <BuildingWorkoutPoller sessionId={exercise.sessionId} />
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-indigo-600" />
          <h2 className="text-xl font-black text-slate-900">
            Building Your 3-Minute Workout...
          </h2>
          <p className="mt-2 text-xs font-medium text-slate-500">
            Your AI Tutor is generating custom visual cards and voice drills
            from your conversation mistakes.
          </p>
          <Link
            href="/conversation/review"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Review Page</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TutorExerciseArcade
      userId={user.id}
      exerciseId={exercise.id}
      sessionId={exercise.sessionId}
      title={exercise.title}
      tutorName={exercise.tutorName}
      voiceGender={exercise.voiceGender}
      level={exercise.level}
      targetLanguage={exercise.targetLanguage}
      content={exercise.content}
    />
  );
}