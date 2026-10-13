// src/app/(main)/admin/positions/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PositionsListPage() {
  const positions = await prisma.position.findMany({
    include: { bidang: true },
    orderBy: [{ bidangId: "asc" }, { levelOrder: "asc" }],
  });

  return (
    <div className="min-h-screen neu-bg text-white px-6 py-10 md:px-12">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back to Admin */}
        <div className="mb-2">
          <Link
            href="/admin"
            className="neu-btn px-3.5 py-1.5 inline-flex items-center gap-2 text-xs text-gray-300 hover:text-[#42ff6b] transition"
          >
            <span className="text-lg leading-none">←</span>
            <span>Kembali ke Panel Admin</span>
          </Link>
        </div>

        <header className="neu-card p-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Master Jabatan</h1>
            <p className="text-xs text-gray-300 mt-1">
              Kelola daftar jabatan yang terkait dengan bidang dan user.
            </p>
          </div>

          <Link
            href="/admin/positions/new"
            className="neu-btn-accent px-4 py-2 text-xs font-semibold transition"
          >
            + Tambah Jabatan
          </Link>
        </header>

        <section className="neu-card p-5 md:p-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Daftar Jabatan</h2>
            <span className="neu-inset-sm px-3 py-1 text-xs text-gray-300">
              Total: {positions.length} jabatan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase text-gray-400">
                  <th className="py-3 pr-4 text-left">ID</th>
                  <th className="py-3 pr-4 text-left">Nama</th>
                  <th className="py-3 pr-4 text-left">Kode</th>
                  <th className="py-3 pr-4 text-left">Bidang</th>
                  <th className="py-3 pr-4 text-left">Global</th>
                  <th className="py-3 pr-4 text-left">Level</th>
                  <th className="py-3 pr-4 text-left">Status</th>
                  <th className="py-3 pr-0 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition"
                  >
                    <td className="py-3 pr-4 text-xs text-gray-400">#{p.id}</td>
                    <td className="py-3 pr-4 text-sm font-medium">{p.name}</td>
                    <td className="py-3 pr-4 text-xs text-gray-300">
                      {p.code || "-"}
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-300">
                      {p.isGlobal ? "—" : p.bidang?.name ?? "-"}
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {p.isGlobal ? (
                        <span className="inline-flex rounded-full bg-[#42ff6b] px-2.5 py-0.5 text-[10px] font-semibold text-black">
                          GLOBAL
                        </span>
                      ) : (
                        <span className="inline-flex neu-inset-sm px-2.5 py-0.5 text-[10px] text-gray-300">
                          BIDANG
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-200">
                      {p.levelOrder ?? "-"}
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {p.isActive ? (
                        <span className="inline-flex neu-inset-sm px-2.5 py-0.5 text-[10px] font-semibold text-[#42ff6b]">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex neu-inset-sm px-2.5 py-0.5 text-[10px] text-gray-400">
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-0 text-xs">
                      <Link
                        href={`/admin/positions/${p.id}`}
                        className="neu-btn px-3 py-1 text-xs text-[#42ff6b] inline-block"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}

                {positions.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-6 text-center text-sm text-gray-400"
                    >
                      Belum ada jabatan terdaftar.
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
