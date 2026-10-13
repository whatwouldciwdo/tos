"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type BidangFormProps = {
  mode: "create" | "edit";
  initialData?: {
    id?: number;
    name: string;
    code: string;
    isActive: boolean;
  };
};

export default function BidangForm({ mode, initialData }: BidangFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [code, setCode] = useState(initialData?.code ?? "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = mode === "edit";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!name || !code) {
        setError("Nama dan kode wajib diisi.");
        setLoading(false);
        return;
      }

      const payload = { name, code, isActive };

      let url = "/api/admin/bidang";
      let method: "POST" | "PUT" = "POST";

      if (isEdit && initialData?.id) {
        url = `/api/admin/bidang/${initialData.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Terjadi kesalahan saat menyimpan bidang.");
        setLoading(false);
        return;
      }

      router.push("/admin/bidang");
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-gray-300">Nama Bidang</label>
          <input
            type="text"
            className="w-full neu-inset px-3.5 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#42ff6b]/50 placeholder:text-gray-400"
            style={{ color: "#ffffff" }}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Bidang Outage"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-gray-300">Kode</label>
          <input
            type="text"
            className="w-full neu-inset px-3.5 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#42ff6b]/50 placeholder:text-gray-400"
            style={{ color: "#ffffff" }}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Contoh: OUTAGE"
          />
        </div>
      </div>

      <div className="flex gap-6 text-xs text-gray-200">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded accent-[#42ff6b]"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span>Active</span>
        </label>
      </div>

      {error && (
        <div className="neu-inset-sm px-3.5 py-2.5 border border-red-500/30">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="neu-btn-accent rounded-xl px-6 py-2.5 text-xs font-semibold transition disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Bidang"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/bidang")}
          className="neu-btn rounded-xl px-6 py-2.5 text-xs text-gray-200 transition"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
