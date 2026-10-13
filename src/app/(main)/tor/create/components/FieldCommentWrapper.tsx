"use client";

import React, { createContext, useContext, useState } from "react";
import { Plus, MessageSquare, CheckCircle2, RotateCcw, Trash2, Pencil, Send, X } from "lucide-react";
import { TabId, TorFieldComment } from "../types";

export interface FieldCommentContextValue {
  canComment: boolean;
  isCreator: boolean;
  isSuperAdmin: boolean;
  currentUserId?: number;
  activeTab: TabId;
  activeTabLabel: string;
  comments: TorFieldComment[];
  addComment: (fieldKey: string, fieldLabel: string, commentText: string) => Promise<void>;
  updateComment: (commentId: string, commentText: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleResolveComment: (commentId: string, resolved: boolean) => Promise<void>;
}

const FieldCommentContext = createContext<FieldCommentContextValue>({
  canComment: false,
  isCreator: false,
  isSuperAdmin: false,
  activeTab: "informasi-umum",
  activeTabLabel: "Informasi Umum",
  comments: [],
  addComment: async () => {},
  updateComment: async () => {},
  deleteComment: async () => {},
  toggleResolveComment: async () => {},
});

export const FieldCommentProvider = FieldCommentContext.Provider;

export function useFieldComments() {
  return useContext(FieldCommentContext);
}

interface FieldWithCommentProps {
  fieldKey: string;
  fieldLabel: string;
  children: React.ReactNode;
  className?: string;
  alignButton?: "input" | "top";
}

export function FieldWithComment({
  fieldKey,
  fieldLabel,
  children,
  className = "",
  alignButton = "input",
}: FieldWithCommentProps) {
  const {
    canComment,
    isCreator,
    isSuperAdmin,
    currentUserId,
    comments,
    addComment,
    updateComment,
    deleteComment,
    toggleResolveComment,
  } = useFieldComments();

  const [isAdding, setIsAdding] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fieldComments = comments.filter((c) => c.fieldKey === fieldKey);
  const unresolvedCount = fieldComments.filter((c) => !c.resolved).length;

  const handleSaveNew = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await addComment(fieldKey, fieldLabel, commentText.trim());
      setCommentText("");
      setIsAdding(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan komentar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editingText.trim() || actionLoadingId) return;
    setActionLoadingId(commentId);
    setErrorMsg(null);
    try {
      await updateComment(commentId, editingText.trim());
      setEditingId(null);
      setEditingText("");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengubah komentar");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (actionLoadingId) return;
    setActionLoadingId(commentId);
    setErrorMsg(null);
    try {
      await deleteComment(commentId);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus komentar");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleResolve = async (commentId: string, resolved: boolean) => {
    if (actionLoadingId) return;
    setActionLoadingId(commentId);
    setErrorMsg(null);
    try {
      await toggleResolveComment(commentId, resolved);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengubah status revisi");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div id={`field-${fieldKey}`} className={`space-y-2 scroll-mt-24 ${className}`}>
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">{children}</div>

        {canComment && (
          <div className={alignButton === "top" ? "pt-0.5 shrink-0" : "pt-7 shrink-0"}>
            <button
              type="button"
              onClick={() => {
                setIsAdding((prev) => !prev);
                setErrorMsg(null);
              }}
              title={`Tambah komentar / catatan revisi pada "${fieldLabel}"`}
              aria-label={`Tambah komentar atau revisi pada ${fieldLabel}`}
              className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all shadow-sm ${
                isAdding
                  ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-200"
                  : unresolvedCount > 0
                  ? "bg-amber-50 text-amber-700 border-amber-400 hover:bg-amber-100"
                  : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-500"
              }`}
            >
              <Plus
                size={18}
                className={`transition-transform duration-200 ${
                  isAdding ? "rotate-45" : ""
                }`}
              />
              {fieldComments.length > 0 && (
                <span
                  className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow ${
                    unresolvedCount > 0 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                >
                  {fieldComments.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Inline Add Comment Form */}
      {isAdding && canComment && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-lg p-3.5 shadow-sm space-y-2.5 mr-0 md:mr-11">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              <MessageSquare size={14} className="text-amber-600" />
              <span>Tambah Komentar / Revisi — {fieldLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setCommentText("");
                setErrorMsg(null);
              }}
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
              title="Tutup"
            >
              <X size={15} />
            </button>
          </div>

          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleSaveNew();
              }
            }}
            rows={2}
            autoFocus
            placeholder={`Tuliskan komentar atau catatan revisi untuk "${fieldLabel}"... (Ctrl+Enter untuk simpan)`}
            className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />

          {errorMsg && (
            <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setCommentText("");
                setErrorMsg(null);
              }}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveNew}
              disabled={submitting || !commentText.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Send size={12} />
              {submitting ? "Menyimpan..." : "Simpan Komentar"}
            </button>
          </div>
        </div>
      )}

      {/* Existing Comments List for this Field */}
      {fieldComments.length > 0 && (
        <div className={`space-y-2 ${canComment ? "mr-0 md:mr-11" : ""}`}>
          {fieldComments.map((item) => {
            const isAuthor = currentUserId !== undefined && item.authorId === currentUserId;
            const canModifyComment = isAuthor || isSuperAdmin;
            const canResolve = isCreator || isAuthor || canComment || isSuperAdmin;
            const isEditingThis = editingId === item.id;
            const isLoadingThis = actionLoadingId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-lg border p-3 text-sm transition-colors ${
                  item.resolved
                    ? "bg-emerald-50/70 border-emerald-200 text-gray-700"
                    : "bg-amber-50/90 border-amber-300 text-gray-900"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-semibold text-xs text-gray-900">
                      <MessageSquare
                        size={13}
                        className={item.resolved ? "text-emerald-600" : "text-amber-600"}
                      />
                      {item.authorName}
                    </span>
                    {item.authorPosition && (
                      <span className="text-[11px] text-gray-500 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                        {item.authorPosition}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">
                      {new Date(item.createdAt).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        item.resolved
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-200/80 text-amber-900"
                      }`}
                    >
                      {item.resolved ? "✓ Sudah Direvisi" : "Perlu Revisi"}
                    </span>

                    {canResolve && !isEditingThis && (
                      <button
                        type="button"
                        onClick={() => handleToggleResolve(item.id, !item.resolved)}
                        disabled={isLoadingThis}
                        title={
                          item.resolved
                            ? "Tandai belum selesai direvisi"
                            : "Tandai sudah selesai direvisi"
                        }
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition ${
                          item.resolved
                            ? "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                            : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                        } disabled:opacity-50`}
                      >
                        {item.resolved ? (
                          <>
                            <RotateCcw size={11} />
                            Buka
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={11} />
                            Selesai
                          </>
                        )}
                      </button>
                    )}

                    {canModifyComment && !isEditingThis && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingText(item.comment);
                          }}
                          disabled={isLoadingThis}
                          title="Edit komentar"
                          className="p-1 text-gray-500 hover:text-blue-600 hover:bg-white rounded transition disabled:opacity-50"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={isLoadingThis}
                          title="Hapus komentar"
                          className="p-1 text-gray-500 hover:text-red-600 hover:bg-white rounded transition disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditingThis ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-sm bg-white border border-amber-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditingText("");
                        }}
                        className="px-2.5 py-1 text-xs bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item.id)}
                        disabled={isLoadingThis || !editingText.trim()}
                        className="px-2.5 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                      >
                        {isLoadingThis ? "Menyimpan..." : "Simpan"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={`whitespace-pre-wrap text-sm leading-relaxed ${
                      item.resolved ? "line-through text-gray-500" : "text-gray-800"
                    }`}
                  >
                    {item.comment}
                  </p>
                )}

                {item.resolved && item.resolvedByName && (
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Diselesaikan oleh {item.resolvedByName}
                    {item.resolvedAt
                      ? ` pada ${new Date(item.resolvedAt).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}`
                      : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
