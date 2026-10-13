"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, AlertCircle, Send, Download, MessageSquarePlus } from "lucide-react";
import { ConfirmModal } from "@/components/Modal";
import { useConfirmModal } from "@/hooks/useModal";
import { saveAs } from "file-saver";
import { TorFieldComment } from "../create/types";

type Props = {
  torId: string;
  status: string;
  canSubmit: boolean;
  canApprove: boolean;
  canExport?: boolean;
  initialFieldComments?: TorFieldComment[];
};

export default function TorDetailClient({
  torId,
  status,
  canSubmit,
  canApprove,
  canExport = false,
  initialFieldComments = [],
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "submit" | "approve" | "revise" | "reject" | "export">(null);
  const [error, setError] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [showNoteModal, setShowNoteModal] = useState<"revise" | "reject" | null>(null);
  const [fieldComments, setFieldComments] = useState<TorFieldComment[]>(
    Array.isArray(initialFieldComments) ? initialFieldComments : []
  );

  useEffect(() => {
    setFieldComments(Array.isArray(initialFieldComments) ? initialFieldComments : []);
  }, [initialFieldComments]);

  useEffect(() => {
    const handleCommentsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<TorFieldComment[]>;
      if (Array.isArray(customEvent.detail)) {
        setFieldComments(customEvent.detail);
      }
    };
    window.addEventListener("tor-field-comments-updated", handleCommentsUpdated);
    return () => {
      window.removeEventListener("tor-field-comments-updated", handleCommentsUpdated);
    };
  }, []);

  const unresolvedComments = fieldComments.filter((c) => !c.resolved);

  const buildFieldCommentsSummary = () => {
    const targetComments = unresolvedComments.length > 0 ? unresolvedComments : fieldComments;
    if (targetComments.length === 0) return "";
    const lines = targetComments.map(
      (c, idx) => `${idx + 1}. [${c.fieldLabel}]: ${c.comment}`
    );
    return `Catatan Revisi per Field:\n${lines.join("\n")}`;
  };

  const handleOpenReviseModal = () => {
    const summary = buildFieldCommentsSummary();
    if (summary && !actionNote.trim()) {
      setActionNote(summary);
    }
    setShowNoteModal("revise");
  };
  
  // Modal hook
  const confirmModal = useConfirmModal();

  async function handleSubmit() {
    confirmModal.showConfirm(
      "Apakah Anda yakin ingin mengajukan TOR ini?",
      async () => {
        try {
          setLoading("submit");
          setError(null);

          const res = await fetch(`/api/tor/${torId}/submit`, {
            method: "POST",
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || "Gagal mengajukan TOR");
          }

          router.refresh();
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(null);
        }
      },
      "info"
    );
  }

  async function handleApprove() {
    confirmModal.showConfirm(
      "Apakah Anda yakin ingin menyetujui TOR ini?",
      async () => {
        try {
          setLoading("approve");
          setError(null);

          const res = await fetch(`/api/tor/${torId}/approve`, {
            method: "POST",
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || "Gagal menyetujui TOR");
          }

          router.refresh();
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(null);
        }
      },
      "info"
    );
  }

  async function handleActionWithNote() {
    if (!showNoteModal) return;
    if (!actionNote.trim()) {
      setError("Catatan wajib diisi");
      return;
    }

    const action = showNoteModal;
    try {
      setLoading(action);
      setError(null);

      const res = await fetch(`/api/tor/${torId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: actionNote }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Gagal melakukan aksi ${action}`);
      }

      setShowNoteModal(null);
      setActionNote("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleExport() {
    try {
      setLoading("export");
      setError(null);

      const response = await fetch(`/api/tor/${torId}/export`);
      
      if (!response.ok) {
        throw new Error('Failed to export TOR');
      }
      
      const blob = await response.blob();
      
      let filename = `TOR-${torId}.docx`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition) {
        const match = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      
      saveAs(blob, filename);
    } catch (err: any) {
      setError(err.message || 'Gagal export TOR');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {canSubmit && (
          <button
            onClick={handleSubmit}
            disabled={loading !== null}
            className="neu-btn flex items-center gap-2 px-4 py-2.5 text-sm text-blue-400 hover:text-blue-300 border border-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
          >
            <Send size={17} />
            {loading === "submit" ? "Mengajukan..." : "Ajukan TOR"}
          </button>
        )}

        {canApprove && (
          <>
            <button
              onClick={handleApprove}
              disabled={loading !== null}
              className="neu-btn-accent flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
            >
              <CheckCircle size={17} />
              {loading === "approve" ? "Menyetujui..." : "Setujui"}
            </button>

            <button
              onClick={handleOpenReviseModal}
              disabled={loading !== null}
              className="neu-btn flex items-center gap-2 px-4 py-2.5 text-sm text-amber-400 hover:text-amber-300 border border-amber-500/30 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
            >
              <AlertCircle size={17} />
              Revisi
              {unresolvedComments.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[11px] font-bold bg-amber-400 text-black rounded-full">
                  {unresolvedComments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowNoteModal("reject")}
              disabled={loading !== null}
              className="neu-btn flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 border border-red-500/30 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
            >
              <XCircle size={17} />
              Tolak
            </button>
          </>
        )}

        {canExport && (
          <button
            onClick={handleExport}
            disabled={loading !== null}
            className="neu-btn flex items-center gap-2 px-4 py-2.5 text-sm text-purple-400 hover:text-purple-300 border border-purple-500/30 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
          >
            <Download size={17} />
            {loading === "export" ? "Exporting..." : "Export to Word"}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 neu-inset border border-red-500/40 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Modal for Note */}
      {showNoteModal && (
        <div className="neu-modal fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-white">
          <div className="neu-card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {showNoteModal === "revise" ? "Permintaan Revisi" : "Tolak TOR"}
              </h3>
              {showNoteModal === "revise" && fieldComments.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActionNote(buildFieldCommentsSummary())}
                  className="neu-btn inline-flex items-center gap-1.5 text-xs text-amber-300 px-3 py-1.5"
                  title="Salin rangkuman komentar per field ke catatan revisi"
                >
                  <MessageSquarePlus size={13} />
                  Muat dari Komentar Field ({unresolvedComments.length || fieldComments.length})
                </button>
              )}
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Catatan / Alasan {showNoteModal === "revise" ? "Revisi" : "Penolakan"} <span className="text-red-400">*</span>
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full px-3.5 py-2.5 neu-inset text-white focus:outline-none min-h-[140px] text-sm"
                style={{ color: "#ffffff" }}
                placeholder="Tuliskan catatan anda disini..."
              />
              {showNoteModal === "revise" && unresolvedComments.length > 0 && (
                <p className="text-xs text-amber-300/80 mt-2">
                  💡 Terdapat {unresolvedComments.length} komentar revisi per field yang otomatis dirangkum di atas dan tetap tersimpan di masing-masing field untuk pembuat TOR.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowNoteModal(null);
                  setActionNote("");
                  setError(null);
                }}
                className="neu-btn px-4 py-2 text-gray-300 text-sm font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleActionWithNote}
                disabled={loading !== null || !actionNote.trim()}
                className={`neu-btn px-4 py-2 text-sm font-semibold ${
                  showNoteModal === "revise" 
                    ? "text-amber-400 border border-amber-500/40" 
                    : "text-red-400 border border-red-500/40"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === showNoteModal ? "Memproses..." : "Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.close}
        onConfirm={confirmModal.confirmCallback || (() => {})}
        message={confirmModal.confirmMessage}
        type={confirmModal.confirmType}
      />
    </div>
  );
}
