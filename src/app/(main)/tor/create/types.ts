// Types for ToR Form
import type * as Y from "yjs";

// NEW: Director Proposal types
export interface DirectorProposal {
  id: string;
  name: string; // Nama jabatan Direksi Pekerjaan
}

export interface FieldDirectorProposal {
  id: string;
  name: string; // Nama jabatan Direksi Lapangan
}

// Approval Signature for Tab 5
export interface ApprovalSignature {
  id: string;
  role: string;  // "Dibuat oleh", "Diperiksa oleh", "Disetujui oleh"
  name: string;
  position: string;
  date: string;
}

// Tab 6 Column Configuration
export interface ColumnConfig {
  key: string;
  label: string;
  width?: string;
}

// Tab 6 Interfaces - Flexible structure to support different column configs
export interface TechnicalParticular {
  id: string;
  [key: string]: string; // Allow dynamic fields based on column config
}

export interface InspectionTestingPlan {
  id: string;
  [key: string]: string; // Allow dynamic fields based on column config
}

export interface DocumentRequestSheet {
  id: string;
  [key: string]: string; // Allow dynamic fields based on column config
}

export interface PerformanceGuarantee {
  id: string;
  [key: string]: string; // Allow dynamic fields based on column config
}

export interface TorFormData {
  id?: number;
  number?: string;
  title: string;
  description?: string;
  bidangId?: number;
  
  // Tab 1: Informasi Umum
  creationDate?: string;
  creationYear?: number;
  budgetType?: string;
  workType?: string;
  program?: string;
  rkaYear?: number;
  projectStartDate?: string;
  projectEndDate?: string;
  executionYear?: number;
  materialJasaValue?: number;
  budgetCurrency?: string | null;
  budgetAmount?: number | null;
  coverImage?: string | null;
  
  // Tab 2: Pendahuluan
  introduction?: string;
  background?: string;
  objective?: string;
  scope?: string;
  warranty?: string; // Garansi
  acceptanceCriteria?: string; // Kriteria yang diterima
  
  // Tab 3: Tahapan Pekerjaan
  duration?: number;
  durationUnit?: string;
  technicalSpec?: string;
  workStages?: WorkStagesTable; // Work stages Gantt table
  workStagesExplanation?: string; // Table explanation
  deliveryRequirements?: string; // Persyaratan Pengiriman
  handoverPoint?: string; // Titik Serah Terima
  handoverMechanism?: string; // Mekanisme Serah Terima
  generalProvisions?: string;
  deliveryPoint?: string; // DEPRECATED: use handoverPoint
  deliveryMechanism?: string; // DEPRECATED: use handoverMechanism
  
  // Tab 4: Usulan
  directorProposals?: DirectorProposal[]; // Array of Direksi Pekerjaan
  fieldDirectorProposals?: FieldDirectorProposal[]; // Array of Direksi Lapangan
  vendorRequirements?: string; // TiptapEditor HTML
  procurementMethod?: string; // TiptapEditor HTML
  paymentTerms?: string; // TiptapEditor HTML
  penaltyRules?: string; // TiptapEditor HTML
  otherRequirements?: string; // TiptapEditor HTML
  riskAssessment?: string; // TiptapEditor HTML - Risk Assessment
  revisionTermOfReference?: string;
  subtotal?: number;
  ppn?: number;
  ppnRate?: number; // PPN percentage (e.g., 11 for 11%)
  ppnIncluded?: boolean;
  pph?: number;
  grandTotal?: number;
  
  // Tab 5: Lembar Pengesahan
  approvalSignatures?: ApprovalSignature[];
  
  // Legacy fields (deprecated - for backward compatibility)
  directorProposal?: string;
  fieldDirectorProposal?: string;
  
  // Tab 6: Lampiran
  technicalParticulars?: TechnicalParticular[];
  inspectionTestingPlans?: InspectionTestingPlan[];
  documentRequestSheets?: DocumentRequestSheet[];
  performanceGuarantees?: PerformanceGuarantee[];
  attachments?: TorAttachment[];
  
  // Budget Items
  budgetItems?: BudgetItem[];
  
  // Metadata
  statusStage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TorAttachment {
  id: string;
  name: string;
  url: string;
  filename: string;
  type: string;
  size: number;
}

export interface BudgetItem {
  id?: number;
  item: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  orderIndex?: number;
}

// Work Stages Gantt Table Types
export interface WorkStagesTable {
  years: WorkStageYear[];
  rows: WorkStageRow[];
}

export interface WorkStageYear {
  id: string;
  label: string; // e.g., "2025", "2026"
  months: string[]; // 12 month labels
}

export interface WorkStageRow {
  id: string;
  no: number;
  description: string;
  schedule: Record<string, Record<number, boolean>>; // yearId -> monthIndex (0-11) -> isActive
}

export interface Tor extends TorFormData {
  id: number;
  number: string;
  bidang?: {
    id: number;
    name: string;
    code?: string;
  };
  creator?: {
    id: number;
    name: string;
    position?: {
      name: string;
    };
  };
  currentStepNumber: number;
  statusStage: string;
  isFinalApproved: boolean;
  isExported: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TabId = 
  | "informasi-umum"
  | "pendahuluan"
  | "tahapan-pekerjaan"
  | "usulan"
  | "lembar-pengesahan"
  | "lampiran";

export interface Tab {
  id: TabId;
  label: string;
  component: React.ComponentType<TabProps>;
}

export interface TabProps {
  formData: TorFormData;
  onChange: (data: Partial<TorFormData>) => void;
  errors?: Record<string, string>;
  isEditing?: boolean;
  // Collaboration props (opsional — jika tidak diisi, tab berfungsi seperti biasa)
  ydoc?: Y.Doc | null;
  awarenessProvider?: any;
  collabUser?: { name: string; color: string };
  torId?: number;
  bidangId?: number;
  creatorName?: string;
  creatorPosition?: string;
}