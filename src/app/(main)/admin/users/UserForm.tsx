"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export type PositionOption = {
  id: number;
  label: string;
};

type UserFormProps = {
  mode: "create" | "edit";
  positions: PositionOption[];
  initialData?: {
    id?: number;
    name: string;
    username: string;
    email: string;
    positionId: number | null;
    isSuperAdmin: boolean;
    isActive: boolean;
  };
};

export default function UserForm({ mode, positions, initialData }: UserFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [username, setUsername] = useState(initialData?.username ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [password, setPassword] = useState("");
  const [positionId, setPositionId] = useState<number | "">(
    initialData?.positionId ?? ""
  );
  const [isSuperAdmin, setIsSuperAdmin] = useState(
    initialData?.isSuperAdmin ?? false
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
      if (!name || !username || !email || !positionId) {
        setError("Nama, username, email, dan jabatan wajib diisi.");
        setLoading(false);
        return;
      }

      const payload: any = {
        name,
        username,
        email,
        positionId: Number(positionId),
        isSuperAdmin,
        isActive,
      };

      if (password.trim()) {
        payload.password = password;
      }

      let url = "/api/admin/users";
      let method: "POST" | "PUT" = "POST";

      if (isEdit && initialData?.id) {
        url = `/api/admin/users/${initialData.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Terjadi kesalahan saat menyimpan user.");
        setLoading(false);
        return;
      }

      router.push("/admin");
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
          <label className="text-xs text-gray-300">Nama</label>
          <input
            type="text"
            className="w-full neu-inset px-3.5 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#42ff6b]/50 placeholder:text-gray-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama lengkap"
            style={{ color: "#ffffff" }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-gray-300">Username (untuk login)</label>
          <input
            type="text"
            className="w-full neu-inset px-3.5 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#42ff6b]/50 placeholder:text-gray-400"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            style={{ color: "#ffffff" }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-gray-300">Email (untuk notifikasi)</label>
          <input
            type="email"
            className="w-full neu-inset px-3.5 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#42ff6b]/50 placeholder:text-gray-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@plnindonesiapower.com"
            style={{ color: "#ffffff" }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-gray-300">
            Password {isEdit && <span className="text-gray-400">(kosongkan jika tidak diubah)</span>}
          </label>
          <input
            type="password"
            className="w-full neu-inset px-3.5 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#42ff6b]/50 placeholder:text-gray-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? "•••••••" : "Minimal 6 karakter"}
            style={{ color: "#ffffff" }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-gray-300">Jabatan</label>
          <select
            className="w-full neu-inset px-3.5 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#42ff6b]/50 bg-[#1f2227]"
            value={positionId}
            onChange={(e) =>
              setPositionId(e.target.value ? Number(e.target.value) : "")
            }
            style={{ color: "#ffffff" }}
          >
            <option value="" disabled>
              Pilih jabatan
            </option>
            {positions.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 text-xs text-gray-200">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded accent-[#42ff6b]"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span>Active</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded accent-[#42ff6b]"
            checked={isSuperAdmin}
            onChange={(e) => setIsSuperAdmin(e.target.checked)}
          />
          <span>Super Admin</span>
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
          {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat User"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="neu-btn rounded-xl px-6 py-2.5 text-xs text-gray-200 transition"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
