"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, User, Calendar, TrendingUp, DollarSign, Trash2 } from "lucide-react";
import ApprovalProgressBar from "./components/ApprovalProgressBar";
import TorStatusBadge from "./components/TorStatusBadge";
import { AlertModal, ConfirmModal } from "@/components/Modal";
import { useAlertModal, useConfirmModal } from "@/hooks/useModal";

type TorListItemProps = {
  tor: any;
  isCreator: boolean;
  view: "mine" | "approve";
  workflowSteps?: any[];
};

export default function TorListItem({ tor, isCreator, view, workflowSteps = [] }: TorListItemProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  
  // Modal hooks
  const alertModal = useAlertModal();
  const confirmModal = useConfirmModal();

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    confirmModal.showConfirm(
      "Submit this ToR for approval?",
      async () => {
        try {
          setSubmitting(true);
          const res = await fetch(`/api/tor/${tor.id}/submit`, {
            method: "POST",
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || "Failed to submit ToR");
          }

          alertModal.showAlert("ToR submitted successfully!", "success");
          router.refresh();
        } catch (error: any) {
          alertModal.showAlert(error.message, "error");
        } finally {
          setSubmitting(false);
        }
      },
      "info"
    );
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    confirmModal.showConfirm(
      "Are you sure you want to delete this ToR? This action cannot be undone.",
      async () => {
        try {
          setSubmitting(true);
          const res = await fetch(`/api/tor/${tor.id}`, {
            method: "DELETE",
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || "Failed to delete ToR");
          }

          alertModal.showAlert("ToR deleted successfully!", "success");
          router.refresh();
        } catch (error: any) {
          alertModal.showAlert(error.message, "error");
        } finally {
          setSubmitting(false);
        }
      },
      "danger"
    );
  };

  return (
    <Link
      href={`/tor/${tor.id}`}
      className="block neu-card-interactive overflow-hidden group"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white group-hover:text-[#42ff6b] transition-colors line-clamp-1">
                  {tor.title || "Tanpa Judul"}
                </h3>
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                  {tor.description || "No description"}
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <TorStatusBadge 
            status={tor.statusStage} 
            isFinalApproved={tor.isFinalApproved}
            className="ml-3 flex-shrink-0"
          />
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2.5 text-xs text-gray-300 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 neu-inset-sm">
            <TrendingUp size={13} className="text-[#42ff6b]" />
            <span>{tor.bidang?.name || "-"}</span>
          </div>
          
          {view === "approve" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 neu-inset-sm">
              <User size={13} className="text-[#42ff6b]" />
              <span>{tor.creator?.name || "-"}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 neu-inset-sm">
            <Calendar size={13} className="text-[#42ff6b]" />
            <span>{new Date(tor.createdAt).toLocaleDateString("id-ID")}</span>
          </div>

          {tor.budgetAmount && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 neu-inset-sm font-semibold text-[#42ff6b]">
              <DollarSign size={13} />
              <span>
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: tor.budgetCurrency || "IDR",
                  minimumFractionDigits: 0,
                }).format(tor.budgetAmount)}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar - only show if not DRAFT */}
        {tor.statusStage !== "DRAFT" && workflowSteps.length > 0 && (
          <div className="mt-4 p-4 neu-inset">
            <ApprovalProgressBar
              workflowSteps={workflowSteps}
              currentStepNumber={tor.currentStepNumber || 0}
              isFinalApproved={tor.isFinalApproved || false}
              variant="compact"
            />
          </div>
        )}

        {/* Action Buttons */}
        {view === "mine" && isCreator && tor.statusStage === "DRAFT" && (
          <div className="mt-4 pt-4 border-t border-white/5 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 sm:flex-initial px-4 py-2 neu-btn-accent text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {submitting ? "Submitting..." : "Submit for Approval"}
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="px-4 py-2 neu-btn text-red-400 hover:text-red-300 text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              title="Delete ToR"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      
      {/* Modals */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={alertModal.close}
        message={alertModal.alertMessage}
        type={alertModal.alertType}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.close}
        onConfirm={confirmModal.confirmCallback || (() => {})}
        message={confirmModal.confirmMessage}
        type={confirmModal.confirmType}
      />
    </Link>
  );
}
