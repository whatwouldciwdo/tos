"use client";

import { TabProps } from "./types";

export default function Tab1InformasiUmum({ formData, onChange, isEditing = false }: TabProps) {
  const handleInputChange = (field: string, value: any) => {
    if (!isEditing) return;
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 bg-blue-100 px-4 py-2 rounded">
        Informasi Umum
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tanggal Pembuatan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Pembuatan
          </label>
          <input
            type="date"
            value={formData.creationDate || ""}
            onChange={(e) => handleInputChange("creationDate", e.target.value)}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
        </div>

        {/* Tahun Pembuatan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tahun Pembuatan
          </label>
          <input
            type="number"
            value={formData.creationYear || ""}
            onChange={(e) => handleInputChange("creationYear", parseInt(e.target.value))}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
        </div>

        {/* Jenis Anggaran */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jenis Anggaran
          </label>
          <select
            value={formData.budgetType || ""}
            onChange={(e) => handleInputChange("budgetType", e.target.value)}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            <option value="">Pilih Jenis Anggaran</option>
            <option value="Anggaran Investasi">Anggaran Investasi</option>
            <option value="Anggaran Operasional">Anggaran Operasional</option>
          </select>
        </div>

        {/* Jenis Pekerjaan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jenis Pekerjaan
          </label>
          <select
            value={formData.workType || ""}
            onChange={(e) => handleInputChange("workType", e.target.value)}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            <option value="">Pilih Jenis Pekerjaan</option>
            <option value="Jasa dan Material">Jasa dan Material</option>
            <option value="Jasa">Jasa</option>
            <option value="Material">Material</option>
          </select>
        </div>

        {/* Program (Judul TOR) */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Program (Judul TOR)
          </label>
          <input
            type="text"
            value={formData.program || ""}
            onChange={(e) => handleInputChange("program", e.target.value)}
            placeholder="Masukkan program/judul TOR"
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
        </div>

        {/* Tahun RKA */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tahun RKA
          </label>
          <input
            type="number"
            value={formData.rkaYear || ""}
            onChange={(e) => handleInputChange("rkaYear", parseInt(e.target.value))}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
        </div>

        {/* Periode Proyek */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Periode Proyek
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="date"
                value={formData.projectStartDate || ""}
                onChange={(e) => handleInputChange("projectStartDate", e.target.value)}
                placeholder="Tanggal Mulai"
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <input
                type="date"
                value={formData.projectEndDate || ""}
                onChange={(e) => handleInputChange("projectEndDate", e.target.value)}
                placeholder="Tanggal Selesai"
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Pelaksanaan (Tahun) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pelaksanaan (Tahun)
          </label>
          <input
            type="number"
            value={formData.executionYear || ""}
            onChange={(e) => handleInputChange("executionYear", parseInt(e.target.value))}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
        </div>

        {/* Nilai Anggaran */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nilai Anggaran
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Mata Uang</label>
              <select
                value={formData.budgetCurrency || "IDR"}
                onChange={(e) => handleInputChange("budgetCurrency", e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <option value="IDR">IDR (Rupiah)</option>
                <option value="USD">USD (Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="JPY">JPY (Yen)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Jumlah Nilai</label>
              <input
                type="number"
                value={formData.budgetAmount || ""}
                onChange={(e) => handleInputChange("budgetAmount", parseFloat(e.target.value))}
                placeholder="Masukkan jumlah nilai anggaran"
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
