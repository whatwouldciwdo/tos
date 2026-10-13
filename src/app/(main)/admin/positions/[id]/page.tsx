// src/app/(main)/admin/positions/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import PositionForm, { type BidangOption } from "../PositionForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPositionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (Number.isNaN(id)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#262626] text-white">
        <p>ID jabatan tidak valid.</p>
      </div>
    );
  }

  const position = await prisma.position.findUnique({
    where: { id },
  });

  if (!position) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#262626] text-white">
        <p>Jabatan tidak ditemukan.</p>
      </div>
    );
  }

  const bidangList = await prisma.bidang.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  const bidangOptions: BidangOption[] = bidangList.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  const initialData = {
    id: position.id,
    name: position.name,
    code: position.code,
    bidangId: position.bidangId,
    isGlobal: position.isGlobal,
    levelOrder: position.levelOrder,
    isActive: position.isActive,
  };

  return (
    <div className="min-h-screen neu-bg text-white px-6 py-10 md:px-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="neu-card p-6 space-y-1">
          <h1 className="text-2xl font-semibold text-white">Edit Jabatan</h1>
          <p className="text-xs text-gray-300">
            Perbarui data jabatan. Perubahan akan mempengaruhi mapping user dan
            workflow.
          </p>
        </header>

        <section className="neu-card p-6 md:p-8">
          <PositionForm
            mode="edit"
            bidangOptions={bidangOptions}
            initialData={initialData}
          />
        </section>
      </div>
    </div>
  );
}
