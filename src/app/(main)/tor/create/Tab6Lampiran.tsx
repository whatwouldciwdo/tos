"use client";

import { TabProps, TechnicalParticular, InspectionTestingPlan, DocumentRequestSheet, PerformanceGuarantee, ColumnConfig, TorAttachment } from "./types";
import { v4 as uuidv4 } from "uuid";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useConfirmModal } from "@/hooks/useModal";
import { ConfirmModal } from "@/components/Modal";
import dynamic from "next/dynamic";
import { CellBase, Matrix } from "react-spreadsheet";

// Dynamic import for spreadsheet to avoid SSR issues
const SpreadsheetEditor = dynamic(() => import("./SpreadsheetEditor"), { 
  ssr: false,
  loading: () => <div className="p-4 text-center text-gray-500">Loading spreadsheet...</div>
});

// Dynamic import for Battery template
const BatteryTemplate = dynamic(() => import("./components/BatteryTemplate"), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-gray-500">Loading battery template...</div>
});

interface LampiranTemplate {
  id: number;
  name: string;
  description: string | null;
  renderMode: "table" | "spreadsheet"; // "table" or "spreadsheet"
  tpgColumns?: ColumnConfig[];
  itpColumns?: ColumnConfig[];
  drsColumns?: ColumnConfig[];
  pgrsColumns?: ColumnConfig[];
  technicalParticulars: any;
  inspectionTestingPlans: any;
  documentRequestSheets: any;
  performanceGuarantees: any;
}

const tableContainer = "overflow-x-auto border rounded-lg bg-white shadow-sm";
const tableClass = "table-fixed min-w-full divide-y divide-gray-200 text-base leading-6";
const thClass =
  "px-6 py-4 text-left font-semibold text-gray-800 uppercase tracking-wide bg-gray-50 align-middle";
const tdClass = "px-6 py-4 align-middle";
const inputClass =
  "w-full px-3 py-2.5 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-base";

export default function Tab6Lampiran({ formData, onChange, isEditing }: TabProps) {
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isEditing) return;
    setUploadingAttachment(true);
    setAttachmentError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Upload gagal");
      const attachment: TorAttachment = { id: uuidv4(), name: file.name, filename: result.filename, url: result.url, type: file.type, size: file.size };
      onChange({ attachments: [...(formData.attachments || []), attachment] });
    } catch (error: any) {
      setAttachmentError(error.message || "Upload gagal");
    } finally {
      setUploadingAttachment(false);
      event.target.value = "";
    }
  };

  const removeAttachment = (id: string) => onChange({ attachments: (formData.attachments || []).filter((item) => item.id !== id) });

  // Generic helper to add item
  const addItem = (field: keyof typeof formData, newItem: any) => {
    const currentArray = (formData[field] as any[]) || [];
    onChange({ [field]: [...currentArray, newItem] });
  };

  // Generic helper to remove item
  const removeItem = (field: keyof typeof formData, id: string) => {
    const currentArray = (formData[field] as any[]) || [];
    onChange({ [field]: currentArray.filter((item: any) => item.id !== id) });
  };

  // Generic helper to update item
  const updateItem = (field: keyof typeof formData, id: string, key: string, value: string) => {
    const currentArray = (formData[field] as any[]) || [];
    onChange({
      [field]: currentArray.map((item: any) =>
        item.id === id ? { ...item, [key]: value } : item
      ),
    });
  };
  
  // Template state
  const [templates, setTemplates] = useState<LampiranTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [currentRenderMode, setCurrentRenderMode] = useState<"table" | "spreadsheet">("table");
  const [currentTemplateName, setCurrentTemplateName] = useState<string>(""); // Track which template is loaded
  const confirmModal = useConfirmModal();
  
  // Collapse state for each table section
  const [collapsedSections, setCollapsedSections] = useState({
    tpg: false,
    itp: false,
    drs: false,
    pgrs: false
  });
  
  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch("/api/lampiran-templates");
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
    };
    fetchTemplates();
  }, []);

  // Handle template selection with confirmation
  const handleTemplateSelect = (templateId: string) => {
    if (!templateId || !isEditing) return;
    
    const template = templates.find(t => t.id === parseInt(templateId));
    if (!template) return;

    // Check if there's existing data
    const hasExistingData = 
      (formData.technicalParticulars && formData.technicalParticulars.length > 0) ||
      (formData.inspectionTestingPlans && formData.inspectionTestingPlans.length > 0) ||
      (formData.documentRequestSheets && formData.documentRequestSheets.length > 0) ||
      (formData.performanceGuarantees && formData.performanceGuarantees.length > 0);

    if (hasExistingData) {
      confirmModal.showConfirm(
        `Apakah Anda yakin ingin mengganti semua data lampiran dengan template "${template.name}"? Data yang ada akan terhapus.`,
        () => applyTemplate(template),
        "warning"
      );
    } else {
      applyTemplate(template);
    }
  };

  // Apply template data to form
  const applyTemplate = (template: LampiranTemplate) => {
    console.log('📋 Applying template:', template.name);
    console.log('📋 Template renderMode:', template.renderMode);
    console.log('📋 Template TPG data:', template.technicalParticulars);
    console.log('📋 Template TPG columns:', template.tpgColumns);
    
    // Helper to flatten nested section-based data into flat array
    const flattenSectionData = (data: any): any[] => {
      // Check if data has sections structure (new nested format)
      if (data && typeof data === 'object' && data.sections && Array.isArray(data.sections)) {
        console.log('📋 Flattening nested section data');
        const flatArray: any[] = [];
        
        // Check if this is Battery format (sections have specificationRequirements items)
        const isBatteryType = data.sections.some((s: any) => 
          s.items?.some((item: any) => 'spec1' in item || 'specificationRequirements' in item)
        );
        
        // Check if this is the new multi-column Battery format (has spec1, spec2, etc.)
        const isMultiColumnBattery = data.sections.some((s: any) => 
          s.items?.some((item: any) => 'spec1' in item)
        );
        
        // Process each section
        data.sections.forEach((section: any) => {
          // Add section header row
          if (isMultiColumnBattery) {
            // Multi-column Battery format: use spec1 for section title
            flatArray.push({
              id: section.number || section.id,
              spec1: section.title,
              spec2: "",
              spec3: "",
              spec4: "",
              vendorPTX: "",
              vendorPTY: "",
              vendorPTZ: "",
              keterangan: "",
              isSectionHeader: true
            });
          } else if (isBatteryType) {
            // Old Battery format: use specificationRequirements for section title
            flatArray.push({
              id: section.number || section.id,
              specificationRequirements: section.title,
              vendorPTX: "",
              vendorPTY: "",
              vendorPTZ: "",
              keterangan: "",
              isSectionHeader: true
            });
          } else {
            // Other formats: use description
            flatArray.push({
              id: section.number || section.id,
              description: section.title,
              isSectionHeader: true
            });
          }
          
          // Add all items from this section
          if (section.items && Array.isArray(section.items)) {
            section.items.forEach((item: any) => {
              flatArray.push({
                ...item,
                id: item.id || uuidv4()
              });
            });
          }
        });
        
        console.log('📋 Flattened array length:', flatArray.length);
        console.log('📋 First item:', flatArray[0]);
        return flatArray;
      }
      
      // Already flat array format (old format)
      if (Array.isArray(data)) {
        console.log('📋 Data already in flat array format');
        return data;
      }
      
      // Unknown format
      console.warn('⚠️ Unknown data format, returning empty array');
      return [];
    };
    
    // KEEP original IDs from template to preserve section numbering (e.g., "1-0", "1.2-3")
    // Only use UUID for items without ID or for manually added rows
    const preserveOrGenerateIds = (items: any[]) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => ({ 
        ...item, 
        id: item.id || uuidv4() // Keep original ID if exists, otherwise generate UUID
      }));
    };

    const newData = {
      technicalParticulars: preserveOrGenerateIds(flattenSectionData(template.technicalParticulars)),
      inspectionTestingPlans: preserveOrGenerateIds(flattenSectionData(template.inspectionTestingPlans)),
      documentRequestSheets: preserveOrGenerateIds(flattenSectionData(template.documentRequestSheets)),
      performanceGuarantees: preserveOrGenerateIds(flattenSectionData(template.performanceGuarantees)),
    };
    
    console.log('📋 New TPG data length:', newData.technicalParticulars.length);
    console.log('📋 New TPG data first 3:', newData.technicalParticulars.slice(0, 3));
    
    onChange(newData);
    
    // Set the render mode based on template
    setCurrentRenderMode(template.renderMode || "table");
    
    // Track which template is currently loaded
    setCurrentTemplateName(template.name);

    setSelectedTemplateId("");
  };
  
  // Helper to get default columns if template doesn't have column config
  const getDefaultTPGColumns = (): ColumnConfig[] => [
    { key: "specification", label: "Spesifikasi", width: "34%" },
    { key: "ownerRequest", label: "Owner Request", width: "33%" },
    { key: "vendorProposed", label: "Vendor Proposed & Guarantee", width: "33%" }
  ];
  
  // Get columns for TPG table (from data structure or use default)
  const getTPGColumns = (): ColumnConfig[] => {
    // If no data, use default
    if (!formData.technicalParticulars || formData.technicalParticulars.length === 0) {
      return getDefaultTPGColumns();
    }
    
    // Find first non-header item (header items only have description field)
    const firstDataItem = formData.technicalParticulars.find(item => {
      const keys = Object.keys(item).filter(k => k !== 'id');
      // A data row has more than just description
      return keys.length > 1;
    });
    
    // If no data items found (only headers), use default
    if (!firstDataItem) {
      console.log('⚠️ No data items found, using default format');
      return getDefaultTPGColumns();
    }
    
    const itemKeys = Object.keys(firstDataItem).filter(k => k !== 'id');
    
    console.log('🔍 TPG Column Detection:', {
      firstDataItem,
      itemKeys,
      hasSpec1: itemKeys.includes('spec1'),
      hasUnit: itemKeys.includes('unit'),
      hasRequired: itemKeys.includes('required'),
      hasProposedGuaranteed: itemKeys.includes('proposedGuaranteed'),
      hasSpecified: itemKeys.includes('specified'),
      hasProposedGuarantee: itemKeys.includes('proposedGuarantee'),
      hasSpecification: itemKeys.includes('specification')
    });
    
    console.log('📊 First data item type:', Array.isArray(firstDataItem) ? 'Array' : 'Object');
    
    // Check for multi-column Battery format (has spec1, spec2, spec3, spec4)
    // This uses a single wide "specificationRequirements" column with nested content
    if (itemKeys.includes('spec1') && itemKeys.includes('vendorPTX')) {
      console.log('✅ Using multi-column Battery format (single spec column with nested content)');
      return [
        { key: "specificationRequirements", label: "SPESIFICATION REQUIREMENTS", width: "45%" },
        { key: "vendorPTX", label: "PT. X", width: "13%" },
        { key: "vendorPTY", label: "PT. Y", width: "13%" },
        { key: "vendorPTZ", label: "PT. Z", width: "13%" },
        { key: "keterangan", label: "KETERANGAN", width: "16%" }
      ];
    }
    
    // Check for old Battery format (has specificationRequirements, vendorPTX, vendorPTY, vendorPTZ, keterangan)
    if (itemKeys.includes('specificationRequirements') && itemKeys.includes('vendorPTX')) {
      console.log('✅ Using Battery format (6 columns with merged header)');
      return [
        { key: "specificationRequirements", label: "SPESIFICATION REQUIREMENTS", width: "30%" },
        { key: "vendorPTX", label: "PT. X", width: "15%" },
        { key: "vendorPTY", label: "PT. Y", width: "15%" },
        { key: "vendorPTZ", label: "PT. Z", width: "15%" },
        { key: "keterangan", label: "KETERANGAN", width: "25%" }
      ];
    }
    
    // Check for AVR format (has unit, required, proposedGuaranteed, remarks)
    if (itemKeys.includes('unit') && itemKeys.includes('required') && itemKeys.includes('proposedGuaranteed')) {
      console.log('✅ Using AVR format (6 columns)');
      return [
        { key: "description", label: "DESCRIPTION", width: "25%" },
        { key: "unit", label: "UNIT", width: "10%" },
        { key: "required", label: "REQUIRED", width: "20%" },
        { key: "proposedGuaranteed", label: "PROPOSED AND GUARANTEED", width: "25%" },
        { key: "remarks", label: "REMARKS", width: "20%" }
      ];
    }
    
    // Check for Arrester format (has description, specified, proposedGuarantee)
    if (itemKeys.includes('description') && itemKeys.includes('specified')) {
      console.log('✅ Using Arrester format (3 columns)');
      return [
        { key: "description", label: "DESCRIPTION", width: "40%" },
        { key: "specified", label: "SPECIFIED", width: "30%" },
        { key: "proposedGuarantee", label: "PROPOSED & GUARANTEE", width: "30%" }
      ];
    }
    
    // Otherwise use default format
    console.log('⚠️ Using default format (old 3 columns)');
    return getDefaultTPGColumns();
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900 bg-blue-100 px-4 py-2 rounded">
        Lampiran
      </h2>

      <section className="rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800">Upload File Lampiran</h3>
        {isEditing && <input type="file" accept=".doc,.docx,.pdf,.xls,.xlsx,application/pdf,application/msword,application/vnd.ms-excel" onChange={handleAttachmentUpload} disabled={uploadingAttachment} className="mt-3 block w-full text-sm" />}
        <p className="mt-1 text-xs text-gray-500">Format Word, PDF, Excel (maks. 25MB). Approver dapat mengunduh file dari daftar di bawah.</p>
        {uploadingAttachment && <p className="text-sm text-blue-600">Mengupload...</p>}
        {attachmentError && <p className="text-sm text-red-600">{attachmentError}</p>}
        <ul className="mt-3 space-y-2">
          {(formData.attachments || []).map((attachment) => <li key={attachment.id} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"><a href={`/${attachment.url}`} download={attachment.name} className="text-blue-600 hover:underline">Unduh {attachment.name}</a>{isEditing && <button type="button" onClick={() => removeAttachment(attachment.id)} className="text-red-600" aria-label={`Hapus ${attachment.name}`}><Trash2 size={15} /></button>}</li>)}
        </ul>
      </section>

      {/* Template Selection Dropdown */}
      {isEditing && templates.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Template (Opsional)
          </label>
          <select
            id="template-select"
            value={selectedTemplateId}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-full md:w-96 px-3 py-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base bg-white"
          >
            <option value="">-- Pilih Template --</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.description && ` - ${template.description}`}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-600">
            Template akan mengisi semua tabel di bawah dengan data default. Anda dapat mengedit data setelahnya.
          </p>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Konfirmasi Penggantian Data"
        message={confirmModal.confirmMessage}
        onConfirm={() => {
          if (confirmModal.confirmCallback) {
            confirmModal.confirmCallback();
          }
          confirmModal.close();
        }}
        onClose={confirmModal.close}
        type={confirmModal.confirmType}
      />

      {/* 1. Technical Particular & Guarantee (TPG) */}
      <div className="space-y-4">
        <div 
          className="flex justify-between items-center cursor-pointer bg-gray-50 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors" 
          onClick={() => toggleSection('tpg')}
        >
          <h3 className="text-lg font-medium text-gray-900">1. Technical Particular & Guarantee (TPG)</h3>
          {collapsedSections.tpg ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </div>

        {!collapsedSections.tpg && (
        <div className="space-y-6">
        {/* Conditional rendering: Spreadsheet or Table */}
        {(() => {
          console.log('🎭 TPG Render Mode:', currentRenderMode);
          return null;
        })()}
        {currentRenderMode === "spreadsheet" ? (
          // Spreadsheet mode for complex templates like AVR
          <div className="space-y-4">
            <SpreadsheetEditor
              data={(() => {
                // Convert JSON data to spreadsheet matrix
                const columns = getTPGColumns();
                const matrix: Matrix<CellBase> = [];
                
                // Add data rows (NO header row - Spreadsheet component shows columnLabels)
                (formData.technicalParticulars || []).forEach((item: any) => {
                  const rowData = columns.map(col => ({
                    value: item[col.key] || "",
                  }));
                  matrix.push(rowData);
                });
                
                // Add empty rows if needed (minimum 5 rows for usability)
                if (matrix.length < 5) {
                  for (let i = matrix.length; i < 5; i++) {
                    matrix.push(columns.map(() => ({ value: "" })));
                  }
                }
                
                return matrix;
              })()}
              onChange={(newData) => {
                // Convert spreadsheet matrix back to JSON
                const columns = getTPGColumns();
                const result: any[] = [];
                
                // Also preserve original IDs where possible
                const originalItems = formData.technicalParticulars || [];
                
                // Process all rows (no header row to skip)
                for (let i = 0; i < newData.length; i++) {
                  const row = newData[i];
                  if (!row || row.every(cell => !cell?.value)) continue; // Skip empty rows
                  
                  // Try to keep original ID if the row index matches
                  const originalId = originalItems[i]?.id;
                  const obj: any = { id: originalId || uuidv4() };
                  columns.forEach((col, j) => {
                    obj[col.key] = row[j]?.value || "";
                  });
                  result.push(obj);
                }
                
                onChange({ technicalParticulars: result });
              }}
              headers={getTPGColumns().map(c => c.label)}
              rowLabels={(() => {
                // Generate row labels based on item IDs
                // Section headers (IDs without hyphen-letter like "1", "1.1") show the section number
                // Data rows (IDs with hyphen-letter like "1-a", "1.1-a") show empty string
                const items = formData.technicalParticulars || [];
                const labels: string[] = [];
                
                items.forEach((item: any) => {
                  const id = item.id || "";
                  const hasHyphenLetter = /-[a-z]/.test(id);
                  const isLegacyHeader = id.endsWith('-0');
                  
                  if (isLegacyHeader) {
                    // Legacy format: "1-0" -> "1"
                    labels.push(id.replace('-0', ''));
                  } else if (!hasHyphenLetter && id) {
                    // New format header: "1", "1.1", "1.10" etc.
                    labels.push(id);
                  } else {
                    // Data row: show empty
                    labels.push("");
                  }
                });
                
                // Add empty labels for any extra empty rows
                const currentLength = labels.length;
                if (currentLength < 5) {
                  for (let i = currentLength; i < 5; i++) {
                    labels.push("");
                  }
                }
                
                return labels;
              })()}
              isEditing={isEditing === true}
            />
            <p className="text-sm text-gray-500">
              💡 Tips: Anda dapat copy-paste data dari Excel langsung ke spreadsheet di atas
            </p>
          </div>
        ) : currentTemplateName === "Battery" ? (
          // Custom Battery component with advanced layout and SVG chart
          <BatteryTemplate
            data={formData.technicalParticulars || []}
            onChange={(updatedData) => onChange({ technicalParticulars: updatedData })}
            isEditing={isEditing === true}
          />
        ) : (
          // Table mode for simple templates like Arrester
          <>
        <div className={tableContainer}>
          {(() => {
            const columns = getTPGColumns();
            const firstColumnKey = columns[0]?.key || 'specification';
            
            // Check if this is Battery format (has vendorPTX column)
            const isBatteryFormat = columns.some(col => col.key === 'vendorPTX');
            // Check if this is multi-column Battery format (has spec1-spec4)
            const isMultiColumnBattery = columns.some(col => col.key === 'spec1');
            
            return (
              <table className={`${tableClass} min-w-[1200px] border-collapse`}>
                <thead className="bg-gray-50">
                  {isMultiColumnBattery ? (
                    // Multi-column Battery format: Two-row header with single SPESIFICATION REQUIREMENTS + NAMA VENDOR
                    <>
                      <tr>
                        <th className={`${thClass} w-12`} rowSpan={2}>NO</th>
                        <th className={`${thClass}`} style={{ width: "40%" }} rowSpan={2}>SPESIFICATION REQUIREMENTS</th>
                        <th className={`${thClass}`} colSpan={3}>NAMA VENDOR</th>
                        <th className={`${thClass}`} style={{ width: "17%" }} rowSpan={2}>KETERANGAN</th>
                        {isEditing && <th className={`${thClass} w-12`} rowSpan={2}></th>}
                      </tr>
                      <tr>
                        <th className={`${thClass}`} style={{ width: "10%" }}>PT. X</th>
                        <th className={`${thClass}`} style={{ width: "10%" }}>PT. Y</th>
                        <th className={`${thClass}`} style={{ width: "10%" }}>PT. Z</th>
                      </tr>
                    </>
                  ) : isBatteryFormat ? (
                    // Old Battery format: Single spec column + NAMA VENDOR
                    <>
                      <tr>
                        <th className={`${thClass} w-20`} rowSpan={2}>NO</th>
                        <th className={`${thClass}`} style={{ width: "30%" }} rowSpan={2}>SPESIFICATION REQUIREMENTS</th>
                        <th className={`${thClass}`} colSpan={3}>NAMA VENDOR</th>
                        <th className={`${thClass}`} style={{ width: "25%"  }} rowSpan={2}>KETERANGAN</th>
                        {isEditing && <th className={`${thClass} w-20`} rowSpan={2}></th>}
                      </tr>
                      <tr>
                        <th className={`${thClass}`} style={{ width: "15%" }}>PT. X</th>
                        <th className={`${thClass}`} style={{ width: "15%" }}>PT. Y</th>
                        <th className={`${thClass}`} style={{ width: "15%" }}>PT. Z</th>
                      </tr>
                    </>
                  ) : (
                    // Standard single-row header for other formats
                    <tr>
                      <th className={`${thClass} w-20`}>No.</th>
                      {columns.map((col) => (
                        <th key={col.key} className={thClass} style={{ width: col.width }}>
                          {col.label}
                        </th>
                      ))}
                      {isEditing && <th className={`${thClass} w-20`}></th>}
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    return (formData.technicalParticulars || []).map((item, index) => {
                      // Debug each item
                      if (index < 3) {
                        console.log(`🔍 Row ${index}:`, {
                          id: item.id,
                          hasSpec1: 'spec1' in item,
                          spec1Value: (item as any).spec1,
                          isSectionHeader: (item as any).isSectionHeader,
                          keys: Object.keys(item)
                        });
                      }
                      
                      // Check if this item has spec1 field (multi-column Battery format)
                      const hasSpec1 = 'spec1' in item;
                      const isMultiColumnBatteryRow = isBatteryFormat && hasSpec1;
                      
                      console.log(`Row ${item.id}: isMultiColumnBatteryRow=${isMultiColumnBatteryRow}, isBatteryFormat=${isBatteryFormat}, hasSpec1=${hasSpec1}`);
                      
                      // For Battery format: check isSectionHeader flag (set during flattening)
                      const isBatterySectionHeader = isBatteryFormat && (item as any).isSectionHeader;
                      
                      // For non-Battery formats, detect header rows by ID patterns or content
                      const hasHyphenLetter = item.id && /-[a-z]/.test(item.id);
                      const isLegacyHeader = item.id && item.id.endsWith('-0');
                      const isNewFormatHeader = !isBatteryFormat && item.id && !hasHyphenLetter && !isLegacyHeader;
                      
                      const isHeaderByContent = !isBatteryFormat && item.description && 
                        !item.specified && !item.proposedGuarantee &&  // Arrester format
                        (!item.unit || item.unit === '-') && !item.required && !item.proposedGuaranteed && !item.remarks; // AVR format
                      
                      // Combined header detection
                      const isHeaderRow = isBatterySectionHeader || isLegacyHeader || isNewFormatHeader || isHeaderByContent;
                      
                      // Determine section color and styling
                      let rowBgClass = "bg-white hover:bg-gray-50";
                      let textColorClass = "text-gray-900";
                      
                      if (isHeaderRow) {
                        // Section headers get special styling
                        rowBgClass = "bg-blue-100";
                        textColorClass = "text-gray-900 font-bold";
                        
                        // For non-Battery formats with specific section colors
                        if (!isBatteryFormat) {
                          const firstFieldValue = item[firstColumnKey] || '';
                          const upperText = firstFieldValue.toUpperCase();
                          
                          if (upperText.includes("SPEC ARRESTER")) {
                            rowBgClass = "bg-yellow-300";
                          } else if (upperText.includes("SPEC COUNTER LA")) {
                            rowBgClass = "bg-orange-400";
                          } else if (upperText.includes("INSPECTION") && upperText.includes("FACTORY")) {
                            rowBgClass = "bg-orange-200";
                          } else if (upperText.includes("INSPECTION") && upperText.includes("SITE")) {
                            rowBgClass = "bg-green-200";
                          } else if (upperText.includes("DOCUMENTS REQUIREMENT")) {
                            rowBgClass = "bg-blue-200";
                          }
                        }
                      }
                      
                      // For multi-column Battery format header rows
                      if (isMultiColumnBatteryRow && isHeaderRow) {
                        return (
                          <tr key={item.id} className={rowBgClass}>
                            <td className={`${tdClass} text-base ${textColorClass} text-center`}>
                              {item.id}
                            </td>
                            <td className={`${tdClass} text-base ${textColorClass}`}>
                              {(item as any).spec1}
                            </td>
                            <td className={`${tdClass}`}></td>
                            <td className={`${tdClass}`}></td>
                            <td className={`${tdClass}`}></td>
                            <td className={`${tdClass}`}></td>
                            {isEditing && <td className={`${tdClass}`}></td>}
                          </tr>
                        );
                      }
                      
                      // For old Battery format header rows
                      if (isBatteryFormat && !isMultiColumnBatteryRow && isHeaderRow) {
                        return (
                          <tr key={item.id} className={rowBgClass}>
                            <td className={`${tdClass} text-base ${textColorClass} text-center`}>
                              {item.id}
                            </td>
                            <td className={`${tdClass} text-base ${textColorClass}`}>
                              {item.specificationRequirements}
                            </td>
                            <td className={`${tdClass}`}></td>
                            <td className={`${tdClass}`}></td>
                            <td className={`${tdClass}`}></td>
                            <td className={`${tdClass}`}></td>
                            {isEditing && <td className={`${tdClass}`}></td>}
                          </tr>
                        );
                      }
                      
                      // For non-Battery format header rows
                      if (isHeaderRow && !isBatteryFormat) {
                        const sectionId = item.id ? item.id.split('-')[0] : '';
                        
                        return (
                          <tr key={item.id} className={rowBgClass}>
                            <td className={`${tdClass} text-sm ${textColorClass} text-center`}>
                              {sectionId}
                            </td>
                            <td colSpan={columns.length} className={`${tdClass} text-sm ${textColorClass}`}>
                              {item.description}
                            </td>
                            {isEditing && <td className={`${tdClass}`}></td>}
                          </tr>
                        );
                      }
                      
                      // Regular data rows for multi-column Battery format (spec1-spec4)
                      // Uses nested table inside SPESIFICATION REQUIREMENTS cell
                      if (isMultiColumnBatteryRow) {
                        return (
                          <tr key={item.id} className={rowBgClass}>
                            <td className={`${tdClass} text-base ${textColorClass} font-medium text-center`}>
                              {item.id}
                            </td>
                            <td className={`${tdClass} p-0 border border-gray-400`}>
                              {/* Nested table for spec1-spec4 inside single cell */}
                              {(() => {
                                const hasMerge = (item as any).mergeSpec1Rows;
                                const spec1Empty = !(item as any).spec1 || (item as any).spec1.trim() === '';
                                
                                return (
                                  <table className="w-full table-fixed border-collapse">
                                    <colgroup>
                                      <col style={{ width: '30%' }} />
                                      <col style={{ width: '25%' }} />
                                      <col style={{ width: '25%' }} />
                                      <col style={{ width: '20%' }} />
                                    </colgroup>
                                    <tbody>
                                      <tr>
                                        {/* Only render spec1 cell if it has content OR has merge info */}
                                        {(hasMerge || !spec1Empty) && (
                                          <td 
                                            className="border-r border-gray-400 p-1 align-top"
                                          >
                                            <textarea
                                              value={(item as any).spec1 || ''}
                                              onChange={(e) => updateItem("technicalParticulars", item.id, "spec1", e.target.value)}
                                              disabled={!isEditing}
                                              rows={1}
                                              className={`w-full text-xs px-1 py-1 resize-none overflow-hidden border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 ${!isEditing ? 'bg-transparent' : 'bg-white'}`}
                                              style={{ minHeight: '24px' }}
                                              onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = 'auto';
                                                target.style.height = target.scrollHeight + 'px';
                                              }}
                                            />
                                          </td>
                                        )}
                                        {/* Skip spec1 cell if empty (part of merged cell) */}
                                        <td className="border-r border-gray-400 p-1 align-top">
                                          <textarea
                                            value={(item as any).spec2 || ''}
                                            onChange={(e) => updateItem("technicalParticulars", item.id, "spec2", e.target.value)}
                                            disabled={!isEditing}
                                            rows={1}
                                            className={`w-full text-xs px-1 py-1 resize-none overflow-hidden border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 ${!isEditing ? 'bg-transparent' : 'bg-white'}`}
                                            style={{ minHeight: '24px' }}
                                            onInput={(e) => {
                                              const target = e.target as HTMLTextAreaElement;
                                              target.style.height = 'auto';
                                              target.style.height = target.scrollHeight + 'px';
                                            }}
                                          />
                                        </td>
                                        <td className="border-r border-gray-400 p-1 align-top">
                                          <textarea
                                            value={(item as any).spec3 || ''}
                                            onChange={(e) => updateItem("technicalParticulars", item.id, "spec3", e.target.value)}
                                            disabled={!isEditing}
                                            rows={1}
                                            className={`w-full text-xs px-1 py-1 resize-none overflow-hidden border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 ${!isEditing ? 'bg-transparent' : 'bg-white'}`}
                                            style={{ minHeight: '24px' }}
                                            onInput={(e) => {
                                              const target = e.target as HTMLTextAreaElement;
                                              target.style.height = 'auto';
                                              target.style.height = target.scrollHeight + 'px';
                                            }}
                                          />
                                        </td>
                                        <td className="p-1 align-top">
                                          <textarea
                                            value={(item as any).spec4 || ''}
                                            onChange={(e) => updateItem("technicalParticulars", item.id, "spec4", e.target.value)}
                                            disabled={!isEditing}
                                            rows={1}
                                            className={`w-full text-xs px-1 py-1 resize-none overflow-hidden border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 ${!isEditing ? 'bg-transparent' : 'bg-white'}`}
                                            style={{ minHeight: '24px' }}
                                            onInput={(e) => {
                                              const target = e.target as HTMLTextAreaElement;
                                              target.style.height = 'auto';
                                              target.style.height = target.scrollHeight + 'px';
                                            }}
                                          />
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                );
                              })()}
                            </td>
                            <td className={`${tdClass} p-1 border border-gray-400 align-top`}>
                              <textarea
                                value={(item as any).vendorPTX || ''}
                                onChange={(e) => updateItem("technicalParticulars", item.id, "vendorPTX", e.target.value)}
                                disabled={!isEditing}
                                rows={1}
                                className={`w-full text-xs px-1 py-1 resize-none overflow-hidden border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 ${!isEditing ? 'bg-transparent' : 'bg-white'}`}
                                style={{ minHeight: '24px' }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                            </td>
                            <td className={`${tdClass} p-1 border border-gray-400 align-top`}>
                              <textarea
                                value={(item as any).vendorPTY || ''}
                                onChange={(e) => updateItem("technicalParticulars", item.id, "vendorPTY", e.target.value)}
                                disabled={!isEditing}
                                rows={1}
                                className={`w-full text-xs px-1 py-1 resize-none overflow-hidden border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 ${!isEditing ? 'bg-transparent' : 'bg-white'}`}
                                style={{ minHeight: '24px' }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                            </td>
                            <td className={`${tdClass} p-1 border border-gray-400 align-top`}>
                              <textarea
                                value={(item as any).vendorPTZ || ''}
                                onChange={(e) => updateItem("technicalParticulars", item.id, "vendorPTZ", e.target.value)}
                                disabled={!isEditing}
                                rows={1}
                                className={`w-full text-xs px-1 py-1 resize-none overflow-hidden border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 ${!isEditing ? 'bg-transparent' : 'bg-white'}`}
                                style={{ minHeight: '24px' }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                            </td>
                            <td className={`${tdClass} p-1 border border-gray-400 align-top`}>
                              <textarea
                                value={(item as any).keterangan || ''}
                                onChange={(e) => updateItem("technicalParticulars", item.id, "keterangan", e.target.value)}
                                disabled={!isEditing}
                                rows={1}
                                className={`w-full text-xs px-1 py-1 resize-none overflow-hidden border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 ${!isEditing ? 'bg-transparent' : 'bg-white'}`}
                                style={{ minHeight: '24px' }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                            </td>
                            {isEditing && (
                              <td className={`${tdClass} text-center`}>
                                <button
                                  type="button"
                                  onClick={() => removeItem("technicalParticulars", item.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      }
                      
                      // Regular data rows for old Battery format
                      if (isBatteryFormat) {
                        return (
                          <tr key={item.id} className={rowBgClass}>
                            <td className={`${tdClass} text-base ${textColorClass} font-medium text-center`}>
                              {item.id}
                            </td>
                            <td className={tdClass}>
                              <input
                                type="text"
                                value={item.specificationRequirements || ''}
                                onChange={(e) => updateItem("technicalParticulars", item.id, "specificationRequirements", e.target.value)}
                                disabled={!isEditing}
                                className={inputClass}
                              />
                            </td>
                            <td className={tdClass}>
                              <input
                                type="text"
                                value={item.vendorPTX || ''}
                                onChange={(e) => updateItem("technicalParticulars", item.id, "vendorPTX", e.target.value)}
                                disabled={!isEditing}
                                className={inputClass}
                              />
                            </td>
                            <td className={tdClass}>
                              <input
                                type="text"
                                value={item.vendorPTY || ''}
                                onChange={(e) => updateItem("technicalParticulars", item.id, "vendorPTY", e.target.value)}
                                disabled={!isEditing}
                                className={inputClass}
                              />
                            </td>
                            <td className={tdClass}>
                              <input
                                type="text"
                                value={item.vendorPTZ || ''}
                                onChange={(e) => updateItem("technicalParticulars", item.id, "vendorPTZ", e.target.value)}
                                disabled={!isEditing}
                                className={inputClass}
                              />
                            </td>
                            <td className={tdClass}>
                              <input
                                type="text"
                                value={item.keterangan || ''}
                                onChange={(e) => updateItem("technicalParticulars", item.id, "keterangan", e.target.value)}
                                disabled={!isEditing}
                                className={inputClass}
                              />
                            </td>
                            {isEditing && (
                              <td className={`${tdClass} text-center`}>
                                <button
                                  type="button"
                                  onClick={() => removeItem("technicalParticulars", item.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      }
                      
                      // Regular data rows for other formats
                      return (
                        <tr key={item.id} className={rowBgClass}>
                          <td className={`${tdClass} text-base ${textColorClass} font-medium text-center`}>
                            
                          </td>
                          {columns.map((col) => (
                            <td key={col.key} className={tdClass}>
                              <input
                                type="text"
                                value={item[col.key] || ''}
                                onChange={(e) => updateItem("technicalParticulars", item.id, col.key, e.target.value)}
                                disabled={!isEditing}
                                className={inputClass}
                                placeholder={col.label}
                              />
                            </td>
                          ))}
                          {isEditing && (
                            <td className={`${tdClass} text-center`}>
                              <button
                                type="button"
                                onClick={() => removeItem("technicalParticulars", item.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })()}
                  {(formData.technicalParticulars || []).length === 0 && (
                    <tr>
                      <td colSpan={isEditing ? getTPGColumns().length + 2 : getTPGColumns().length + 1} className="px-6 py-8 text-center text-base text-gray-500">
                        Belum ada data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          })()}
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={() => {
              const columns = getTPGColumns();
              const newItem: any = { id: uuidv4() };
              columns.forEach(col => {
                newItem[col.key] = "";
              });
              addItem("technicalParticulars", newItem);
            }}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={16} className="mr-1" /> Tambah Baris
          </button>
        )}
          </>
        )}
        </div>
        )}
      </div>

      {/* 2. Inspection Testing Plan (ITP) */}
      <div className="space-y-4">
        <div 
          className="flex justify-between items-center cursor-pointer bg-gray-50 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors" 
          onClick={() => toggleSection('itp')}
        >
          <h3 className="text-lg font-medium text-gray-900">2. Inspection Testing Plan (ITP)</h3>
          {collapsedSections.itp ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </div>

        {!collapsedSections.itp && (
        <div className="space-y-4">

        <div className={tableContainer}>
          <table className={`${tableClass} min-w-[1350px]`}>
            <thead className="bg-gray-50">
              <tr>
                <th className={`${thClass} w-20`}>No.</th>
                <th className={thClass}>Testing Items</th>
                <th className={thClass}>Testing Method</th>
                <th className={thClass}>Standard Test Reference</th>
                <th className={thClass}>Tested by</th>
                <th className={thClass}>Witness by</th>
                <th className={thClass}>Acceptance Criteria</th>
                {isEditing && <th className={`${thClass} w-20`}></th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(formData.inspectionTestingPlans || []).map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className={`${tdClass} text-base text-gray-700 font-medium`}>{index + 1}</td>
                  <td className={tdClass}><input type="text" value={item.testingItem} onChange={(e) => updateItem("inspectionTestingPlans", item.id, "testingItem", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  <td className={tdClass}><input type="text" value={item.testingMethod} onChange={(e) => updateItem("inspectionTestingPlans", item.id, "testingMethod", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  <td className={tdClass}><input type="text" value={item.standardTestReference} onChange={(e) => updateItem("inspectionTestingPlans", item.id, "standardTestReference", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  <td className={tdClass}><input type="text" value={item.testedBy} onChange={(e) => updateItem("inspectionTestingPlans", item.id, "testedBy", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  <td className={tdClass}><input type="text" value={item.witnessBy} onChange={(e) => updateItem("inspectionTestingPlans", item.id, "witnessBy", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  <td className={tdClass}><input type="text" value={item.acceptanceCriteria} onChange={(e) => updateItem("inspectionTestingPlans", item.id, "acceptanceCriteria", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  {isEditing && (
                    <td className={`${tdClass} text-center`}>
                      <button onClick={() => removeItem("inspectionTestingPlans", item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                    </td>
                  )}
                </tr>
              ))}
              {(formData.inspectionTestingPlans || []).length === 0 && (
                <tr><td colSpan={isEditing ? 8 : 7} className="px-6 py-8 text-center text-base text-gray-500">Belum ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={() => addItem("inspectionTestingPlans", { id: uuidv4(), testingItem: "", testingMethod: "", standardTestReference: "", testedBy: "", witnessBy: "", acceptanceCriteria: "" })}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={16} className="mr-1" /> Tambah Baris
          </button>
        )}
        </div>
        )}
      </div>

      {/* 3. Document Request Sheet (DRS) */}
      <div className="space-y-4">
        <div 
          className="flex justify-between items-center cursor-pointer bg-gray-50 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors" 
          onClick={() => toggleSection('drs')}
        >
          <h3 className="text-lg font-medium text-gray-900">3. Document Request Sheet (DRS)</h3>
          {collapsedSections.drs ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </div>

        {!collapsedSections.drs && (
        <div className="space-y-4">

        <div className={tableContainer}>
          <table className={`${tableClass} min-w-[950px]`}>
            <thead className="bg-gray-50">
              <tr>
                <th className={`${thClass} w-20`}>No.</th>
                <th className={thClass}>Document Requirement</th>
                <th className={thClass}>Document Types</th>
                {isEditing && <th className={`${thClass} w-20`}></th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(formData.documentRequestSheets || []).map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className={`${tdClass} text-base text-gray-700 font-medium`}>{index + 1}</td>
                  <td className={tdClass}><input type="text" value={item.documentRequirement} onChange={(e) => updateItem("documentRequestSheets", item.id, "documentRequirement", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  <td className={tdClass}><input type="text" value={item.documentType} onChange={(e) => updateItem("documentRequestSheets", item.id, "documentType", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  {isEditing && (
                    <td className={`${tdClass} text-center`}>
                      <button onClick={() => removeItem("documentRequestSheets", item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                    </td>
                  )}
                </tr>
              ))}
              {(formData.documentRequestSheets || []).length === 0 && (
                <tr><td colSpan={isEditing ? 4 : 3} className="px-6 py-8 text-center text-base text-gray-500">Belum ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={() => addItem("documentRequestSheets", { id: uuidv4(), documentRequirement: "", documentType: "" })}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={16} className="mr-1" /> Tambah Baris
          </button>
        )}
        </div>
        )}
      </div>

      {/* 4. Performance Guarantee Requirement Sheet (PGRS) */}
      <div className="space-y-4">
        <div 
          className="flex justify-between items-center cursor-pointer bg-gray-50 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors" 
          onClick={() => toggleSection('pgrs')}
        >
          <h3 className="text-lg font-medium text-gray-900">4. Performance Guarantee Requirement Sheet (PGRS)</h3>
          {collapsedSections.pgrs ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </div>

        {!collapsedSections.pgrs && (
        <div className="space-y-4">

        <div className={tableContainer}>
          <table className={`${tableClass} min-w-[1350px]`}>
            <thead className="bg-gray-50">
              <tr>
                <th className={`${thClass} w-20`}>No.</th>
                <th className={thClass}>Plant Item</th>
                <th className={thClass}>Performance Guarantee Parameter (s)</th>
                <th className={thClass}>Baseline Parameter (s)</th>
                <th className={thClass}>Verification Method</th>
                <th className={thClass}>Remedial Measure Allowed</th>
                {isEditing && <th className={`${thClass} w-20`}></th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(formData.performanceGuarantees || []).map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className={`${tdClass} text-base text-gray-700 font-medium`}>{index + 1}</td>
                  <td className={tdClass}><input type="text" value={item.plantItem} onChange={(e) => updateItem("performanceGuarantees", item.id, "plantItem", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  <td className={tdClass}><input type="text" value={item.performanceParameter} onChange={(e) => updateItem("performanceGuarantees", item.id, "performanceParameter", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  <td className={tdClass}><input type="text" value={item.baselineParameter} onChange={(e) => updateItem("performanceGuarantees", item.id, "baselineParameter", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  <td className={tdClass}><input type="text" value={item.verificationMethod} onChange={(e) => updateItem("performanceGuarantees", item.id, "verificationMethod", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  <td className={tdClass}><input type="text" value={item.remedialMeasure} onChange={(e) => updateItem("performanceGuarantees", item.id, "remedialMeasure", e.target.value)} disabled={!isEditing} className={inputClass} /></td>
                  {isEditing && (
                    <td className={`${tdClass} text-center`}>
                      <button onClick={() => removeItem("performanceGuarantees", item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                    </td>
                  )}
                </tr>
              ))}
              {(formData.performanceGuarantees || []).length === 0 && (
                <tr><td colSpan={isEditing ? 7 : 6} className="px-6 py-8 text-center text-base text-gray-500">Belum ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={() => addItem("performanceGuarantees", { id: uuidv4(), plantItem: "", performanceParameter: "", baselineParameter: "", verificationMethod: "", remedialMeasure: "" })}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={16} className="mr-1" /> Tambah Baris
          </button>
        )}
        </div>
        )}
      </div>
    </div>
  );
}
