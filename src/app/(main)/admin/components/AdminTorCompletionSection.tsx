"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Clock,
  FileEdit,
  Timer,
  Search,
  ExternalLink,
  Building2,
  Calendar,
  Zap,
  Filter,
} from "lucide-react";

export interface AdminTorItem {
  id: number;
  number: string | null;
  title: string;
  bidangName: string;
  creatorName: string;
  creatorPosition: string;
  statusStage: string;
  isFinalApproved: boolean;
  createdAt: string;
  startTime: string;
  completedTime: string | null;
  durationMs: number | null;
  durationFormatted: string;
  isCompleted: boolean;
}

export interface AdminTorStats {
  total: number;
  completed: number;
  inProgress: number;
  drafts: number;
  avgDurationFormatted: string;
}

interface AdminTorCompletionSectionProps {
  stats: AdminTorStats;
  tors: AdminTorItem[];
}

export default function AdminTorCompletionSection({
  stats,
  tors,
}: AdminTorCompletionSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"completed" | "all" | "inProgress">("completed");

  const filteredTors = useMemo(() => {
    return tors.filter((tor) => {
      // Tab filter
      if (activeTab === "completed" && !tor.isCompleted) return false;
      if (activeTab === "inProgress" && (tor.isCompleted || tor.statusStage === "DRAFT")) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = tor.title.toLowerCase().includes(q);
      const matchNumber = (tor.number || "").toLowerCase().includes(q);
      const matchCreator = tor.creatorName.toLowerCase().includes(q);
      const matchBidang = tor.bidangName.toLowerCase().includes(q);
      return matchTitle || matchNumber || matchCreator || matchBidang;
    });
  }, [tors, activeTab, searchQuery]);

  return (
    <div className="space-y-8">
      {/* ======================================================== */}
      {/* 1. STATISTIK JUMLAH TOR KESELURUHAN                       */}
      {/* ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#42ff6b]" />
              Ringkasan Jumlah TOR Keseluruhan
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Statistik agregat seluruh dokumen TOR yang tercatat di sistem.
            </p>
          </div>
          <span className="neu-inset-sm px-3 py-1 text-xs font-semibold text-[#42ff6b]">
            Total: {stats.total} TOR
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total TOR */}
          <div className="neu-card-sm p-4 relative overflow-hidden group hover:border-blue-500/40 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Total TOR
              </span>
              <div className="w-8 h-8 rounded-full neu-inset-sm flex items-center justify-center text-blue-400">
                <FileText size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.total}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Keseluruhan Dokumen</p>
          </div>

          {/* Card 2: Selesai / Final Approved */}
          <div className="neu-card-sm p-4 relative overflow-hidden group hover:border-[#42ff6b]/40 transition border-[#42ff6b]/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#42ff6b] uppercase tracking-wider">
                TOR Selesai
              </span>
              <div className="w-8 h-8 rounded-full neu-inset-sm flex items-center justify-center text-[#42ff6b]">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#42ff6b] tracking-tight">
              {stats.completed}
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1">Final Approved</p>
          </div>

          {/* Card 3: Sedang Proses */}
          <div className="neu-card-sm p-4 relative overflow-hidden group hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Sedang Review
              </span>
              <div className="w-8 h-8 rounded-full neu-inset-sm flex items-center justify-center text-amber-400">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-400 tracking-tight">
              {stats.inProgress}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Tahap Persetujuan</p>
          </div>

          {/* Card 4: Draft */}
          <div className="neu-card-sm p-4 relative overflow-hidden group hover:border-gray-500/40 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Draft
              </span>
              <div className="w-8 h-8 rounded-full neu-inset-sm flex items-center justify-center text-gray-400">
                <FileEdit size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-300 tracking-tight">
              {stats.drafts}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Belum Disubmit</p>
          </div>

          {/* Card 5: Rata-rata Durasi Selesai */}
          <div className="neu-card-sm p-4 relative overflow-hidden col-span-2 sm:col-span-1 group hover:border-purple-500/40 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Rata-rata Selesai
              </span>
              <div className="w-8 h-8 rounded-full neu-inset-sm flex items-center justify-center text-purple-400">
                <Timer size={16} />
              </div>
            </div>
            <div className="text-xl font-bold text-purple-300 tracking-tight">
              {stats.avgDurationFormatted}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Durasi dari Submit</p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. WAKTU TOR SELESAI SESUAI JUDUL                         */}
      {/* ======================================================== */}
      <section className="neu-card p-5 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#42ff6b]" />
                Waktu TOR Selesai Sesuai Judul
              </h2>
              <span className="neu-inset-sm px-2.5 py-0.5 text-xs text-[#42ff6b] font-medium">
                {filteredTors.length} Dokumen
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Daftar durasi waktu mulai pengerjaan/submit sampai persetujuan akhir (Final Approved) untuk setiap judul TOR.
            </p>
          </div>

          {/* Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 neu-inset-sm p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  activeTab === "completed"
                    ? "bg-[#42ff6b] text-black shadow-sm"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                TOR Selesai ({stats.completed})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("inProgress")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  activeTab === "inProgress"
                    ? "bg-amber-400 text-black shadow-sm"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                Dalam Proses ({stats.inProgress})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  activeTab === "all"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                Semua ({stats.total})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul TOR..."
                className="w-full neu-inset-sm pl-9 pr-3 py-2 text-xs text-white placeholder:text-gray-500 rounded-lg outline-none focus:ring-1 focus:ring-[#42ff6b]/50"
              />
            </div>
          </div>
        </div>

        {/* Table of Finished TORs */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="py-3 pr-3 text-left w-12">ID</th>
                <th className="py-3 pr-4 text-left">Judul TOR & Bidang</th>
                <th className="py-3 pr-4 text-left">Pembuat (Creator)</th>
                <th className="py-3 pr-4 text-left">Waktu Dibuat / Submit</th>
                <th className="py-3 pr-4 text-left">Waktu Selesai (Approved)</th>
                <th className="py-3 pr-4 text-left">Durasi Penyelesaian</th>
                <th className="py-3 pr-3 text-left">Status</th>
                <th className="py-3 pr-0 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTors.map((tor) => {
                const isFinished = tor.isCompleted;

                return (
                  <tr
                    key={tor.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition"
                  >
                    {/* ID */}
                    <td className="py-3.5 pr-3 align-top text-xs font-mono text-gray-400">
                      #{tor.id}
                    </td>

                    {/* Judul & Nomor TOR */}
                    <td className="py-3.5 pr-4 align-top max-w-[340px]">
                      <Link
                        href={`/tor/${tor.id}`}
                        className="font-semibold text-white hover:text-[#42ff6b] transition block leading-snug break-words"
                        title={tor.title}
                      >
                        {tor.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 neu-inset-sm text-[10px] font-mono text-gray-300">
                          {tor.number || "DRAFT"}
                        </span>
                        {tor.bidangName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 neu-inset-sm text-[10px] text-[#42ff6b]/90 font-medium">
                            <Building2 size={10} />
                            {tor.bidangName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Creator */}
                    <td className="py-3.5 pr-4 align-top">
                      <div className="text-xs font-medium text-gray-100">
                        {tor.creatorName}
                      </div>
                      <div
                        className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[200px]"
                        title={tor.creatorPosition}
                      >
                        {tor.creatorPosition || "-"}
                      </div>
                    </td>

                    {/* Waktu Submit */}
                    <td className="py-3.5 pr-4 align-top text-xs text-gray-300">
                      <div className="flex items-center gap-1.5 text-gray-200 font-medium">
                        <Calendar size={12} className="text-blue-400 shrink-0" />
                        {tor.startTime}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">WIB</div>
                    </td>

                    {/* Waktu Selesai */}
                    <td className="py-3.5 pr-4 align-top text-xs">
                      {isFinished && tor.completedTime ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-[#42ff6b] font-medium">
                            <CheckCircle2 size={12} className="shrink-0" />
                            {tor.completedTime}
                          </div>
                          <div className="text-[10px] text-emerald-500/70 mt-0.5">
                            Final Approved (WIB)
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic flex items-center gap-1.5">
                          <Clock size={12} className="text-amber-400 shrink-0" />
                          <span>Belum selesai</span>
                        </div>
                      )}
                    </td>

                    {/* Durasi Waktu Selesai */}
                    <td className="py-3.5 pr-4 align-top">
                      {isFinished ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-card-sm border border-[#42ff6b]/30 bg-[#42ff6b]/10 text-[#42ff6b] rounded-lg">
                          <Zap size={13} className="shrink-0 text-[#42ff6b]" />
                          <span className="font-bold text-xs">
                            {tor.durationFormatted}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 neu-inset-sm text-gray-400 text-xs">
                          <Clock size={11} className="text-amber-400" />
                          <span>Berjalan: {tor.durationFormatted}</span>
                        </div>
                      )}
                    </td>

                    {/* Status Stage */}
                    <td className="py-3.5 pr-3 align-top">
                      {isFinished ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#42ff6b]/20 border border-[#42ff6b]/40 text-[#42ff6b] text-[11px] font-bold">
                          SELESAI
                        </span>
                      ) : tor.statusStage === "DRAFT" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-300 text-[10px] font-medium">
                          DRAFT
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium">
                          {tor.statusStage.replace(/_/g, " ")}
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 pr-0 align-top text-right">
                      <Link
                        href={`/tor/${tor.id}`}
                        className="neu-btn px-3 py-1.5 text-xs text-[#42ff6b] hover:text-white font-medium inline-flex items-center gap-1"
                        title="Buka Dokumen TOR"
                      >
                        <span>Lihat</span>
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filteredTors.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="w-8 h-8 text-gray-500" />
                      <p className="text-sm font-medium">
                        Tidak ada dokumen TOR yang cocok dengan filter.
                      </p>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="neu-btn px-3 py-1 text-xs text-[#42ff6b] mt-1"
                        >
                          Reset Pencarian
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
