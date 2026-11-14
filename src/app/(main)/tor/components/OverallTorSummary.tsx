"use client";

import {
  FileText,
  CheckCircle2,
  Clock,
  FileEdit,
  Timer,
  ShieldAlert,
} from "lucide-react";

export interface OverallTorStats {
  total: number;
  completed: number;
  inProgress: number;
  drafts: number;
  avgDurationFormatted: string;
}

interface OverallTorSummaryProps {
  stats: OverallTorStats;
}

export default function OverallTorSummary({ stats }: OverallTorSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#42ff6b]">
            <FileText size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-wide">
                Ringkasan Jumlah TOR Keseluruhan
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#42ff6b]/15 text-[#42ff6b] border border-[#42ff6b]/30">
                <ShieldAlert size={11} />
                ADMIN ONLY
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Statistik agregat seluruh dokumen TOR dari semua bidang di sistem.
            </p>
          </div>
        </div>

        <div className="neu-inset-sm px-3.5 py-1.5 self-start sm:self-auto rounded-lg">
          <span className="text-xs text-gray-300">
            Total Sistem: <strong className="text-[#42ff6b] font-bold">{stats.total} Dokumen</strong>
          </span>
        </div>
      </div>

      {/* Grid Cards */}
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
  );
}
