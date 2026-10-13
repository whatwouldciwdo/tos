"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";

interface WorkflowStep {
  stepNumber: number;
  label: string;
  statusStage: string;
  positionName?: string;
}

interface ApprovalProgressBarProps {
  workflowSteps: WorkflowStep[];
  currentStepNumber: number;
  isFinalApproved: boolean;
  variant?: "compact" | "detailed";
  className?: string;
}

export default function ApprovalProgressBar({
  workflowSteps,
  currentStepNumber,
  isFinalApproved,
  variant = "compact",
  className = "",
}: ApprovalProgressBarProps) {
  const sortedSteps = [...workflowSteps].sort((a, b) => a.stepNumber - b.stepNumber);
  const totalSteps = sortedSteps.length;

  const getStepStatus = (step: WorkflowStep) => {
    if (isFinalApproved) return "completed";
    if (step.stepNumber < currentStepNumber) return "completed";
    if (step.stepNumber === currentStepNumber) return "current";
    return "pending";
  };

  const getProgressPercentage = () => {
    if (isFinalApproved) return 100;
    if (currentStepNumber === 0) return 0;
    return ((currentStepNumber - 1) / totalSteps) * 100;
  };

  if (variant === "compact") {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Progress Bar */}
        <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden border border-gray-600">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${getProgressPercentage()}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between items-center">
          {sortedSteps.map((step, index) => {
            const status = getStepStatus(step);
            return (
              <div
                key={step.stepNumber}
                className="flex flex-col items-center flex-1"
                title={step.label}
              >
                {/* Step Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 border-2 ${
                    status === "completed"
                      ? "bg-green-500 text-white shadow-lg shadow-green-500/50 border-green-400"
                      : status === "current"
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50 animate-pulse border-blue-400"
                      : "bg-gray-600 text-gray-200 border-gray-500"
                  }`}
                >
                  {status === "completed" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <span>{step.stepNumber}</span>
                  )}
                </div>

                {/* Step Label (hidden on mobile) */}
                <div
                  className={`mt-1 text-[10px] text-center max-w-[80px] hidden sm:block ${
                    status === "current"
                      ? "text-blue-400 font-semibold"
                      : status === "completed"
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  {(() => {
                    const displayText = step.positionName || step.label;
                    return displayText.length > 20
                      ? displayText.substring(0, 17) + "..."
                      : displayText;
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Text */}
        <div className="text-xs text-center text-gray-300">
          {isFinalApproved ? (
            <span className="text-green-400 font-semibold flex items-center justify-center gap-1">
              <CheckCircle2 size={14} />
              Fully Approved
            </span>
          ) : currentStepNumber === 0 ? (
            <span className="text-gray-400">Not Submitted</span>
          ) : (
            <span className="text-blue-400">
              Step {currentStepNumber} of {totalSteps}:{" "}
              {(() => {
                const currentStep = sortedSteps.find((s) => s.stepNumber === currentStepNumber);
                return currentStep?.positionName || currentStep?.label || "Unknown";
              })()}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Approval Progress</h3>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          {isFinalApproved
            ? "✓ Completed"
            : `${currentStepNumber} / ${totalSteps} Steps`}
        </span>
      </div>

      {/* Vertical Timeline */}
      <div className="space-y-3">
        {sortedSteps.map((step, index) => {
          const status = getStepStatus(step);
          const isLast = index === sortedSteps.length - 1;

          return (
            <div key={step.stepNumber} className="flex gap-3">
              {/* Timeline Line & Icon */}
              <div className="flex flex-col items-center">
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    status === "completed"
                      ? "bg-green-100 text-green-600 ring-4 ring-green-50"
                      : status === "current"
                      ? "bg-blue-100 text-blue-600 ring-4 ring-blue-50 animate-pulse"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {status === "completed" ? (
                    <CheckCircle2 size={20} />
                  ) : status === "current" ? (
                    <Clock size={20} />
                  ) : (
                    <Circle size={20} />
                  )}
                </div>

                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={`w-0.5 h-12 mt-1 transition-all duration-300 ${
                      status === "completed" ? "bg-green-300" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 pb-8">
                <div
                  className={`font-semibold text-sm ${
                    status === "current"
                      ? "text-blue-600"
                      : status === "completed"
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  Step {step.stepNumber}: {step.positionName || step.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Status: {step.statusStage}
                </div>
                {status === "current" && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    <Clock size={12} />
                    Awaiting Approval
                  </div>
                )}
                {status === "completed" && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    <CheckCircle2 size={12} />
                    Approved
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Status */}
      {isFinalApproved && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 size={20} />
            <span className="font-semibold">Fully Approved</span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            This TOR has been approved by all required approvers.
          </p>
        </div>
      )}
    </div>
  );
}
