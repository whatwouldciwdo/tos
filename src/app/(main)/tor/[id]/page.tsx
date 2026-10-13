// src/app/(main)/tor/[id]/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { cleanPrisma } from "@/lib/prisma-clean";
import { Home, Edit, User, Calendar, Wallet, Activity, Building2, Hash } from "lucide-react";
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

  const showApprovalProgress =
    tor.statusStage !== "DRAFT" && workflowSteps.length > 0;
  const showApprovalHistory = Boolean(tor.history && tor.history.length > 0);

  return (
    <div className="min-h-screen bg-[#262626] text-white">
      {/* Premium Header Section */}
      <div className="relative bg-gradient-to-b from-[#181818] via-[#1f1f1f] to-[#242424] border-b border-white/10 shadow-xl overflow-hidden">
        {/* Subtle decorative top accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#42ff6b] via-emerald-400 to-teal-500" />

        <div className="max-w-7xl mx-auto px-6 py-7">
          {/* Top Bar: Navigation + Title on Left, Action Buttons on Right */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/tor"
                className="mt-0.5 w-11 h-11 rounded-xl bg-[#2a2a2a] border border-[#42ff6b]/40 hover:bg-[#42ff6b] hover:text-black hover:border-[#42ff6b] text-[#42ff6b] flex items-center justify-center transition-all duration-200 shadow-lg shadow-black/30 shrink-0 group"
                title="Kembali ke Dashboard"
              >
                <Home size={20} className="transition-transform group-hover:scale-105" />
              </Link>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {tor.bidang?.name && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#42ff6b]/10 text-[#42ff6b] border border-[#42ff6b]/30">
                      <Building2 size={12} />
                      {tor.bidang.name}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono text-gray-300 bg-white/5 border border-white/10">
                    <Hash size={11} className="text-gray-400" />
                    {tor.number || "DRAFT"}
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white break-words">
                  {tor.title || "Untitled TOR"}
                </h1>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {canEdit && (
                <Link
                  href={`/tor/edit/${id}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#42ff6b] text-black rounded-xl hover:bg-[#38e05c] font-semibold text-sm transition-all shadow-lg shadow-[#42ff6b]/20"
                >
                  <Edit size={17} />
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

          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
            {/* Status Card */}
            <div className="bg-[#2a2a2a]/70 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-colors flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between text-xs font-medium text-gray-400 uppercase tracking-wider">
                <span>Status Dokumen</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Activity size={14} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <TorStatusBadge
                  status={tor.statusStage}
                  isFinalApproved={tor.isFinalApproved}
                />
                {showApprovalProgress && (
                  <span className="text-xs font-medium text-gray-400">
                    {tor.isFinalApproved
                      ? "Selesai"
                      : `Step ${tor.currentStepNumber || 0}/${workflowSteps.length}`}
                  </span>
                )}
              </div>
            </div>

            {/* Creator Card */}
            <div className="bg-[#2a2a2a]/70 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-colors flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between text-xs font-medium text-gray-400 uppercase tracking-wider">
                <span>Creator</span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <User size={14} />
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white truncate">
                  {tor.creator?.name || "-"}
                </div>
                <div
                  className="text-xs text-gray-400 truncate mt-0.5"
                  title={tor.creator?.position?.name || ""}
                >
                  {tor.creator?.position?.name || "-"}
                </div>
              </div>
            </div>

            {/* Created Date Card */}
            <div className="bg-[#2a2a2a]/70 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-colors flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between text-xs font-medium text-gray-400 uppercase tracking-wider">
                <span>Created</span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Calendar size={14} />
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {new Date(tor.createdAt).toLocaleDateString("id-ID", {
                    dateStyle: "long",
                  })}
                </div>
                <div className="text-xs text-gray-400 truncate mt-0.5">
                  {tor.bidang?.name || "-"}
                </div>
              </div>
            </div>

            {/* Budget Card */}
            <div className="bg-[#2a2a2a]/70 border border-[#42ff6b]/20 hover:border-[#42ff6b]/40 rounded-xl p-4 transition-colors flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between text-xs font-medium text-gray-400 uppercase tracking-wider">
                <span>Budget</span>
                <div className="w-7 h-7 rounded-lg bg-[#42ff6b]/10 border border-[#42ff6b]/30 flex items-center justify-center text-[#42ff6b]">
                  <Wallet size={14} />
                </div>
              </div>
              <div>
                <div className="text-base font-bold text-[#42ff6b] tracking-tight">
                  {tor.budgetAmount
                    ? new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: tor.budgetCurrency || "IDR",
                        minimumFractionDigits: 0,
                      }).format(tor.budgetAmount)
                    : "-"}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Mata Uang: {tor.budgetCurrency || "IDR"}
                </div>
              </div>
            </div>
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

          {/* Bottom Section: Approval Progress & Approval History */}
          {(showApprovalProgress || showApprovalHistory) && (
            <div
              className={`grid grid-cols-1 ${
                showApprovalProgress && showApprovalHistory
                  ? "lg:grid-cols-2"
                  : ""
              } gap-6 items-start`}
            >
              {showApprovalProgress && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <ApprovalProgressBar
                    workflowSteps={workflowSteps}
                    currentStepNumber={tor.currentStepNumber || 0}
                    isFinalApproved={tor.isFinalApproved || false}
                    variant="detailed"
                  />
                </div>
              )}

              {showApprovalHistory && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <ApprovalHistoryTimeline history={tor.history} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
