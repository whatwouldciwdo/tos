"use client";

import { TabProps } from "./types";
import TiptapEditor from "./components/TiptapEditor";
import { useState } from "react";
import { AlertModal, ConfirmModal } from "@/components/Modal";
import { useAlertModal, useConfirmModal } from "@/hooks/useModal";

export default function Tab2Pendahuluan({ formData, onChange, isEditing = false, ydoc, awarenessProvider, collabUser }: TabProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Modal hooks
  const alertModal = useAlertModal();
  const confirmModal = useConfirmModal();

  const handleInputChange = (field: string, value: any) => {
    if (!isEditing) return; // Prevent changes when not editing
    onChange({ [field]: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Format file tidak valid. Hanya gambar yang diperbolehkan.");
      setUploading(false);
      alertModal.showAlert("Format file tidak valid. Hanya gambar yang diperbolehkan.", "error");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError("Ukuran file melebihi 5MB");
      setUploading(false);
      alertModal.showAlert("Ukuran file melebihi 5MB", "error");
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      console.log("📤 Uploading cover image...");
      console.log("   - File name:", file.name);
      console.log("   - File size:", file.size, "bytes");
      console.log("   - File type:", file.type);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload failed");
      }

      const data = await res.json();
      
      console.log("✅ Upload successful!");
      console.log("   - URL:", data.url);
      console.log("   - Filename:", data.filename);
      console.log("   - Size:", data.size);
      console.log("   - Type:", data.type);
      
      // Update form data dengan path image (WITHOUT leading slash)
      handleInputChange("coverImage", data.url);
      
      alertModal.showAlert("Gambar berhasil diupload!", "success");
    } catch (error: any) {
      console.error("❌ Upload error:", error);
      setUploadError(error.message);
      alertModal.showAlert(`Gagal upload gambar: ${error.message}`, "error");
    } finally {
      setUploading(false);
      // Reset input so same file can be uploaded again if needed
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    confirmModal.showConfirm(
      "Hapus gambar cover?",
      () => {
        handleInputChange("coverImage", null);
        setUploadError(null);
      },
      "warning"
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 bg-blue-100 px-4 py-2 rounded">
        Pendahuluan
      </h2>

      {/* Judul otomatis dari Informasi Umum */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Judul Pekerjaan <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.program || formData.title || ""}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          required
        />
      </div>
      
      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cover Image (Opsional)
        </label>
        <div className="space-y-3">
          {/* Upload Input */}
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleImageUpload}
              disabled={uploading || !isEditing}
              className="block w-full text-sm text-gray-500 
                file:mr-4 file:py-2 file:px-4 
                file:rounded-full file:border-0 
                file:text-sm file:font-semibold 
                file:bg-blue-50 file:text-blue-700 
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {uploading && (
              <span className="text-sm text-blue-600">Uploading...</span>
            )}
          </div>

          {/* Upload Error */}
          {uploadError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              ⚠️ {uploadError}
            </div>
          )}
          
          {/* Image Preview */}
          {formData.coverImage && (
            <div className="space-y-2">
              <div className="relative inline-block">
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                  <img 
                    src={`/${formData.coverImage}`}
                    alt="Cover Preview" 
                    className="w-40 h-28 object-cover"
                    onLoad={() => console.log("✅ Image preview loaded successfully")}
                    onError={(e) => {
                      console.error("❌ Failed to load image preview:", formData.coverImage);
                      // Fallback to placeholder
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='112'%3E%3Crect fill='%23f0f0f0' width='160' height='112'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3EImage Error%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={!isEditing}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Hapus gambar"
                >
                  ×
                </button>
              </div>
              
              {/* Path Info */}
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">Path:</span>
                  <code className="bg-gray-100 px-2 py-0.5 rounded">{formData.coverImage}</code>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <span>✓</span>
                  <span>Gambar siap untuk export</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Help Text */}
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">
            Format: JPG, PNG, GIF, WebP | Max: 5MB
          </p>
          <p className="text-xs text-gray-500">
            Gambar akan ditampilkan di cover halaman dokumen TOR
          </p>
        </div>
      </div>

      {/* Pendahuluan */}
<TiptapEditor
  label="Pendahuluan"
  content={formData.introduction || `<p>PT PLN Indonesia Power UBP Cilegon memiliki 2 unit PLTG dan 1 unit Turbin Uap, dengan total kapasitas pembangkit sebesar 740 MW. UBP Cilegon merupakan unit Mitsubishi dengan type M701F.</p>`}
  onChange={(html) => handleInputChange("introduction", html)}
  placeholder="Jelaskan pendahuluan pekerjaan ini..."
  readOnly={!isEditing}
  ydoc={ydoc}
  fieldName="introduction"
  awarenessProvider={awarenessProvider}
  collabUser={collabUser}
/>

{/* Latar Belakang */}
<TiptapEditor
  label="Latar Belakang"
  required
  content={formData.background}
  onChange={(html) => handleInputChange("background", html)}
  placeholder="Jelaskan latar belakang pekerjaan ini..."
  readOnly={!isEditing}
  ydoc={ydoc}
  fieldName="background"
  awarenessProvider={awarenessProvider}
  collabUser={collabUser}
/>

{/* Tujuan */}
<TiptapEditor
  label="Tujuan"
  required
  content={formData.objective}
  onChange={(html) => handleInputChange("objective", html)}
  placeholder="Jelaskan tujuan dari pekerjaan ini..."
  readOnly={!isEditing}
  ydoc={ydoc}
  fieldName="objective"
  awarenessProvider={awarenessProvider}
  collabUser={collabUser}
/>

{/* Ruang Lingkup */}
<TiptapEditor
  label="Ruang Lingkup Pekerjaan"
  required
  content={formData.scope}
  onChange={(html) => handleInputChange("scope", html)}
  placeholder="Jelaskan ruang lingkup pekerjaan secara detail..."
  readOnly={!isEditing}
  ydoc={ydoc}
  fieldName="scope"
  awarenessProvider={awarenessProvider}
  collabUser={collabUser}
/>

{/* Garansi */}
<TiptapEditor
  label="Garansi"
  content={formData.warranty}
  onChange={(html) => handleInputChange("warranty", html)}
  placeholder="Jelaskan garansi yang diberikan untuk pekerjaan ini..."
  readOnly={!isEditing}
  ydoc={ydoc}
  fieldName="warranty"
  awarenessProvider={awarenessProvider}
  collabUser={collabUser}
/>

{/* Kriteria yang Diterima */}
<TiptapEditor
  label="Kriteria yang Diterima"
  content={formData.acceptanceCriteria}
  onChange={(html) => handleInputChange("acceptanceCriteria", html)}
  placeholder="Jelaskan kriteria penerimaan hasil pekerjaan..."
  readOnly={!isEditing}
  ydoc={ydoc}
  fieldName="acceptanceCriteria"
  awarenessProvider={awarenessProvider}
  collabUser={collabUser}
/>

      {/* Deskripsi Tambahan */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Deskripsi Tambahan (Opsional)
        </label>
        <textarea
          value={formData.description || ""}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="Informasi tambahan jika diperlukan"
          rows={3}
          disabled={!isEditing}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
        />
      </div>
      
      {/* Modals */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={alertModal.close}
        message={alertModal.alertMessage}
        type={alertModal.alertType}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.close}
        onConfirm={confirmModal.confirmCallback || (() => {})}
        message={confirmModal.confirmMessage}
        type={confirmModal.confirmType}
      />
    </div>
  );
}