// src/app/(main)/tor/[id]/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { cleanPrisma } from "@/lib/prisma-clean";
import { Home, Edit } from "lucide-react";
import ApprovalProgressBar from "../components/ApprovalProgressBar";
import TorStatusBadge from "../components/TorStatusBadge";
import ApprovalHistoryTimeline from "../components/ApprovalHistoryTimeline";
import TorFormLayout from "../create/TorFormLayout";
import TorDetailClient from "./TorDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TorDetailPage({ params }: PageProps) {
  const { id } = await params;

  const sessionUser = await getCurrentUser();

  const [torRaw, dbUser] = await Promise.all([
    prisma.tor.findUnique({
      where: { id: parseInt(id) },
      include: {
        bidang: {
          include: {
            workflows: {
              include: {
                steps: {
                  orderBy: { stepNumber: "asc" },
                  include: {
                    position: true,
                  },
                },
              },
            },
          },
        },
        creator: {
          include: {
            position: true,
          },
        },
        budgetItems: {
          orderBy: { orderIndex: "asc" },
        },
        history: {
          include: {
            actedBy: {
              include: {
                position: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { 
        id: true, 
        name: true,
        positionId: true, 
        isSuperAdmin: true,
        position: {
          include: {
            positionRoles: {
              include: {
                role: true
              }
            }
          }
        }
      },
    }),
  ]);

  if (!torRaw) {
    return (
      <div className="min-h-screen bg-[#262626] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-bold mb-2">TOR Not Found</h2>
          <p className="text-gray-400 mb-6">The TOR you're looking for doesn't exist.</p>
          <Link
            href="/tor"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#42ff6b] text-black rounded-lg hover:bg-[#38e05c] font-medium"
          >
            <Home size={20} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ⭐ Convert Prisma object → plain safe JSON for client components
  const tor = cleanPrisma(torRaw);

  // Get workflow data
  const workflow = tor.bidang?.workflows?.[0];
  const workflowSteps = workflow?.steps?.map((step: any) => ({
    stepNumber: step.stepNumber,
    label: step.label,
    statusStage: step.statusStage,
    positionId: step.positionId,
    positionName: step.position?.name,
  })) || [];

  const currentStep = workflowSteps.find(
    (step: any) => step.stepNumber === tor.currentStepNumber
  );

  // Permission calculations
  const isCreator = tor.creatorUserId === sessionUser.id;
  const hasSuperAdminRole = !!dbUser?.position?.positionRoles?.some(
    (pr: any) => pr.role?.name === "SUPER_ADMIN"
  );
  const isSuperAdmin = Boolean(dbUser?.isSuperAdmin || hasSuperAdminRole);
  const canEdit = (isCreator || isSuperAdmin) && (tor.statusStage === "DRAFT" || tor.statusStage === "REVISE");
  const canSubmit = isCreator && tor.statusStage === "DRAFT";

  const canApprove =
    tor.statusStage !== "DRAFT" &&
    tor.statusStage !== "REVISE" &&
    !tor.isFinalApproved &&
    !!dbUser &&
    (isSuperAdmin ||
      (!isCreator &&
        currentStep &&
        (dbUser.positionId === currentStep.positionId ||
          (dbUser.position?.name &&
            currentStep.positionName &&
            dbUser.position.name === currentStep.positionName))));

  // Check if user has EXPORT role
  const canExport =
    isSuperAdmin ||
    !!dbUser?.position?.positionRoles?.some(
      (pr: any) => pr.role?.name === 'EXPORT'
    );

  // Helper function to format dates for HTML date inputs (YYYY-MM-DD)
  const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0]; // Returns YYYY-MM-DD
    } catch {
      return "";
    }
  };

  // Format TOR data for TorFormLayout
  const torFormData = {
    ...tor,
    number: tor.number || undefined,
    creationDate: formatDateForInput(tor.creationDate),
    projectStartDate: formatDateForInput(tor.projectStartDate),
    projectEndDate: formatDateForInput(tor.projectEndDate),
    workStages: tor.workStagesData,
    directorProposals: tor.directorProposals || [],
    fieldDirectorProposals: tor.fieldDirectorProposals || [],
    fieldComments: tor.fieldComments || [],
    statusStage: tor.statusStage,
  };

  return (
    <div className="min-h-screen bg-[#262626] text-white">
      {/* Header Section */}
      <div className="bg-[#1f1f1f] border-b border-[#333] shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Navigation */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/tor"
              className="p-2 rounded-lg bg-[#2a2a2a] border border-[#42ff6b]/30 hover:bg-[#333] hover:border-[#42ff6b] text-white transition-colors"
              title="Back to Dashboard"
            >
              <Home size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {tor.title || "Untitled TOR"}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                TOR #{tor.number || "DRAFT"} • {tor.bidang?.name}
              </p>
            </div>
          </div>

          {/* Status & Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Metadata */}
            <div className="lg:col-span-1 space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Status</div>
                <TorStatusBadge
                  status={tor.statusStage}
                  isFinalApproved={tor.isFinalApproved}
                />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Creator</div>
                <div className="text-sm font-medium">
                  {tor.creator?.name || "-"}
                </div>
                <div className="text-xs text-gray-400">
                  {tor.creator?.position?.name || "-"}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Created</div>
                <div className="text-sm">
                  {new Date(tor.createdAt).toLocaleDateString("id-ID", {
                    dateStyle: "long",
                  })}
                </div>
              </div>

              {tor.budgetAmount && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Budget</div>
                  <div className="text-sm font-semibold text-[#42ff6b]">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: tor.budgetCurrency || "IDR",
                      minimumFractionDigits: 0,
                    }).format(tor.budgetAmount)}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Progress Bar */}
            <div className="lg:col-span-2">
              {tor.statusStage !== "DRAFT" && workflowSteps.length > 0 && (
                <ApprovalProgressBar
                  workflowSteps={workflowSteps}
                  currentStepNumber={tor.currentStepNumber || 0}
                  isFinalApproved={tor.isFinalApproved || false}
                  variant="detailed"
                />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3 items-start">
            {canEdit && (
              <Link
                href={`/tor/edit/${id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#42ff6b] text-black rounded-lg hover:bg-[#38e05c] font-medium transition-colors shadow-lg shadow-[#42ff6b]/20"
              >
                <Edit size={18} />
                Edit TOR
              </Link>
            )}

            {/* TorDetailClient handles submit, approve, revise, reject, export buttons */}
            <TorDetailClient
              torId={id}
              status={tor.statusStage}
              canSubmit={canSubmit}
              canApprove={canApprove}
              canExport={canExport}
              initialFieldComments={tor.fieldComments || []}
            />
          </div>
        </div>
      </div>

      {/* Main Content - Always View Only */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <TorFormLayout
            torId={parseInt(id)}
            initialData={torFormData}
            bidangId={tor.bidangId}
            bidangName={tor.bidang?.name}
            creatorName={tor.creator?.name}
            creatorPosition={tor.creator?.position?.name}
            isViewOnly={true}
            currentUserName={dbUser?.name || sessionUser.name}
            canComment={!!canApprove}
            currentUserId={sessionUser.id}
            isCreator={isCreator}
            isSuperAdmin={isSuperAdmin}
          />

          {/* Approval History */}
          {tor.history && tor.history.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <ApprovalHistoryTimeline history={tor.history} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
