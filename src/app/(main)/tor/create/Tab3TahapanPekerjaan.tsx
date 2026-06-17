"use client";

import { TabProps } from "./types";
import TiptapEditor from "./components/TiptapEditor";
import GanttTableEditor from "./components/GanttTableEditor";

export default function Tab3TahapanPekerjaan({ formData, onChange, isEditing = false, ydoc, awarenessProvider, collabUser }: TabProps) {
  const handleInputChange = (field: string, value: any) => {
    if (!isEditing) return; // Prevent changes when not editing
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 bg-blue-100 px-4 py-2 rounded">
        Tahapan Pekerjaan
      </h2>

      {/* Work Stages Gantt Table */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Jadwal Tahapan Pekerjaan <span className="text-red-500">*</span>
        </label>
        <GanttTableEditor
          data={formData.workStages}
          onChange={(data) => handleInputChange("workStages", data)}
          isEditing={isEditing}
        />
      </div>

      {/* Table Explanation */}
      <TiptapEditor
        label="Penjelasan Tabel (Opsional)"
        content={formData.workStagesExplanation}
        onChange={(html) => handleInputChange("workStagesExplanation", html)}
        placeholder="Tambahkan penjelasan mengenai tahapan pekerjaan jika diperlukan..."
        readOnly={!isEditing}
        ydoc={ydoc}
        fieldName="workStagesExplanation"
        awarenessProvider={awarenessProvider}
        collabUser={collabUser}
      />

      {/* Persyaratan Pengiriman */}
      <TiptapEditor
        label="Persyaratan Pengiriman"
        content={formData.deliveryRequirements || `<ol>
<li>Penyedia wajib mengirimkan barang dan mengkondisikan pengiriman barang menjamin barang terhindar dari kerusakan.</li>
<li>Pelaksana pekerjaan berkewajiban atas asuransi kargo dari tempat asal barang sampai dengan titik serah terima.</li>
<li>Apabila terdapat Pengepakan harus terdapat packing list setiap barang.</li>
</ol>`}
        onChange={(html) => handleInputChange("deliveryRequirements", html)}
        placeholder="Jelaskan persyaratan pengiriman hasil pekerjaan..."
        readOnly={!isEditing}
        ydoc={ydoc}
        fieldName="deliveryRequirements"
        awarenessProvider={awarenessProvider}
        collabUser={collabUser}
      />

      {/* Titik Serah Terima */}
      <TiptapEditor
        label="Titik Serah Terima"
        content={formData.handoverPoint || `<p><strong>Titik serah terima pekerjaan adalah:</strong></p>
<p>PT PLN Indonesia Power UBP Cilegon:<br>
Jl. Raya Bojonegara - Salira, Desa Margasari Kecamatan Puloampel, Kab. Serang - Banten (0254) 5751555, 5751444 setiap hari kerja mulai pukul 08:00 s/d pukul 15:00.</p>`}
        onChange={(html) => handleInputChange("handoverPoint", html)}
        placeholder="Jelaskan titik/lokasi serah terima hasil pekerjaan..."
        readOnly={!isEditing}
        ydoc={ydoc}
        fieldName="handoverPoint"
        awarenessProvider={awarenessProvider}
        collabUser={collabUser}
      />

      {/* Mekanisme Serah Terima */}
      <TiptapEditor
        label="Mekanisme Serah Terima"
        content={formData.handoverMechanism}
        onChange={(html) => handleInputChange("handoverMechanism", html)}
        placeholder="Jelaskan prosedur dan mekanisme serah terima hasil pekerjaan..."
        readOnly={!isEditing}
        ydoc={ydoc}
        fieldName="handoverMechanism"
        awarenessProvider={awarenessProvider}
        collabUser={collabUser}
      />
    </div>
  );
}
