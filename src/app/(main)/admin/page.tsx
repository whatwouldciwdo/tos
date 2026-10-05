// src/app/(main)/admin/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Shield, UserPlus } from "lucide-react";

export default async function AdminPage() {
  const users = await prisma.user.findMany({
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
  });

  return (
    <div className="min-h-screen bg-[#262626] text-white px-6 py-10 md:px-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Super Admin Panel</h1>
            <p className="text-sm text-gray-300">
              Kelola akun, jabatan, bidang, hak akses pengguna, dan audit log sistem.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end items-center gap-3 text-xs">
              <Link
                href="/admin/logs"
                className="rounded-full bg-[#42ff6b]/20 border border-[#42ff6b] px-3.5 py-1.5 text-xs text-[#42ff6b] hover:bg-[#42ff6b] hover:text-black font-semibold transition flex items-center gap-1.5 shadow-sm"
              >
                <Shield className="w-3.5 h-3.5" />
                Audit Log Login
              </Link>
              <Link
                href="/admin/bidang"
                className="text-[#42ff6b] hover:underline"
              >
                Master Bidang
              </Link>
              <Link
                href="/admin/positions"
                className="text-[#42ff6b] hover:underline"
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
                className="rounded-full bg-[#42ff6b] px-4 py-2 text-xs font-semibold text-black hover:bg-[#39e05d] transition flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Tambah User
              </Link>
            </div>
          </div>
        </header>

        <section className="bg-[#1f1f1f] border border-[#42ff6b]/40 rounded-2xl p-4 md:p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Daftar Akun Pengguna</h2>
            <span className="text-xs text-gray-400">
              Total: {users.length} user
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#42ff6b]/40 text-xs uppercase text-gray-300">
                  <th className="py-2 pr-4 text-left">ID</th>
                  <th className="py-2 pr-4 text-left">Nama</th>
                  <th className="py-2 pr-4 text-left">Username (Login)</th>
                  <th className="py-2 pr-4 text-left">Email</th>
                  <th className="py-2 pr-4 text-left">Jabatan</th>
                  <th className="py-2 pr-4 text-left">Bidang</th>
                  <th className="py-2 pr-4 text-left">Roles</th>
                  <th className="py-2 pr-4 text-left">Super Admin</th>
                  <th className="py-2 pr-0 text-left">Aksi</th>
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
                      className="border-b border-white/5 last:border-0 hover:bg-white/5 transition"
                    >
                      <td className="py-2 pr-4 align-top text-xs text-gray-300">
                        #{user.id}
                      </td>
                      <td className="py-2 pr-4 align-top">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-gray-400">
                          {user.isActive ? "Active" : "Inactive"}
                        </div>
                      </td>
                      <td className="py-2 pr-4 align-top">
                        {user.username ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-semibold bg-[#42ff6b]/10 text-[#42ff6b] border border-[#42ff6b]/30">
                            @{user.username}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 italic">- belum diset -</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 align-top text-xs text-gray-200">
                        {user.email}
                      </td>
                      <td className="py-2 pr-4 align-top text-xs">
                        {user.position?.name ?? "-"}
                      </td>
                      <td className="py-2 pr-4 align-top text-xs text-gray-300">
                        {user.position?.bidang?.name ?? "-"}
                      </td>
                      <td className="py-2 pr-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {roles && roles.length > 0 ? (
                            roles.map((role) => (
                              <span
                                key={role}
                                className="px-2 py-0.5 rounded-full border border-[#42ff6b]/60 text-[10px] uppercase tracking-wide"
                              >
                                {role.replace(/_/g, " ")}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4 align-top text-xs">
                        {user.isSuperAdmin ? (
                          <span className="inline-flex items-center rounded-full bg-[#42ff6b] px-2 py-0.5 text-[10px] font-semibold text-black">
                            YES
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-0 align-top text-xs">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-[#42ff6b] hover:underline"
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
