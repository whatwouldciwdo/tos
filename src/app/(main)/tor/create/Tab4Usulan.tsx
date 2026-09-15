"use client";

import { TabProps, DirectorProposal, FieldDirectorProposal } from "./types";
import BudgetTable from "./components/BudgetTable";
import TiptapEditor from "./components/TiptapEditor";
import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function Tab4Usulan({ formData, onChange, isEditing = false, ydoc, awarenessProvider, collabUser }: TabProps) {
  const handleInputChange = (field: string, value: any) => {
    if (!isEditing) return;
    onChange({ [field]: value });
  };

  // ✅ Director Proposals Handlers
  const addDirectorProposal = () => {
    const current = formData.directorProposals || [];
    const newProposal: DirectorProposal = {
      id: uuidv4(),
      name: "Senior Manager Unit", // Default value
    };
    handleInputChange("directorProposals", [...current, newProposal]);
  };

  const updateDirectorProposal = (id: string, name: string) => {
    const current = formData.directorProposals || [];
    const updated = current.map((p) => (p.id === id ? { ...p, name } : p));
    handleInputChange("directorProposals", updated);
  };

  const removeDirectorProposal = (id: string) => {
    const current = formData.directorProposals || [];
    const updated = current.filter((p) => p.id !== id);
    handleInputChange("directorProposals", updated);
  };

  // ✅ Field Director Proposals Handlers
  const addFieldDirectorProposal = () => {
    const current = formData.fieldDirectorProposals || [];
    const newProposal: FieldDirectorProposal = {
      id: uuidv4(),
      name: "",
    };
    handleInputChange("fieldDirectorProposals", [...current, newProposal]);
  };

  const updateFieldDirectorProposal = (id: string, name: string) => {
    const current = formData.fieldDirectorProposals || [];
    const updated = current.map((p) => (p.id === id ? { ...p, name } : p));
    handleInputChange("fieldDirectorProposals", updated);
  };

  const removeFieldDirectorProposal = (id: string) => {
    const current = formData.fieldDirectorProposals || [];
    const updated = current.filter((p) => p.id !== id);
    handleInputChange("fieldDirectorProposals", updated);
  };

  const directorProposals = formData.directorProposals || [];
  const fieldDirectorProposals = formData.fieldDirectorProposals || [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 bg-blue-100 px-4 py-2 rounded">
        Usulan
      </h2>

      {/* Usulan Pelaksana Direksi Pekerjaan & Direksi Lapangan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Direksi Pekerjaan */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Usulan Pelaksana Direksi Pekerjaan
            </label>
            {isEditing && (
              <button
                type="button"
                onClick={addDirectorProposal}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                <Plus size={14} />
                Tambah
              </button>
            )}
          </div>

          <div className="space-y-2">
            {directorProposals.map((proposal, index) => (
              <div key={proposal.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                <input
                  type="text"
                  value={proposal.name}
                  onChange={(e) => updateDirectorProposal(proposal.id, e.target.value)}
                  placeholder="Nama jabatan Direksi Pekerjaan..."
                  disabled={!isEditing}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => removeDirectorProposal(proposal.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            {directorProposals.length === 0 && (
              <div className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-300 rounded-lg">
                {isEditing
                  ? "Klik tombol 'Tambah' untuk menambahkan Direksi Pekerjaan"
                  : "Belum ada data Direksi Pekerjaan"}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Direksi Lapangan */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Usulan Direksi Lapangan
            </label>
            {isEditing && (
              <button
                type="button"
                onClick={addFieldDirectorProposal}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                <Plus size={14} />
                Tambah
              </button>
            )}
          </div>

          <div className="space-y-2">
            {fieldDirectorProposals.map((proposal, index) => (
              <div key={proposal.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                <input
                  type="text"
                  value={proposal.name}
                  onChange={(e) => updateFieldDirectorProposal(proposal.id, e.target.value)}
                  placeholder="Nama jabatan Direksi Lapangan..."
                  disabled={!isEditing}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => removeFieldDirectorProposal(proposal.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            {fieldDirectorProposals.length === 0 && (
              <div className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-300 rounded-lg">
                {isEditing
                  ? "Klik tombol 'Tambah' untuk menambahkan Direksi Lapangan"
                  : "Belum ada data Direksi Lapangan"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persyaratan Calon Penyedia - TiptapEditor */}
      <TiptapEditor
        label="Persyaratan Calon Penyedia"
        content={formData.vendorRequirements || `<ol style="list-style-type: lower-alpha;">
<li>Izin Usaha: Non Kecil</li>
<li>Klasifikasi Usaha/Kelompok Usaha/Bidang Usaha: Berpengalaman dalam Pengelolaan Infrastruktur di lingkungan PT PLN Indonesia Power.</li>
<li>Minimal memiliki 1 orang Project Enjinir yang berpengalaman dalam Pengelolaan Infrastruktur.</li>
<li>Commissioner/Project Enjinir WAJIB mengetahui proses pekerjaan di lapangan dan bertanggung jawab langsung terhadap Direksi Pekerjaan/Lapangan/Mutu atas progress report setiap harinya.</li>
<li>Penyedia barang dan jasa WAJIB membawa seluruh sertifikat personil, yang berkaitan dengan pekerjaan tersebut dan menunjukannya ke Direksi Pekerjaan/Direksi Lapangan/Tim Mutu minimal 1 hari sebelum eksekusi pekerjaan. Khusus untuk pekerjaan di bawah air, untuk personil yang akan melaksanakan pekerjaan tersebut wajib memiliki sertifikat menyelam atau bekerja di dalam air atau sejenisnya yang berkaitan dengan pekerjaan tersebut dan berusia maksimal 55 tahun.</li>
<li>Penyedia barang dan jasa WAJIB memiliki Pengawas K3 yang memiliki sertifikat yang masih berlaku</li>
<li>Memiliki sertifikat SIUJK dan masih berlaku</li>
<li>Memiliki sertifikat PQ CSMS dari PT PLN Indonesia Power dengan kualifikasi tingkat risiko minimum EKSTRIM</li>
<li>Penyedia Barang dan Jasa WAJIB memberikan technical support after sales jika kemudian hari setelah pemasangan terdapat kendala teknis dalam pengoperasian.</li>
</ol>`}
        onChange={(html) => handleInputChange("vendorRequirements", html)}
        placeholder="Persyaratan izin usaha, klasifikasi, sertifikat, dll..."
        readOnly={!isEditing}
        ydoc={ydoc}
        fieldName="vendorRequirements"
        awarenessProvider={awarenessProvider}
        collabUser={collabUser}
      />

      {/* Usulan Metode Pengadaan - TiptapEditor */}
      <TiptapEditor
        label="Usulan Metode Pengadaan"
        content={formData.procurementMethod}
        onChange={(html) => handleInputChange("procurementMethod", html)}
        placeholder="Metode pengadaan yang diusulkan..."
        readOnly={!isEditing}
        ydoc={ydoc}
        fieldName="procurementMethod"
        awarenessProvider={awarenessProvider}
        collabUser={collabUser}
      />

      {/* Usulan Aturan Pembayaran - TiptapEditor */}
      <TiptapEditor
        label="Usulan Aturan Pembayaran"
        content={formData.paymentTerms || `<ol style="list-style-type: lower-alpha;">
<li>Pembayaran dilakukan dengan mata uang rupiah sesuai aturan pengadaan Barang dan Jasa PT PLN Indonesia Power UBP Cilegon.</li>
<li>Persyaratan hak atas pembayaran: Telah diserah terimakannya seluruh pekerjaan berdasarkan kontrak</li>
</ol>`}
        onChange={(html) => handleInputChange("paymentTerms", html)}
        placeholder="Aturan pembayaran, mata uang, persyaratan..."
        readOnly={!isEditing}
        ydoc={ydoc}
        fieldName="paymentTerms"
        awarenessProvider={awarenessProvider}
        collabUser={collabUser}
      />

      {/* Usulan Aturan Denda - TiptapEditor */}
      <TiptapEditor
        label="Usulan Aturan Denda"
        content={formData.penaltyRules || `<p>Denda keterlambatan diberlakukan apabila Penyedia mengirimkan barang melebihi waktu yang dipersyaratkan, dengan besaran:</p>
<ol style="list-style-type: lower-alpha;">
<li>Denda sebesar 1‰ (satu per mil) x hari keterlambatan x jumlah barang yang dipersyaratkan dalam kontrak x nilai total kontrak</li>
<li>Batasan denda maksimal sebesar 5% dari Nilai Surat Perjanjian</li>
</ol>
<p>Tidak ada denda atas kualitas. Kualitas material/pekerjaan mengacu pada standar spesifikasi kontrak. Jika terdapat material/pekerjaan dibawah standar spesifikasi maka direksi lapangan berhak menolak material tersebut. Apabila terjadi penolakan maka penyedia wajib menyediakan pengganti sesuai kontrak. Denda keterlambatan mengacu pada tanggal delivery yang dipersyaratkan dalam kontrak.</p>`}
        onChange={(html) => handleInputChange("penaltyRules", html)}
        placeholder="Denda keterlambatan, batasan maksimal, dll..."
        readOnly={!isEditing}
        ydoc={ydoc}
        fieldName="penaltyRules"
        awarenessProvider={awarenessProvider}
        collabUser={collabUser}
      />

      {/* Rencana Anggaran Biaya (RAB) - Budget Table */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rencana Anggaran Biaya (RAB) <span className="text-red-500">*</span>
        </label>
        <BudgetTable formData={formData} onChange={onChange} isEditing={isEditing} />
      </div>

      {/* Persyaratan Lainnya - TiptapEditor */}
      <TiptapEditor
        label="Persyaratan Lainnya"
        content={formData.otherRequirements}
        onChange={(html) => handleInputChange("otherRequirements", html)}
        placeholder="Persyaratan tambahan lainnya..."
        readOnly={!isEditing}
        ydoc={ydoc}
        fieldName="otherRequirements"
        awarenessProvider={awarenessProvider}
        collabUser={collabUser}
      />

      {/* Risk Assessment - TiptapEditor */}
      <TiptapEditor
        label="Risk Assessment"
        content={formData.riskAssessment}
        onChange={(html) => handleInputChange("riskAssessment", html)}
        placeholder="Jelaskan risk assessment untuk pekerjaan ini..."
        readOnly={!isEditing}
        ydoc={ydoc}
        fieldName="riskAssessment"
        awarenessProvider={awarenessProvider}
        collabUser={collabUser}
      />

      <TiptapEditor
        label="Revisi Term of Reference"
        content={formData.revisionTermOfReference || `<p><strong>Revisi Term of Reference</strong></p><p>Term of Reference ini memungkinkan untuk direvisi, dengan ketentuan :</p><p>a. Adanya perubahan isi DMR yang mempengaruhi isi TOR.</p><p>b. Mencantumkan komitmen waktu revisi TOR dalam hari kalender, sebelum dimulainya pelaksanaan proses pengadaan barang atau jasa.</p>`}
        onChange={(html) => handleInputChange("revisionTermOfReference", html)}
        placeholder="Ketentuan revisi Term of Reference..."
        readOnly={!isEditing}
        ydoc={ydoc}
        fieldName="revisionTermOfReference"
        awarenessProvider={awarenessProvider}
        collabUser={collabUser}
      />
    </div>
  );
}