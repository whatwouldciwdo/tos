// src/app/(main)/admin/bidang/new/page.tsx
import BidangForm from "../BidangForm";

export default function NewBidangPage() {
  return (
    <div className="min-h-screen neu-bg text-white px-6 py-10 md:px-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="neu-card p-6 space-y-1">
          <h1 className="text-2xl font-semibold text-white">Tambah Bidang</h1>
          <p className="text-xs text-gray-300">
            Form ini hanya dapat diakses oleh Super Admin.
          </p>
        </header>

        <section className="neu-card p-6 md:p-8">
          <BidangForm mode="create" />
        </section>
      </div>
    </div>
  );
}
