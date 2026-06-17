"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export type BidangOption = {
  id: number;
  name: string;
};

type PositionFormProps = {
  mode: "create" | "edit";
  bidangOptions: BidangOption[];
  initialData?: {
    id?: number;
    name: string;
    code: string | null;
    bidangId: number | null;
    isGlobal: boolean;
    levelOrder: number | null;
    isActive: boolean;
  };
};

export default function PositionForm({
  mode,
  bidangOptions,
  initialData,
}: PositionFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [code, setCode] = useState(initialData?.code ?? "");
  const [isGlobal, setIsGlobal] = useState(initialData?.isGlobal ?? false);
  const [bidangId, setBidangId] = useState<number | "">(
    initialData?.bidangId ?? ""
  );
  const [levelOrder, setLevelOrder] = useState(
    initialData?.levelOrder != null ? String(initialData.levelOrder) : ""
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = mode === "edit";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!name) {
        setError("Nama jabatan wajib diisi.");
        setLoading(false);
        return;
      }

      const payload: any = {
        name,
        code: code || null,
        isGlobal,
        isActive,
      };

      if (!isGlobal && bidangId) {
        payload.bidangId = Number(bidangId);
      } else {
        payload.bidangId = null;
      }

      if (levelOrder !== "") {
        payload.levelOrder = Number(levelOrder);
      }

      let url = "/api/admin/positions";
      let method: "POST" | "PUT" = "POST";

      if (isEdit && initialData?.id) {
        url = `/api/admin/positions/${initialData.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Terjadi kesalahan saat menyimpan jabatan.");
        setLoading(false);
        return;
      }

      router.push("/admin/positions");
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-gray-300">Nama Jabatan</label>
          <input
            type="text"
            className="w-full rounded-md border border-[#42ff6b]/60 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#42ff6b] focus:border-transparent"
            style={{ color: 'white' }}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Officer Outage"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-300">Kode (opsional)</label>
          <input
            type="text"
            className="w-full rounded-md border border-[#42ff6b]/60 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#42ff6b] focus:border-transparent"
            style={{ color: 'white' }}
            value={code || ""}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Kode internal"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-gray-300">Bidang</label>
          <select
            className="w-full rounded-md border border-[#42ff6b]/60 bg-[#262626] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#42ff6b] focus:border-transparent"
            style={{ color: 'white' }}
            required
            value={bidangId ?? ""}
            onChange={(e) =>
              setBidangId(e.target.value ? Number(e.target.value) : "")
            }
            disabled={isGlobal}
          >
            <option value="">-- Pilih bidang --</option>
            {bidangOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-gray-400 mt-1">
            Jika jabatan global (mis. Pengadaan), centang &quot;Global&quot; di
            bawah.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-300">Level Order (opsional)</label>
          <input
            type="number"
            className="w-full rounded-md border border-[#42ff6b]/60 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#42ff6b] focus:border-transparent"
            style={{ color: 'white' }}
            value={levelOrder ?? ""}
            onChange={(e) =>
              setLevelOrder(e.target.value)
            }
            placeholder="Urutan di tampilan (angka kecil = lebih bawah)"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 text-xs text-gray-200">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border border-[#42ff6b]/60 bg-transparent"
            checked={isGlobal}
            onChange={(e) => setIsGlobal(e.target.checked)}
          />
          <span>Global (tidak terikat bidang)</span>
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border border-[#42ff6b]/60 bg-transparent"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span>Active</span>
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[#42ff6b] px-6 py-2 text-xs font-semibold text-black hover:bg-[#39e05d] transition disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Jabatan"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/positions")}
          className="rounded-full border border-gray-500 px-6 py-2 text-xs text-gray-200 hover:bg-white/5 transition"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
