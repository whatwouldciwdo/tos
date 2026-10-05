// src/app/(main)/admin/logs/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  RotateCcw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  Monitor,
  Laptop,
  Smartphone,
  Globe,
  Clock,
  UserCheck,
  AlertTriangle,
} from "lucide-react";

type LoginLog = {
  id: number;
  userId: number | null;
  username: string;
  name: string | null;
  status: "SUCCESS" | "FAILED";
  ipAddress: string | null;
  userAgent: string | null;
  failReason: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    position?: {
      name: string;
      bidang?: {
        name: string;
      };
    };
  } | null;
};

type Stats = {
  totalFiltered: number;
  totalSuccess: number;
  totalFailed: number;
};

// Helper to format device/browser
function parseUserAgent(ua: string | null) {
  if (!ua) return { browser: "Unknown", os: "Unknown", icon: Globe };

  let os = "Unknown OS";
  let icon = Monitor;

  if (ua.includes("Windows")) {
    os = "Windows";
    icon = Laptop;
  } else if (ua.includes("Mac OS") || ua.includes("Macintosh")) {
    os = "macOS";
    icon = Laptop;
  } else if (ua.includes("Android")) {
    os = "Android";
    icon = Smartphone;
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
    icon = Smartphone;
  } else if (ua.includes("Linux")) {
    os = "Linux";
    icon = Laptop;
  }

  let browser = "Browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";
  else if (ua.includes("PostmanRuntime")) browser = "Postman";

  return { browser, os, icon };
}

// Format local date
function formatDateTime(isoString: string) {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return isoString;
  }
}

// Get standard YYYY-MM-DD string from Date
function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalFiltered: 0,
    totalSuccess: 0,
    totalFailed: 0,
  });

  // Filter States
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [status, setStatus] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [exporting, setExporting] = useState<boolean>(false);

  // Set default to today or past 7 days on mount
  useEffect(() => {
    const today = new Date();
    const past7 = new Date();
    past7.setDate(today.getDate() - 7);
    setStartDate(toDateInputValue(past7));
    setEndDate(toDateInputValue(today));
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (status && status !== "ALL") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Gagal mengambil data audit log");
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Fetch audit logs error:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status, search, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Preset Date Handlers
  const applyPreset = (preset: "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "all") => {
    const now = new Date();
    setPage(1);

    switch (preset) {
      case "today": {
        const d = toDateInputValue(now);
        setStartDate(d);
        setEndDate(d);
        break;
      }
      case "yesterday": {
        const y = new Date();
        y.setDate(now.getDate() - 1);
        const yd = toDateInputValue(y);
        setStartDate(yd);
        setEndDate(yd);
        break;
      }
      case "last7": {
        const p7 = new Date();
        p7.setDate(now.getDate() - 7);
        setStartDate(toDateInputValue(p7));
        setEndDate(toDateInputValue(now));
        break;
      }
      case "last30": {
        const p30 = new Date();
        p30.setDate(now.getDate() - 30);
        setStartDate(toDateInputValue(p30));
        setEndDate(toDateInputValue(now));
        break;
      }
      case "thisMonth": {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(toDateInputValue(firstDay));
        setEndDate(toDateInputValue(now));
        break;
      }
      case "all": {
        setStartDate("");
        setEndDate("");
        break;
      }
    }
  };

  const handleResetFilters = () => {
    const today = new Date();
    const past7 = new Date();
    past7.setDate(today.getDate() - 7);
    setStartDate(toDateInputValue(past7));
    setEndDate(toDateInputValue(today));
    setStatus("ALL");
    setSearch("");
    setPage(1);
    setLimit(25);
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (status && status !== "ALL") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      params.set("exportAll", "true");

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengekspor data");
      const data = await res.json();
      const exportLogs: LoginLog[] = data.logs || [];

      if (exportLogs.length === 0) {
        alert("Tidak ada data untuk diekspor.");
        return;
      }

      // Format CSV
      const headers = [
        "ID",
        "Waktu",
        "Username",
        "Nama User",
        "Email",
        "Jabatan",
        "Bidang",
        "Status",
        "IP Address",
        "User Agent",
        "Keterangan / Alasan Gagal",
      ];

      const rows = exportLogs.map((l) => [
        l.id,
        `"${formatDateTime(l.createdAt)}"`,
        `"${l.username}"`,
        `"${l.name || l.user?.name || "-"}"`,
        `"${l.user?.email || "-"}"`,
        `"${l.user?.position?.name || "-"}"`,
        `"${l.user?.position?.bidang?.name || "-"}"`,
        `"${l.status}"`,
        `"${l.ipAddress || "-"}"`,
        `"${(l.userAgent || "-").replace(/"/g, '""')}"`,
        `"${l.failReason || (l.status === "SUCCESS" ? "Login Berhasil" : "-")}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `audit_log_login_${startDate || "awal"}_sampai_${endDate || "kini"}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
      alert("Terjadi kesalahan saat mengekspor CSV.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#262626] text-white px-6 py-10 md:px-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#42ff6b] transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Panel Admin
              </Link>
            </div>
            <h1 className="text-3xl font-semibold flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#42ff6b]" />
              Audit Log Login
            </h1>
            <p className="text-sm text-gray-300">
              Riwayat dan aktivitas login pengguna dengan filter tanggal dan status.
            </p>
          </div>

          {/* Navigation links & Export */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/bidang"
              className="text-xs text-[#42ff6b] hover:underline"
            >
              Master Bidang
            </Link>
            <span className="text-gray-600">|</span>
            <Link
              href="/admin/positions"
              className="text-xs text-[#42ff6b] hover:underline"
            >
              Master Jabatan
            </Link>
            <span className="text-gray-600">|</span>
            <button
              onClick={handleExportCSV}
              disabled={exporting || loading || logs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#42ff6b] px-4 py-2 text-xs font-semibold text-black hover:bg-[#39e05d] transition disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? "Mengekspor..." : "Ekspor CSV"}
            </button>
          </div>
        </header>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1f1f1f] border border-[#42ff6b]/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Total Percobaan</p>
              <p className="text-2xl font-bold mt-1 text-white">{stats.totalFiltered}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-300">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#1f1f1f] border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-400 uppercase tracking-wider">Login Berhasil</p>
              <p className="text-2xl font-bold mt-1 text-green-400">{stats.totalSuccess}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#1f1f1f] border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-red-400 uppercase tracking-wider">Login Gagal</p>
              <p className="text-2xl font-bold mt-1 text-red-400">{stats.totalFailed}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <section className="bg-[#1f1f1f] border border-[#42ff6b]/40 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-[#42ff6b]">
              <Filter className="w-4 h-4" />
              Filter & Pencarian Audit Log
            </h2>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-gray-400 mr-1 text-[11px]">Preset Tanggal:</span>
              <button
                onClick={() => applyPreset("today")}
                className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-[#42ff6b]/20 hover:text-[#42ff6b] transition text-[11px]"
              >
                Hari Ini
              </button>
              <button
                onClick={() => applyPreset("yesterday")}
                className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-[#42ff6b]/20 hover:text-[#42ff6b] transition text-[11px]"
              >
                Kemarin
              </button>
              <button
                onClick={() => applyPreset("last7")}
                className="px-2.5 py-1 rounded-md bg-[#42ff6b]/10 text-[#42ff6b] border border-[#42ff6b]/30 hover:bg-[#42ff6b]/20 transition text-[11px]"
              >
                7 Hari
              </button>
              <button
                onClick={() => applyPreset("last30")}
                className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-[#42ff6b]/20 hover:text-[#42ff6b] transition text-[11px]"
              >
                30 Hari
              </button>
              <button
                onClick={() => applyPreset("thisMonth")}
                className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-[#42ff6b]/20 hover:text-[#42ff6b] transition text-[11px]"
              >
                Bulan Ini
              </button>
              <button
                onClick={() => applyPreset("all")}
                className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-[#42ff6b]/20 hover:text-[#42ff6b] transition text-[11px]"
              >
                Semua
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
            {/* Start Date */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-xs text-gray-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#42ff6b]" />
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#42ff6b]/40 bg-[#262626] px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#42ff6b] [color-scheme:dark]"
              />
            </div>

            {/* End Date */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-xs text-gray-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#42ff6b]" />
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#42ff6b]/40 bg-[#262626] px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#42ff6b] [color-scheme:dark]"
              />
            </div>

            {/* Status Filter */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs text-gray-300">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#42ff6b]/40 bg-[#262626] px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#42ff6b]"
              >
                <option value="ALL">Semua Status</option>
                <option value="SUCCESS">Berhasil (SUCCESS)</option>
                <option value="FAILED">Gagal (FAILED)</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-xs text-gray-300">Pencarian</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari username, nama, IP..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-[#42ff6b]/40 bg-[#262626] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-[#42ff6b]"
                />
              </div>
            </div>

            {/* Reset Button */}
            <div className="md:col-span-1 flex items-end">
              <button
                onClick={handleResetFilters}
                title="Reset Semua Filter"
                className="w-full flex items-center justify-center gap-1 rounded-lg border border-gray-600 bg-white/5 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset</span>
              </button>
            </div>
          </div>
        </section>

        {/* Logs Table Section */}
        <section className="bg-[#1f1f1f] border border-[#42ff6b]/40 rounded-2xl p-4 md:p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Catatan Aktivitas Login</h2>
              <span className="text-xs text-gray-400">
                Menampilkan {logs.length} dari {stats.totalFiltered} aktivitas
              </span>
            </div>

            {/* Limit selector */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Tampilkan:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border border-gray-600 bg-[#262626] px-2 py-1 text-xs text-white outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#42ff6b]/40 text-xs uppercase text-gray-300">
                  <th className="py-3 pr-4 text-left">Waktu</th>
                  <th className="py-3 pr-4 text-left">Akun (Username)</th>
                  <th className="py-3 pr-4 text-left">Nama User / Jabatan</th>
                  <th className="py-3 pr-4 text-left">Status</th>
                  <th className="py-3 pr-4 text-left">IP Address</th>
                  <th className="py-3 pr-4 text-left">Perangkat / Browser</th>
                  <th className="py-3 pr-0 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#42ff6b] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Memuat audit log login...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Clock className="w-8 h-8 text-gray-600" />
                        <span className="text-sm font-medium">Tidak ada catatan audit log yang cocok.</span>
                        <span className="text-xs text-gray-500">
                          Coba sesuaikan filter tanggal atau kata kunci pencarian Anda.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const ua = parseUserAgent(log.userAgent);
                    const DeviceIcon = ua.icon;
                    const isSuccess = log.status === "SUCCESS";

                    return (
                      <tr
                        key={log.id}
                        className="border-b border-white/5 last:border-0 hover:bg-white/5 transition"
                      >
                        {/* Waktu */}
                        <td className="py-3 pr-4 align-top text-xs text-gray-300 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>

                        {/* Username */}
                        <td className="py-3 pr-4 align-top">
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-semibold bg-[#42ff6b]/10 text-[#42ff6b] border border-[#42ff6b]/30">
                            @{log.username}
                          </span>
                        </td>

                        {/* Nama / Jabatan */}
                        <td className="py-3 pr-4 align-top">
                          <div className="font-medium text-xs text-white">
                            {log.name || log.user?.name || (
                              <span className="text-gray-500 italic">User Tidak Terdaftar</span>
                            )}
                          </div>
                          {log.user?.position && (
                            <div className="text-[11px] text-gray-400">
                              {log.user.position.name}{" "}
                              {log.user.position.bidang?.name && (
                                <span className="text-gray-500">
                                  ({log.user.position.bidang.name})
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 pr-4 align-top">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              SUCCESS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                              <XCircle className="w-3 h-3" />
                              FAILED
                            </span>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="py-3 pr-4 align-top font-mono text-xs text-gray-300 whitespace-nowrap">
                          {log.ipAddress || "-"}
                        </td>

                        {/* Perangkat & Browser */}
                        <td className="py-3 pr-4 align-top text-xs">
                          <div className="flex items-center gap-1.5 text-gray-300" title={log.userAgent || ""}>
                            <DeviceIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>
                              {ua.browser} on {ua.os}
                            </span>
                          </div>
                        </td>

                        {/* Keterangan */}
                        <td className="py-3 pr-0 align-top text-xs">
                          {isSuccess ? (
                            <span className="text-gray-400">Login berhasil</span>
                          ) : (
                            <span className="text-red-400 font-medium">
                              {log.failReason || "Autentikasi gagal"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!loading && logs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-gray-400">
              <div>
                Halaman <span className="text-white font-semibold">{page}</span> dari{" "}
                <span className="text-white font-semibold">{totalPages}</span> (Total{" "}
                <span className="text-white font-semibold">{stats.totalFiltered}</span> data)
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-600 bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Sebelumnya
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && page > 3) {
                      pageNum = page - 3 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    if (pageNum <= 0) pageNum = 1;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                          page === pageNum
                            ? "bg-[#42ff6b] text-black"
                            : "border border-gray-600 bg-white/5 text-gray-300 hover:bg-white/10"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-600 bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Selanjutnya
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
