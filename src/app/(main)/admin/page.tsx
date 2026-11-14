// src/app/(main)/admin/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Shield, UserPlus } from "lucide-react";
import AdminTorCompletionSection, {
  AdminTorItem,
  AdminTorStats,
} from "./components/AdminTorCompletionSection";

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;

  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)} Menit`;
  }
  if (days === 0) {
    return minutes > 0 ? `${hours} Jam ${minutes} Mnt` : `${hours} Jam`;
  }
  const exactHours = (ms / (1000 * 60 * 60)).toFixed(1);
  if (remHours === 0 && minutes === 0) {
    return `${days} Hari (${exactHours} Jam)`;
  }
  return `${days} Hari ${remHours} Jam (${exactHours} Jam)`;
}

function formatDateWIB(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d
    .toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/\./g, ":");
}

export default async function AdminPage() {
  const [users, tors] = await Promise.all([
    prisma.user.findMany({
      orderBy: { id: "asc" },
      include: {
        position: {
          include: {
            bidang: true,
            positionRoles: {
              include: { role: true },
            },
          },
        },
      },
    }),
    prisma.tor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        bidang: true,
        creator: {
          include: {
            position: true,
          },
        },
        history: {
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  ]);

  // Compute TOR Items & Duration
  const torItems: AdminTorItem[] = tors.map((tor) => {
    const submitEvent = tor.history.find((h) => h.action === "SUBMIT");
    const startTimeDate = submitEvent
      ? new Date(submitEvent.createdAt)
      : new Date(tor.createdAt);

    const finalApproveEvent = tor.history
      .filter((h) => h.action === "APPROVE")
      .pop();
    const isCompleted = Boolean(tor.isFinalApproved);

    const completedDate =
      isCompleted && finalApproveEvent
        ? new Date(finalApproveEvent.createdAt)
        : isCompleted
        ? new Date(tor.updatedAt)
        : null;

    const durationMs =
      isCompleted && completedDate
        ? Math.max(0, completedDate.getTime() - startTimeDate.getTime())
        : null;

    const durationFormatted =
      durationMs !== null
        ? formatDuration(durationMs)
        : formatDuration(Date.now() - startTimeDate.getTime());

    return {
      id: tor.id,
      number: tor.number,
      title: tor.title,
      bidangName: tor.bidang?.name || "-",
      creatorName: tor.creator?.name || "-",
      creatorPosition: tor.creator?.position?.name || "-",
      statusStage: tor.statusStage,
      isFinalApproved: tor.isFinalApproved,
      createdAt: tor.createdAt.toISOString(),
      startTime: formatDateWIB(startTimeDate),
      completedTime: completedDate ? formatDateWIB(completedDate) : null,
      durationMs,
      durationFormatted,
      isCompleted,
    };
  });

  // Calculate Aggregated Stats
  const completedDurations = torItems
    .filter((t) => t.isCompleted && t.durationMs !== null)
    .map((t) => t.durationMs!);

  const avgMs =
    completedDurations.length > 0
      ? completedDurations.reduce((acc, curr) => acc + curr, 0) /
        completedDurations.length
      : 0;

  const stats: AdminTorStats = {
    total: tors.length,
    completed: tors.filter((t) => t.isFinalApproved).length,
    inProgress: tors.filter(
      (t) => t.statusStage !== "DRAFT" && !t.isFinalApproved
    ).length,
    drafts: tors.filter((t) => t.statusStage === "DRAFT").length,
    avgDurationFormatted: avgMs > 0 ? formatDuration(avgMs) : "-",
  };

  return (
    <div className="min-h-screen neu-bg text-white px-6 py-10 md:px-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="neu-card p-6 md:p-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Super Admin Panel</h1>
            <p className="text-sm text-gray-300 mt-1">
              Kelola TOR, durasi penyelesaian, akun pengguna, jabatan, bidang, dan audit log sistem.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Link
                href="/admin/logs"
                className="neu-btn px-3.5 py-2 text-xs text-[#42ff6b] font-semibold flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                Audit Log Login
              </Link>
              <Link
                href="/admin/bidang"
                className="neu-btn px-3.5 py-2 text-xs text-gray-200 hover:text-[#42ff6b] font-medium"
              >
                Master Bidang
              </Link>
              <Link
                href="/admin/positions"
                className="neu-btn px-3.5 py-2 text-xs text-gray-200 hover:text-[#42ff6b] font-medium"
              >
                Master Jabatan
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Kelola akun & hak akses pengguna.
              </span>
              <Link
                href="/admin/users/new"
                className="neu-btn-accent px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Tambah User
              </Link>
            </div>
          </div>
        </header>

        {/* Waktu TOR Selesai Sesuai Judul */}
        <AdminTorCompletionSection tors={torItems} />

        {/* User Management Section */}
        <section className="neu-card p-5 md:p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Daftar Akun Pengguna</h2>
            <span className="neu-inset-sm px-3 py-1 text-xs text-gray-300">
              Total: {users.length} user
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase text-gray-400">
                  <th className="py-3 pr-4 text-left">ID</th>
                  <th className="py-3 pr-4 text-left">Nama</th>
                  <th className="py-3 pr-4 text-left">Username (Login)</th>
                  <th className="py-3 pr-4 text-left">Email</th>
                  <th className="py-3 pr-4 text-left">Jabatan</th>
                  <th className="py-3 pr-4 text-left">Bidang</th>
                  <th className="py-3 pr-4 text-left">Roles</th>
                  <th className="py-3 pr-4 text-left">Super Admin</th>
                  <th className="py-3 pr-0 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roles = user.position?.positionRoles?.map(
                    (pr) => pr.role.name
                  );

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition"
                    >
                      <td className="py-3 pr-4 align-top text-xs text-gray-400">
                        #{user.id}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <div className="font-medium text-white">{user.name}</div>
                        <div className="text-xs text-gray-400">
                          {user.isActive ? "Active" : "Inactive"}
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        {user.username ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 neu-inset-sm font-mono text-xs font-semibold text-[#42ff6b]">
                            @{user.username}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 italic">
                            - belum diset -
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 align-top text-xs text-gray-300">
                        {user.email}
                      </td>
                      <td className="py-3 pr-4 align-top text-xs text-gray-200">
                        {user.position?.name ?? "-"}
                      </td>
                      <td className="py-3 pr-4 align-top text-xs text-gray-300">
                        {user.position?.bidang?.name ?? "-"}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {roles && roles.length > 0 ? (
                            roles.map((role) => (
                              <span
                                key={role}
                                className="px-2.5 py-0.5 neu-inset-sm text-[10px] text-[#42ff6b] uppercase tracking-wide"
                              >
                                {role.replace(/_/g, " ")}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-top text-xs">
                        {user.isSuperAdmin ? (
                          <span className="inline-flex items-center rounded-full bg-[#42ff6b] px-2.5 py-0.5 text-[10px] font-bold text-black">
                            YES
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-0 align-top text-xs">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="neu-btn px-3 py-1 text-xs text-[#42ff6b] inline-block"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-6 text-center text-sm text-gray-400"
                    >
                      Belum ada user terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
