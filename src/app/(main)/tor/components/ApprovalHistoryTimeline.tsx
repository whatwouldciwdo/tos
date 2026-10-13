"use client";

import { CheckCircle, XCircle, RotateCcw, Send, FileEdit, Download } from "lucide-react";

interface ApprovalHistoryEntry {
  id: number;
  action: string;
  fromStatusStage: string | null;
  toStatusStage: string;
  actedByNameSnapshot: string;
  actedByPositionSnapshot: string;
  note: string | null;
  createdAt: string | Date;
  stepNumber: number;
}

interface ApprovalHistoryTimelineProps {
  history: ApprovalHistoryEntry[];
  className?: string;
}

const actionConfig = {
  SUBMIT: {
    label: "Submitted",
    icon: Send,
    color: "border-blue-500/30 text-blue-300",
    iconBg: "text-blue-400 border border-blue-500/30",
  },
  APPROVE: {
    label: "Approved",
    icon: CheckCircle,
    color: "border-[#42ff6b]/30 text-emerald-300",
    iconBg: "text-[#42ff6b] border border-[#42ff6b]/30",
  },
  REVISE: {
    label: "Revision Requested",
    icon: RotateCcw,
    color: "border-amber-500/30 text-amber-300",
    iconBg: "text-amber-400 border border-amber-500/30",
  },
  REJECT: {
    label: "Rejected",
    icon: XCircle,
    color: "border-red-500/30 text-red-300",
    iconBg: "text-red-400 border border-red-500/30",
  },
  EXPORT: {
    label: "Exported",
    icon: Download,
    color: "border-purple-500/30 text-purple-300",
    iconBg: "text-purple-400 border border-purple-500/30",
  },
};

export default function ApprovalHistoryTimeline({
  history,
  className = "",
}: ApprovalHistoryTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className={`neu-inset p-8 text-center ${className}`}>
        <FileEdit className="mx-auto text-gray-500 mb-2" size={48} />
        <p className="text-gray-400 text-sm">No approval history yet</p>
      </div>
    );
  }

  // Sort by createdAt descending (newest first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Approval History</h3>
      
      <div className="space-y-4">
        {sortedHistory.map((entry, index) => {
          const config =
            actionConfig[entry.action as keyof typeof actionConfig] || actionConfig.SUBMIT;
          const Icon = config.icon;
          const isLast = index === sortedHistory.length - 1;

          return (
            <div key={entry.id} className="flex gap-4">
              {/* Timeline Line & Icon */}
              <div className="flex flex-col items-center">
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-full neu-inset-sm flex items-center justify-center ${config.iconBg} flex-shrink-0`}
                >
                  <Icon size={18} />
                </div>

                {/* Connecting Line */}
                {!isLast && <div className="w-0.5 h-full min-h-[40px] bg-white/10 mt-2" />}
              </div>

              {/* Content Card */}
              <div className="flex-1 pb-5">
                <div className={`neu-card-sm border p-4 ${config.color}`}>
                  {/* Action Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-semibold text-sm text-white">{config.label}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.fromStatusStage || "DRAFT"} → {entry.toStatusStage}
                      </p>
                    </div>
                    <span className="neu-inset-sm px-2.5 py-0.5 text-xs text-gray-300 whitespace-nowrap">
                      Step {entry.stepNumber}
                    </span>
                  </div>

                  {/* Actor Information */}
                  <div className="text-sm mb-2">
                    <p className="font-medium text-gray-100">{entry.actedByNameSnapshot}</p>
                    <p className="text-xs text-gray-400">{entry.actedByPositionSnapshot}</p>
                  </div>

                  {/* Note */}
                  {entry.note && (
                    <div className="mt-2 p-2.5 neu-inset-sm text-gray-200 text-xs italic">
                      &ldquo;{entry.note}&rdquo;
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="mt-3 text-xs text-gray-400">
                    {new Date(entry.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
