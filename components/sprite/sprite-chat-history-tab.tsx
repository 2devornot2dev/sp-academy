// components/sprite/sprite-chat-history-tab.tsx
"use client";

import { useState } from "react";
import {
  MessageSquare,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cleanDisplayString } from "./sprite-chat-utils";
import type { SpriteSessionData } from "@/lib/schema/sprite-schema";

interface SpriteChatHistoryTabProps {
  spriteName: string;
  sessionId: string;
  sessionsList: SpriteSessionData[];
  hasActiveTurns: boolean;
  onSelectSession: (session: SpriteSessionData) => void;
  onDeleteSession: (session: SpriteSessionData) => Promise<boolean>;
}

export function SpriteChatHistoryTab({
  spriteName,
  sessionId,
  sessionsList,
  hasActiveTurns,
  onSelectSession,
  onDeleteSession,
}: SpriteChatHistoryTabProps) {
  const [sessionToDelete, setSessionToDelete] =
    useState<SpriteSessionData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setSessionToDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    const ok = await onDeleteSession(sessionToDelete);

    setIsDeleting(false);
    if (ok) {
      setSessionToDelete(null);
    } else {
      setDeleteError("Couldn't delete this session. Please try again.");
    }
  };

  const deleteTurnCount = Array.isArray(sessionToDelete?.turns)
    ? sessionToDelete.turns.length
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
          Saved Sessions ({sessionsList.length})
        </span>
      </div>

      {sessionsList.length === 0 ? (
        <div className="my-auto rounded-3xl border-2 border-b-[5px] border-slate-200 border-b-slate-300 bg-white p-10 text-center shadow-xs">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-blue-500" />
          <p className="text-base font-black text-slate-900">
            No saved sessions yet
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs font-medium text-slate-500">
            Start a conversation in the Session tab to save your first session.
          </p>
        </div>
      ) : (
        sessionsList.map((sess) => {
          const isCurrentSession = sess.id === sessionId && hasActiveTurns;
          const turnCount = Array.isArray(sess.turns) ? sess.turns.length : 0;
          const lastTurn = turnCount > 0 ? sess.turns[turnCount - 1] : null;

          return (
            <div
              key={sess.id}
              className={`flex items-stretch rounded-2xl border-2 border-b-4 transition ${
                isCurrentSession
                  ? "border-sky-400 border-b-blue-600 bg-gradient-to-r from-sky-50/80 to-white shadow-xs"
                  : "border-slate-200 border-b-slate-300 bg-white hover:border-sky-300 hover:bg-slate-50/50"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectSession(sess)}
                className="min-w-0 flex-1 p-4 text-left"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="max-w-[340px] truncate text-sm font-black text-slate-900">
                      {cleanDisplayString(sess.title)}
                    </span>
                    {isCurrentSession && (
                      <span className="shrink-0 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800">
                        Open
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {turnCount} {turnCount === 1 ? "turn" : "turns"}
                  </span>
                </div>

                {sess.lessonTitle && (
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-blue-600">
                    Current: {sess.lessonTitle}
                  </span>
                )}

                {lastTurn && (
                  <p className="line-clamp-1 text-xs font-medium text-slate-500">
                    {spriteName}: {cleanDisplayString(lastTurn.assistantReply)}
                  </p>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setSessionToDelete(sess);
                }}
                title="Delete session"
                aria-label={`Delete session ${cleanDisplayString(sess.title)}`}
                className="flex w-12 shrink-0 items-center justify-center rounded-r-2xl border-l border-slate-200 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        open={!!sessionToDelete}
        onClose={closeDeleteModal}
        labelledBy="delete-session-title"
        dismissible={!isDeleting}
      >
        {sessionToDelete && (
          <div className="rounded-3xl border-2 border-b-[6px] border-rose-200 border-b-rose-300 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div className="min-w-0">
                <h3
                  id="delete-session-title"
                  className="text-lg font-black text-slate-900"
                >
                  Delete this session?
                </h3>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
                  {cleanDisplayString(sessionToDelete.title)}
                  {deleteTurnCount > 0 &&
                    ` · ${deleteTurnCount} ${
                      deleteTurnCount === 1 ? "turn" : "turns"
                    }`}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600">
              Please review this session before deleting it. Once it&apos;s gone,{" "}
              <span className="font-black text-slate-900">{spriteName}</span>{" "}
              won&apos;t be able to recall this conversation, pick up where you
              left off, or build on it in future practice. This can&apos;t be
              undone.
            </p>

            {deleteError && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Keep session
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl border-b-[3px] border-rose-800 bg-rose-600 px-4 py-2 text-xs font-black text-white transition hover:bg-rose-500 disabled:opacity-70"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete session</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}