"use client";

import { saveAs } from "file-saver";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TorFormData, TabId } from "./types";
import Tab1InformasiUmum from "./Tab1InformasiUmum";
import Tab2Pendahuluan from "./Tab2Pendahuluan";
import Tab3TahapanPekerjaan from "./Tab3TahapanPekerjaan";
import Tab4Usulan from "./Tab4Usulan";
import Tab5LembarPengesahan from "./Tab5LembarPengesahan";
import Tab6Lampiran from "./Tab6Lampiran";
import { Edit, X } from "lucide-react";
import { AlertModal, ConfirmModal } from "@/components/Modal";
import { useAlertModal, useConfirmModal } from "@/hooks/useModal";
import { useCollaboration } from "@/hooks/useCollaboration";
import { useFieldSync } from "@/hooks/useFieldSync";
import CollabPresence from "@/components/CollabPresence";

interface TorFormLayoutProps {
  torId?: number;
  initialData?: TorFormData;
  bidangId?: number;
  bidangName?: string;
  creatorName?: string;
  creatorPosition?: string;
  isViewOnly?: boolean;
  hasExportRole?: boolean;
  // NEW: Info pengguna yang sedang login (untuk fitur kolaborasi)
  currentUserName?: string;
}

export default function TorFormLayout({
  torId,
  initialData,
  bidangId,
  bidangName,
  creatorName,
  creatorPosition,
  isViewOnly = false,
  hasExportRole = false,
  currentUserName = "Pengguna",
}: TorFormLayoutProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("informasi-umum");

  // Refs for auto-save and date initialization
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const hasInitializedDates = useRef(false);

  // =============================================================
  // FITUR KOLABORASI REAL-TIME
  // Inisialisasi hook kolaborasi — hanya aktif jika torId ada
  // =============================================================
  const {
    ydoc,
    provider,
    connected,
    collaborators,
    updatePresence,
    userColor,
  } = useCollaboration(torId, currentUserName);

  // Update awareness saat tab aktif berganti
  useEffect(() => {
    updatePresence({ activeTab });
  }, [activeTab, updatePresence]);
  // =============================================================
  const [formData, setFormData] = useState<TorFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    number: initialData?.number,
    bidangId: bidangId || initialData?.bidangId,
    creationDate: initialData?.creationDate || "",
    creationYear: initialData?.creationYear || new Date().getFullYear(),
    budgetType: initialData?.budgetType || "",
    workType: initialData?.workType || "",
    program: initialData?.program || "",
    rkaYear: initialData?.rkaYear,
    projectStartDate: initialData?.projectStartDate || "",
    projectEndDate: initialData?.projectEndDate || "",
    executionYear: initialData?.executionYear,
    materialJasaValue: initialData?.materialJasaValue,
    budgetCurrency: initialData?.budgetCurrency || "IDR",
    budgetAmount: initialData?.budgetAmount,
    coverImage: initialData?.coverImage || null,
    introduction: initialData?.introduction || "",
    background: initialData?.background || "",
    objective: initialData?.objective || "",
    scope: initialData?.scope || "",
    warranty: initialData?.warranty || "",
    acceptanceCriteria: initialData?.acceptanceCriteria || "",
    duration: initialData?.duration,
    durationUnit: initialData?.durationUnit || "days",
    technicalSpec: initialData?.technicalSpec || "",
    generalProvisions: initialData?.generalProvisions || "",
    deliveryPoint: initialData?.deliveryPoint || "",
    deliveryMechanism: initialData?.deliveryMechanism || "",
    workStages: initialData?.workStages,
    workStagesExplanation: initialData?.workStagesExplanation || "",
    deliveryRequirements: initialData?.deliveryRequirements || "",
    handoverPoint: initialData?.handoverPoint || "",
    handoverMechanism: initialData?.handoverMechanism || "",
    budgetItems: initialData?.budgetItems || [],
    directorProposals: initialData?.directorProposals || [],
    fieldDirectorProposals: initialData?.fieldDirectorProposals || [],
    vendorRequirements: initialData?.vendorRequirements || "",
    procurementMethod: initialData?.procurementMethod || "",
    paymentTerms: initialData?.paymentTerms || "",
    penaltyRules: initialData?.penaltyRules || "",
    otherRequirements: initialData?.otherRequirements || "",
    ppnRate: initialData?.ppnRate ?? 11, // Default PPN to 11%
    ppnIncluded: initialData?.ppnIncluded ?? true,
    revisionTermOfReference: initialData?.revisionTermOfReference || "<p><strong>Revisi Term of Reference</strong></p><p>Term of Reference ini memungkinkan untuk direvisi, dengan ketentuan :</p><p>a. Adanya perubahan isi DMR yang mempengaruhi isi TOR.</p><p>b. Mencantumkan komitmen waktu revisi TOR dalam hari kalender, sebelum dimulainya pelaksanaan proses pengadaan barang atau jasa.</p>",
    approvalSignatures: initialData?.approvalSignatures || [],
    technicalParticulars: initialData?.technicalParticulars || [],
    inspectionTestingPlans: initialData?.inspectionTestingPlans || [],
    documentRequestSheets: initialData?.documentRequestSheets || [],
    performanceGuarantees: initialData?.performanceGuarantees || [],
    attachments: initialData?.attachments || [],
    statusStage: initialData?.statusStage,
  });

  // Sinkronisasi field non-TipTap via Yjs
  const { syncField } = useFieldSync(ydoc, formData, setFormData);
  
  const [isSaving, setIsSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isChangingTab, setIsChangingTab] = useState(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!lastSaveDataRef.current) return false;
    return JSON.stringify(formData) !== lastSaveDataRef.current;
  }, [formData, lastSaved]);
  
  // Modal hooks
  const alertModal = useAlertModal();
  const confirmModal = useConfirmModal();
  
  // Per-tab editing state
  const [tabEditingState, setTabEditingState] = useState<Record<TabId, boolean>>(() => ({
    "informasi-umum": !isViewOnly,
    "pendahuluan": false,
    "tahapan-pekerjaan": false,
    "usulan": false,
    "lembar-pengesahan": false,
    // Lampiran dapat diunggah langsung saat membuat/mengedit TOR.
    // Sebelumnya false membuat kontrol upload tidak dirender sebelum tombol Edit
    // pada toolbar tab ditekan.
    "lampiran": !isViewOnly,
  }));

  // Initialize dates on client-side and set initial save state reference
  useEffect(() => {
    if (!hasInitializedDates.current && !initialData && !formData.creationDate) {
      const today = new Date().toISOString().split("T")[0];
      const year = new Date().getFullYear();
      setFormData((prev) => {
        const updated = {
          ...prev,
          creationDate: today,
          creationYear: year,
        };
        lastSaveDataRef.current = JSON.stringify(updated);
        return updated;
      });
      hasInitializedDates.current = true;
    } else {
      lastSaveDataRef.current = JSON.stringify(formData);
    }
  }, []);

  // Helper function to convert ISO date string to YYYY-MM-DD
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    try {
      // Handle both ISO strings and already formatted dates
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const handleChange = (data: Partial<TorFormData>) => {
    const normalized = data.program !== undefined ? { ...data, title: data.program } : data;
    setFormData((prev) => ({ ...prev, ...normalized }));
    Object.entries(normalized).forEach(([key, val]) => {
      syncField(key, val);
    });
  };

  // Reload data from database
  const reloadData = useCallback(async () => {
    if (!torId) return;
    
    setIsReloading(true);
    try {
      console.log('🔄 Reloading data from database...');
      const response = await fetch(`/api/tor/${torId}`);
      
      if (!response.ok) {
        throw new Error('Failed to reload data');
      }
      
      const freshData = await response.json();
      
      const reloadedFormData = {
        title: freshData.title || "",
        description: freshData.description || "",
        number: freshData.number,
        bidangId: freshData.bidangId,
        creationDate: formatDateForInput(freshData.creationDate),
        creationYear: freshData.creationYear || new Date().getFullYear(),
        budgetType: freshData.budgetType || "",
        workType: freshData.workType || "",
        program: freshData.program || "",
        rkaYear: freshData.rkaYear,
        projectStartDate: formatDateForInput(freshData.projectStartDate),
        projectEndDate: formatDateForInput(freshData.projectEndDate),
        executionYear: freshData.executionYear,
        materialJasaValue: freshData.materialJasaValue,
        budgetCurrency: freshData.budgetCurrency || "IDR",
        budgetAmount: freshData.budgetAmount,
        coverImage: freshData.coverImage || null,
        introduction: freshData.introduction || "",
        background: freshData.background || "",
        objective: freshData.objective || "",
        scope: freshData.scope || "",
        warranty: freshData.warranty || "",
        acceptanceCriteria: freshData.acceptanceCriteria || "",
        duration: freshData.duration,
        durationUnit: freshData.durationUnit || "days",
        technicalSpec: freshData.technicalSpec || "",
        generalProvisions: freshData.generalProvisions || "",
        deliveryPoint: freshData.deliveryPoint || "",
        deliveryMechanism: freshData.deliveryMechanism || "",
        workStages: freshData.workStagesData,
        workStagesExplanation: freshData.workStagesExplanation || "",
        deliveryRequirements: freshData.deliveryRequirements || "",
        handoverPoint: freshData.handoverPoint || "",
        handoverMechanism: freshData.handoverMechanism || "",
        budgetItems: freshData.budgetItems || [],
        directorProposals: freshData.directorProposals || [],
        fieldDirectorProposals: freshData.fieldDirectorProposals || [],
        vendorRequirements: freshData.vendorRequirements || "",
        procurementMethod: freshData.procurementMethod || "",
        paymentTerms: freshData.paymentTerms || "",
        penaltyRules: freshData.penaltyRules || "",
        otherRequirements: freshData.otherRequirements || "",
        ppnRate: freshData.ppnRate ?? 11, // Default PPN to 11%
        ppnIncluded: freshData.ppnIncluded ?? true,
        revisionTermOfReference: freshData.revisionTermOfReference || "",
        approvalSignatures: freshData.approvalSignatures || [],
        technicalParticulars: freshData.technicalParticulars || [],
        inspectionTestingPlans: freshData.inspectionTestingPlans || [],
        documentRequestSheets: freshData.documentRequestSheets || [],
        performanceGuarantees: freshData.performanceGuarantees || [],
        attachments: freshData.attachments || [],
      };

      setFormData(reloadedFormData);
      
      // Update last saved data reference
      lastSaveDataRef.current = JSON.stringify(reloadedFormData);
      
      console.log('✅ Data reloaded successfully');
    } catch (error: any) {
      console.error('Failed to reload data:', error);
      alertModal.showAlert(
        `Failed to reload data: ${error.message}`,
        'error'
      );
    } finally {
      setIsReloading(false);
    }
  }, [torId, alertModal]);

  const handleSave = useCallback(async (isAutoSave = false) => {
    // Don't save in view-only mode
    if (isViewOnly) {
      console.log('⚠️ Save skipped: view-only mode');
      return;
    }
    
    if (!isAutoSave) setIsSaving(true);

    try {
      const url = torId ? `/api/tor/${torId}` : "/api/tor";
      const method = torId ? "PUT" : "POST";
      const isCreatingNew = !torId; // Track if this is first save

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save");
      }

      const responseData = await response.json();
      const savedTor = responseData.data || responseData;
      setLastSaved(new Date());
      
      const savedFormData = {
        title: savedTor.title || "",
        description: savedTor.description || "",
        number: savedTor.number,
        bidangId: savedTor.bidangId,
        creationDate: formatDateForInput(savedTor.creationDate),
        creationYear: savedTor.creationYear || new Date().getFullYear(),
        budgetType: savedTor.budgetType || "",
        workType: savedTor.workType || "",
        program: savedTor.program || "",
        rkaYear: savedTor.rkaYear,
        projectStartDate: formatDateForInput(savedTor.projectStartDate),
        projectEndDate: formatDateForInput(savedTor.projectEndDate),
        executionYear: savedTor.executionYear,
        materialJasaValue: savedTor.materialJasaValue,
        budgetCurrency: savedTor.budgetCurrency || "IDR",
        budgetAmount: savedTor.budgetAmount,
        coverImage: savedTor.coverImage || null,
        introduction: savedTor.introduction || "",
        background: savedTor.background || "",
        objective: savedTor.objective || "",
        scope: savedTor.scope || "",
        warranty: savedTor.warranty || "",
        acceptanceCriteria: savedTor.acceptanceCriteria || "",
        duration: savedTor.duration,
        durationUnit: savedTor.durationUnit || "days",
        technicalSpec: savedTor.technicalSpec || "",
        generalProvisions: savedTor.generalProvisions || "",
        deliveryPoint: savedTor.deliveryPoint || "",
        deliveryMechanism: savedTor.deliveryMechanism || "",
        workStages: savedTor.workStagesData,
        workStagesExplanation: savedTor.workStagesExplanation || "",
        deliveryRequirements: savedTor.deliveryRequirements || "",
        handoverPoint: savedTor.handoverPoint || "",
        handoverMechanism: savedTor.handoverMechanism || "",
        budgetItems: savedTor.budgetItems || [],
        directorProposals: savedTor.directorProposals || [],
        fieldDirectorProposals: savedTor.fieldDirectorProposals || [],
        vendorRequirements: savedTor.vendorRequirements || "",
        procurementMethod: savedTor.procurementMethod || "",
        paymentTerms: savedTor.paymentTerms || "",
        penaltyRules: savedTor.penaltyRules || "",
        otherRequirements: savedTor.otherRequirements || "",
        ppnRate: savedTor.ppnRate ?? 11, // Default PPN to 11%
        ppnIncluded: savedTor.ppnIncluded ?? true,
        revisionTermOfReference: savedTor.revisionTermOfReference || "",
        approvalSignatures: savedTor.approvalSignatures || [],
        technicalParticulars: savedTor.technicalParticulars || [],
        inspectionTestingPlans: savedTor.inspectionTestingPlans || [],
        documentRequestSheets: savedTor.documentRequestSheets || [],
        performanceGuarantees: savedTor.performanceGuarantees || [],
        attachments: savedTor.attachments || [],
      };

      // Update last saved data reference with exactly what we put in formData!
      lastSaveDataRef.current = JSON.stringify(savedFormData);
      
      // ✅ FIX: Redirect to edit mode after first save to prevent duplicates
      if (isCreatingNew) {
        console.log(`✅ TOR created with ID ${savedTor.id}, redirecting to edit mode...`);
        if (!isAutoSave) {
          alertModal.showAlert('ToR created successfully! Redirecting...', 'success');
        }
        // Redirect to edit mode - this prevents duplicate creation on subsequent saves
        router.push(`/tor/create?id=${savedTor.id}`);
        return; // Exit early, page will reload in edit mode
      }
      
      // Update form data with saved response (only for updates)
      setFormData(savedFormData);

      setLastSaved(new Date());
      console.log('✅ ToR saved successfully at:', new Date().toISOString());
      
      if (!isAutoSave) {
        alertModal.showAlert('ToR saved successfully!', 'success');
        if (activeTab !== "informasi-umum") {
          setTabEditingState(prev => ({ ...prev, [activeTab]: false }));
        }
      } else {
        console.log('💾 Auto-saved at', new Date().toLocaleTimeString());
      }
    } catch (error: any) {
      console.error("❌ Save error:", error);
      if (!isAutoSave) {
        alertModal.showAlert(error.message || "Failed to save ToR", 'error');
      }
    } finally {
      if (!isAutoSave) setIsSaving(false);
    }
  }, [torId, formData, router, activeTab, alertModal, isViewOnly, formatDateForInput]);

  // ✅ FIX: Debounced auto-save (saves 3 seconds after last change)
  useEffect(() => {
    if (!torId) return; // Only auto-save for existing TORs

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Check if data has changed
    const currentData = JSON.stringify(formData);
    if (currentData === lastSaveDataRef.current) {
      return; // No changes, skip
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Triggering auto-save...');
      handleSave(true);
    }, 3000); // 3 seconds after last change

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [torId, formData, handleSave]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.title || !formData.background || !formData.objective) {
      alertModal.showAlert(
        'Please fill in required fields: Title, Background, and Objective',
        'warning'
      );
      return;
    }
    
    confirmModal.showConfirm(
      'Submit this ToR for approval? You won\'t be able to edit it after submission.',
      async () => {
        setSubmitting(true);
        try {
          await handleSave();

          const response = await fetch(`/api/tor/${torId}/submit`, {
            method: "POST",
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to submit");
          }

          alertModal.showAlert("ToR submitted successfully!", 'success');
          router.push("/tor");
        } catch (error: any) {
          console.error("Submit error:", error);
          alertModal.showAlert(error.message || "Failed to submit ToR", 'error');
        } finally {
          setSubmitting(false);
        }
      },
      'warning'
    );
  };

  const tabs = [
    { id: "informasi-umum" as TabId, label: "Informasi Umum", component: Tab1InformasiUmum },
    { id: "pendahuluan" as TabId, label: "Pendahuluan", component: Tab2Pendahuluan },
    { id: "tahapan-pekerjaan" as TabId, label: "Tahapan Pekerjaan", component: Tab3TahapanPekerjaan },
    { id: "usulan" as TabId, label: "Usulan", component: Tab4Usulan },
    { id: "lembar-pengesahan" as TabId, label: "Lembar Pengesahan", component: Tab5LembarPengesahan },
    { id: "lampiran" as TabId, label: "Lampiran", component: Tab6Lampiran },
  ];

  const ActiveTabComponent = tabs.find((t) => t.id === activeTab)?.component;

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return `${currency || "IDR"} 0`;
    return `${currency || "IDR"} ${amount.toLocaleString("id-ID")}`;
  };

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID");
  };

  const handleExport = async () => {
    if (!torId) return;
    
    if (tabEditingState[activeTab]) {
      confirmModal.showConfirm(
        'You have unsaved changes in the current tab. The export will use the last saved version.\n\nDo you want to continue with export?',
        async () => {
          await performExport();
        },
        'warning'
      );
      return;
    }
    
    await performExport();
  };
  
  const performExport = async () => {
    
    setIsExporting(true);
    try {
      console.log('📥 Starting export...');
      
      const response = await fetch(`/api/tor/${torId}/export`);
      
      if (!response.ok) {
        throw new Error('Failed to export ToR');
      }
      
      const blob = await response.blob();
      
      let filename = `TOR-${formData.number || "draft"}.docx`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition) {
        const match = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      
      console.log('✅ Export successful!');
      saveAs(blob, filename);
      
      console.log('🔄 Reloading data after export...');
      await reloadData();
    } catch (error) {
      console.error('❌ Export error:', error);
      alertModal.showAlert('Failed to export ToR', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-6">


        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold text-gray-900">
            {isViewOnly ? "Detail TOR" : torId ? "Edit TOR" : "Create New TOR"}
          </h1>
          {/* Presence indicator — hanya tampil jika ada torId (mode edit) */}
          {torId && (
            <CollabPresence
              collaborators={collaborators}
              connected={connected}
              currentUserName={currentUserName}
              currentUserColor={userColor}
            />
          )}
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="text-sm text-gray-500">Nomor TOR</div>
              <div className="text-2xl font-bold text-blue-600">
                {formData.number || "TOR-XXXX-XXX"}
              </div>
              <div className="text-lg text-gray-700">{formData.program || formData.title || "Untitled"}</div>
              <div className="text-sm text-gray-500">
                Bidang: {bidangName || "-"} | Creator: {creatorName || "-"}
              </div>
            </div>

            <div className="text-right space-y-2">
              <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                STATUS: {formData.statusStage || "DRAFT"}
              </div>
              <div className="text-sm text-gray-600">
                Tgl Pembuatan: {formatDate(formData.creationDate)}
              </div>
              <div className="text-sm text-gray-600">
                Nilai Anggaran: {formatCurrency(formData.budgetAmount || undefined, formData.budgetCurrency || undefined)}
              </div>
              {/* Only show Export button when user has EXPORT role */}
              {!isViewOnly && hasExportRole && (
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!torId || isExporting}
                  className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
                >
                  {isExporting ? (
                    <>
                      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export Word
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {lastSaved && (
            <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={async () => {
                if (isChangingTab) return;
                setIsChangingTab(true);
                // Small delay for better UX
                await new Promise(resolve => setTimeout(resolve, 200));
                setActiveTab(tab.id);
                setIsChangingTab(false);
              }}
              disabled={isChangingTab}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === tab.id
                  ? "bg-gray-900 text-white"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              {isChangingTab ? (
                <span className="inline-flex items-center gap-1">
                  <span className="animate-spin">⟳</span>
                  {tab.label}
                </span>
              ) : (
                tab.label
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm min-h-[500px]">
          {activeTab !== "informasi-umum" && !isViewOnly && (
            <div className="flex justify-end p-4 pb-0">
              <button
                onClick={async () => {
                  const isCurrentlyEditing = tabEditingState[activeTab];
                  if (isCurrentlyEditing) {
                    confirmModal.showConfirm(
                      'Batalkan perubahan? Data yang belum disimpan akan hilang.',
                      async () => {
                        await reloadData();
                        setTabEditingState(prev => ({ ...prev, [activeTab]: false }));
                      },
                      'warning'
                    );
                  } else {
                    setTabEditingState(prev => ({ ...prev, [activeTab]: true }));
                  }
                }}
                disabled={isReloading}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  tabEditingState[activeTab]
                    ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isReloading ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Loading...
                  </>
                ) : tabEditingState[activeTab] ? (
                  <>
                    <X size={16} />
                    Cancel Edit
                  </>
                ) : (
                  <>
                    <Edit size={16} />
                    Edit
                  </>
                )}
              </button>
            </div>
          )}
          
          <div className="p-6">
            {ActiveTabComponent && (
              <ActiveTabComponent 
                formData={formData} 
                onChange={handleChange} 
                isEditing={tabEditingState[activeTab]}
                torId={torId}
                bidangId={formData.bidangId}
                creatorName={creatorName}
                creatorPosition={creatorPosition}
                // Teruskan props kolaborasi ke semua tab
                ydoc={ydoc}
                awarenessProvider={provider}
                collabUser={{ name: currentUserName, color: userColor }}
              />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!isViewOnly && (
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => router.push("/tor")}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <div className="flex gap-3">
              {tabEditingState[activeTab] && activeTab !== "informasi-umum" && (
                <button
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className={`px-6 py-2 rounded-lg text-white transition-all duration-200 disabled:opacity-50 ${
                    hasUnsavedChanges
                      ? "bg-green-600 hover:bg-green-700 shadow-md"
                      : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  {isSaving ? "Saving..." : "Save Draft"}
                </button>
              )}
              {activeTab === "informasi-umum" && (
                <button
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className={`px-6 py-2 rounded-lg text-white transition-all duration-200 disabled:opacity-50 ${
                    hasUnsavedChanges
                      ? "bg-green-600 hover:bg-green-700 shadow-md"
                      : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  {isSaving ? "Saving..." : "Save Draft"}
                </button>
              )}

              {torId && (formData.statusStage === "DRAFT" || formData.statusStage === "REVISE") && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </button>
              )}
            </div>
          </div>
        )}
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