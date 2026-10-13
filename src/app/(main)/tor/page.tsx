import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import TorListItem from "./TorListItem";
import { cleanPrisma } from "@/lib/prisma-clean";
import DashboardStats from "./components/DashboardStats";
import Sidebar from "../components/Sidebar";
import { PlusCircle, FileText, CheckCircle } from "lucide-react";

type PageProps = {
  searchParams?: Promise<{
    view?: string;
  }>;
};

export default async function TorListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionUser = await getCurrentUser();
  const view = params?.view === "approve" ? "approve" : "mine";

  // Ambil data user lengkap
  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      positionId: true,
      isSuperAdmin: true,
      position: {
        select: {
          name: true,
          bidangId: true,
          bidang: {
            select: {
              name: true,
            },
          },
          positionRoles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  const hasSuperAdminRole = dbUser?.position?.positionRoles?.some(
    (pr) => pr.role?.name === "SUPER_ADMIN"
  );
  const isSuperAdmin = Boolean(dbUser?.isSuperAdmin || hasSuperAdminRole);
  const userName = dbUser?.name || "User";
  const positionName = dbUser?.position?.name || "-";
  const bidangName = dbUser?.position?.bidang?.name || "-";

  let torList: any[] = [];
  let stats = {
    total: 0,
    pending: 0,
    drafts: 0,
    completed: 0,
  };

  if (view === "mine") {
    // === TOR SAYA ===
    const whereClause = isSuperAdmin
      ? {}
      : { creatorUserId: sessionUser.id };

    torList = await prisma.tor.findMany({
      where: whereClause,
      include: {
        bidang: true,
        creator: {
          include: {
            position: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats for creator's TORs
    stats.total = torList.length;
    stats.drafts = torList.filter((t) => t.statusStage === "DRAFT").length;
    stats.pending = torList.filter(
      (t) => t.statusStage !== "DRAFT" && !t.isFinalApproved
    ).length;
    stats.completed = torList.filter((t) => t.isFinalApproved).length;
  } else {
    // === TOR YANG PERLU SAYA APPROVE ===

    if (!isSuperAdmin && !dbUser?.positionId) {
      torList = [];
    } else {
      // Get accessible bidang IDs for this position (cross-bidang access)
      const accessibleBidangs = await prisma.positionBidangAccess.findMany({
        where: { positionId: dbUser!.positionId! },
        select: { bidangId: true },
      });

      // Determine which bidangs this user can approve
      const bidangIds: number[] = accessibleBidangs.length > 0
        ? accessibleBidangs.map(a => a.bidangId)
        : dbUser.position?.bidangId
          ? [dbUser.position.bidangId]
          : [];

      // Get workflows for ALL accessible bidangs
      const workflows = await prisma.workflow.findMany({
        where: bidangIds.length > 0
          ? { bidangId: { in: bidangIds } }
          : {},
        include: {
          steps: {
            where: isSuperAdmin
              ? {}
              : { positionId: dbUser!.positionId! },
          },
        },
      });

      const approveableStepNumbers = new Set<number>();
      workflows.forEach((wf) => {
        wf.steps.forEach((step) => approveableStepNumbers.add(step.stepNumber));
      });

      if (approveableStepNumbers.size > 0 || isSuperAdmin) {
        torList = await prisma.tor.findMany({
          where: {
            statusStage: { not: "DRAFT" },
            isFinalApproved: false,

            ...(isSuperAdmin
              ? {}
              : {
                  currentStepNumber: {
                    in: Array.from(approveableStepNumbers),
                  },
                }),
          },

          include: {
            bidang: true,
            creator: {
              include: {
                position: true,
              },
            },
          },

          orderBy: { createdAt: "desc" },
        });

        // Calculate stats for pending approvals
        stats.total = torList.length;
        stats.pending = torList.length; // All are pending in this view
        stats.drafts = 0;
        stats.completed = 0;
      }
    }
  }

  // Get workflow steps for each unique bidang
  const uniqueBidangIds = [...new Set(torList.map((t) => t.bidangId))];
  const workflows = await prisma.workflow.findMany({
    where: {
      bidangId: { in: uniqueBidangIds },
    },
    include: {
      steps: {
        orderBy: { stepNumber: "asc" },
        include: {
          position: true,
        },
      },
    },
  });

  // Create a map of bidangId -> workflow steps
  const workflowMap: Record<number, any[]> = {};
  workflows.forEach((workflow) => {
    workflowMap[workflow.bidangId] = workflow.steps.map((step) => ({
      stepNumber: step.stepNumber,
      label: step.label,
      statusStage: step.statusStage,
      positionName: step.position?.name,
    }));
  });

  // ⭐ FIX: convert semua Decimal → number sebelum dikirim ke Client Component
  const torListSafe = cleanPrisma(torList);

  // Get current date for header
  const now = new Date();
  const dayName = now.toLocaleDateString("id-ID", { weekday: "long" });
  const dayNumber = now.getDate();
  const monthName = now
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const year = now.getFullYear();

  return (
    <div className="min-h-screen flex bg-[#262626] text-white">
      {/* Sidebar */}
      <Sidebar
        userName={userName}
        userEmail={dbUser?.email || ""}
        userUsername={dbUser?.username || ""}
        userPosition={positionName}
        userBidang={bidangName}
        isSuperAdmin={isSuperAdmin}
        canCreate={true}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col px-8 md:px-16 py-10 transition-all duration-300">
        {/* Welcome Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-1.5 bg-[#42ff6b] rounded-full" />
              <span className="text-lg">Selamat Datang,</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-semibold leading-snug">
                {userName}
                <br />
                {positionName}
              </h1>
              <p className="text-sm text-gray-300">{bidangName}</p>
            </div>
          </div>

          <div className="text-right leading-tight text-xl md:text-2xl font-semibold">
            <div>
              {dayName}, {dayNumber}
            </div>
            <div>{monthName}</div>
            <div>{year}</div>
          </div>
        </div>

        {/* TOR Dashboard Section */}
        <div className="space-y-6 flex-1">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">TOR Dashboard</h2>
              <p className="text-gray-400 mt-1 text-sm">
                {view === "mine"
                  ? "Manage your Terms of Reference documents"
                  : "Review TORs pending your approval"}
              </p>
            </div>

            <Link
              href="/tor/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#42ff6b] text-black rounded-lg hover:bg-[#38e05c] transition-colors font-medium shadow-lg shadow-[#42ff6b]/20"
            >
              <PlusCircle size={20} />
              Create New TOR
            </Link>
          </div>

          {/* Statistics */}
          <DashboardStats stats={stats} />

          {/* Tabs filter */}
          <div className="bg-[#1f1f1f] rounded-lg border border-[#333] p-1.5 inline-flex gap-1">
            <Link
              href="/tor"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                view === "mine"
                  ? "bg-[#42ff6b] text-black shadow-sm"
                  : "text-gray-300 hover:bg-[#2a2a2a]"
              }`}
            >
              <FileText size={16} />
              My TORs
            </Link>

            <Link
              href="/tor?view=approve"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                view === "approve"
                  ? "bg-[#42ff6b] text-black shadow-sm"
                  : "text-gray-300 hover:bg-[#2a2a2a]"
              }`}
            >
              <CheckCircle size={16} />
              Pending Approvals
            </Link>
          </div>

          {/* List TOR */}
          <div className="space-y-4 pb-10">
            {torListSafe.length > 0 ? (
              torListSafe.map((tor) => (
                <TorListItem
                  key={tor.id}
                  tor={tor}
                  isCreator={tor.creatorUserId === sessionUser.id}
                  view={view as "mine" | "approve"}
                  workflowSteps={workflowMap[tor.bidangId] || []}
                />
              ))
            ) : (
              <div className="bg-[#1f1f1f] border border-[#333] rounded-xl p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-xl font-semibold mb-2">
                    {view === "mine" ? "No TORs Yet" : "No Pending Approvals"}
                  </h3>
                  <p className="text-gray-400 mb-6 text-sm">
                    {view === "mine"
                      ? "Get started by creating your first Term of Reference document."
                      : "You don't have any TORs awaiting your approval at the moment."}
                  </p>
                  {view === "mine" && (
                    <Link
                      href="/tor/create"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#42ff6b] text-black rounded-lg hover:bg-[#38e05c] transition-colors font-medium"
                    >
                      <PlusCircle size={20} />
                      Create Your First TOR
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
