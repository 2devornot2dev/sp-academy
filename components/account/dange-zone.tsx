// components/account/dange-zone.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DangerZone({ userId }: { userId: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Could not delete account");
      }
      toast.success("Your account has been deleted.");
      router.push("/");
    } catch {
      toast.error("Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-3xl border-2 border-b-[6px] border-rose-200 border-b-rose-300 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-b-2 border-rose-800 bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-xs">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-rose-700">Danger Zone</h2>
            <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-500">
              Permanently delete your account, Spoons, Word Matrix, and all
              conversation history. This action cannot be undone.
            </p>
          </div>
        </div>

        {!confirmOpen ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-2xl border-2 border-b-4 border-rose-200 border-b-rose-300 bg-rose-50 px-5 py-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 sm:self-center"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Account</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setConfirmOpen(false)}
              className="rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteAccount}
              className="inline-flex items-center gap-1.5 rounded-xl border-b-[3px] border-rose-900 bg-gradient-to-b from-rose-500 to-red-600 px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Yes, Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}