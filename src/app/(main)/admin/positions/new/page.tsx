// src/app/(main)/admin/positions/new/page.tsx
import { prisma } from "@/lib/prisma";
import PositionForm, { type BidangOption } from "../PositionForm";

export default async function NewPositionPage() {
  const bidangList = await prisma.bidang.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  const bidangOptions: BidangOption[] = bidangList.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return (
    <div className="min-h-screen neu-bg text-white px-6 py-10 md:px-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="neu-card p-6 space-y-1">
          <h1 className="text-2xl font-semibold text-white">Tambah Jabatan</h1>
          <p className="text-xs text-gray-300">
            Form ini hanya dapat diakses oleh Super Admin.
          </p>
        </header>

        <section className="neu-card p-6 md:p-8">
          <PositionForm mode="create" bidangOptions={bidangOptions} />
        </section>
      </div>
    </div>
  );
}
