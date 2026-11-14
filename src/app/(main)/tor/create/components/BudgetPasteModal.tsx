"use client";

import { useState, useMemo } from "react";
import { BudgetItem } from "../types";
import {
  Clipboard,
  Check,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  Trash2,
  Plus,
  Replace,
  X,
} from "lucide-react";

interface BudgetPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (items: BudgetItem[], mode: "append" | "replace") => void;
  currency?: string;
  existingCount: number;
}

export function cleanNumber(val: any): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  let str = String(val).trim();
  str = str.replace(/^(rp\.?|idr)\s*/i, "").replace(/\s*(rp\.?|idr)$/i, "").trim();

  if (str.includes(".") && str.includes(",")) {
    const lastDot = str.lastIndexOf(".");
    const lastComma = str.lastIndexOf(",");
    if (lastComma > lastDot) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(".")) {
    const parts = str.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, "");
    }
  } else if (str.includes(",")) {
    const parts = str.split(",");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/,/g, "");
    } else {
      str = str.replace(",", ".");
    }
  }

  str = str.replace(/[^\d.-]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function parseCopiedRAB(text: string): BudgetItem[] {
  if (!text || !text.trim()) return [];

  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  let delimiter = "\t";
  const firstLine = lines[0];
  if (!firstLine.includes("\t")) {
    if (firstLine.includes(";") && firstLine.split(";").length >= 3) delimiter = ";";
    else if (firstLine.includes(",") && firstLine.split(",").length >= 3) delimiter = ",";
    else if (firstLine.includes("|") && firstLine.split("|").length >= 3) delimiter = "|";
  }

  let rawRows = lines.map((line) =>
    line.split(delimiter).map((cell) => cell.trim().replace(/^["']|["']$/g, ""))
  );

  const headerCheck = rawRows[0].join(" ").toLowerCase();
  const isHeader =
    headerCheck.includes("item") ||
    headerCheck.includes("nama") ||
    headerCheck.includes("deskripsi") ||
    headerCheck.includes("qty") ||
    headerCheck.includes("jumlah") ||
    headerCheck.includes("harga") ||
    headerCheck.includes("satuan") ||
    headerCheck.includes("unit") ||
    headerCheck.includes("price");

  if (isHeader) {
    rawRows = rawRows.slice(1);
  }

  const result: BudgetItem[] = [];

  for (const cols of rawRows) {
    if (cols.length === 0 || cols.every((c) => !c)) continue;

    let item = "";
    let description = "";
    let quantity = 1;
    let unit = "Set";
    let unitPrice = 0;

    if (cols.length >= 6) {
      const col0IsNo = /^\d+$/.test(cols[0]);
      if (col0IsNo) {
        item = cols[1] || "";
        description = cols[2] || "";
        quantity = cleanNumber(cols[3]) || 1;
        unit = cols[4] || "Set";
        unitPrice = cleanNumber(cols[5]) || 0;
      } else {
        item = cols[0] || "";
        description = cols[1] || "";
        quantity = cleanNumber(cols[2]) || 1;
        unit = cols[3] || "Set";
        unitPrice = cleanNumber(cols[4]) || 0;
      }
    } else if (cols.length === 5) {
      const col0IsNo = /^\d+$/.test(cols[0]);
      if (col0IsNo) {
        item = cols[1] || "";
        description = "";
        quantity = cleanNumber(cols[2]) || 1;
        unit = cols[3] || "Set";
        unitPrice = cleanNumber(cols[4]) || 0;
      } else {
        item = cols[0] || "";
        description = cols[1] || "";
        quantity = cleanNumber(cols[2]) || 1;
        unit = cols[3] || "Set";
        unitPrice = cleanNumber(cols[4]) || 0;
      }
    } else if (cols.length === 4) {
      item = cols[0] || "";
      const col1IsNum = !isNaN(cleanNumber(cols[1])) && cleanNumber(cols[1]) > 0;
      if (col1IsNum) {
        quantity = cleanNumber(cols[1]) || 1;
        unit = cols[2] || "Set";
        unitPrice = cleanNumber(cols[3]) || 0;
      } else {
        description = cols[1] || "";
        quantity = cleanNumber(cols[2]) || 1;
        unitPrice = cleanNumber(cols[3]) || 0;
      }
    } else if (cols.length === 3) {
      item = cols[0] || "";
      quantity = cleanNumber(cols[1]) || 1;
      unitPrice = cleanNumber(cols[2]) || 0;
    } else if (cols.length === 2) {
      item = cols[0] || "";
      unitPrice = cleanNumber(cols[1]) || 0;
    } else if (cols.length === 1) {
      item = cols[0] || "";
    }

    if (!item && !unitPrice && !description) continue;

    const totalPrice = Math.round(quantity * unitPrice * 100) / 100;

    result.push({
      item,
      description: description || "",
      quantity,
      unit: unit || "Set",
      unitPrice,
      totalPrice,
    });
  }

  return result;
}

export default function BudgetPasteModal({
  isOpen,
  onClose,
  onApply,
  currency = "IDR",
  existingCount = 0,
}: BudgetPasteModalProps) {
  const [pasteText, setPasteText] = useState("");
  const [mode, setMode] = useState<"append" | "replace">(
    existingCount > 0 ? "append" : "replace"
  );

  const parsedItems = useMemo(() => {
    return parseCopiedRAB(pasteText);
  }, [pasteText]);

  const previewSubtotal = useMemo(() => {
    return parsedItems.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  }, [parsedItems]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency || "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleApply = () => {
    if (parsedItems.length === 0) return;
    onApply(parsedItems, mode);
    setPasteText("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-gray-900 border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Copas RAB dari Excel / Spreadsheet
              </h2>
              <p className="text-xs text-gray-500">
                Paste baris data dari Excel, Google Sheets, atau tabel Word langsung ke sini.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Instructions Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <HelpCircle size={17} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Cara Mudah Copas Data:</p>
              <ol className="list-decimal ml-4 space-y-0.5 text-blue-800">
                <li>Buka file Excel / Spreadsheet Anda, pilih & blok tabel (dengan atau tanpa header).</li>
                <li>Tekan <strong>Ctrl + C</strong> (Copy) pada Excel.</li>
                <li>Klik kolom di bawah dan tekan <strong>Ctrl + V</strong> (Paste).</li>
                <li>
                  Format kolom yang didukung: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">Item | Deskripsi | Qty | Satuan | Harga Satuan</code> (atau dengan kolom No di awal).
                </li>
              </ol>
            </div>
          </div>

          {/* Textarea Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <Clipboard size={15} className="text-gray-500" />
                Tempel (Paste) Teks Tabel di Sini:
              </label>
              {pasteText && (
                <button
                  type="button"
                  onClick={() => setPasteText("")}
                  className="text-xs text-red-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Bersihkan
                </button>
              )}
            </div>
            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Klik di sini lalu tekan Ctrl + V untuk menempelkan data dari Excel...&#10;&#10;Contoh format:&#10;1	Pengadaan Gasket	Gasket high temp	10	Pcs	150.000&#10;2	Bolt & Nut M16	Material baja grade 8.8	100	Pcs	25.000"
              className="w-full p-3 font-mono text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
              autoFocus
            />
          </div>

          {/* Preview Section */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <Check size={14} />
                    {parsedItems.length} Item Terdeteksi
                  </span>
                  <span className="text-xs text-gray-500">
                    Total Estimasi: <strong>{formatCurrency(previewSubtotal)}</strong>
                  </span>
                </div>

                {/* Import Mode Selection */}
                {existingCount > 0 && (
                  <div className="flex items-center gap-3 text-xs bg-gray-100 p-1.5 rounded-lg border border-gray-200">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                      <input
                        type="radio"
                        name="importMode"
                        checked={mode === "append"}
                        onChange={() => setMode("append")}
                        className="text-blue-600"
                      />
                      <span>Tambahkan ke {existingCount} item lama (Append)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                      <input
                        type="radio"
                        name="importMode"
                        checked={mode === "replace"}
                        onChange={() => setMode("replace")}
                        className="text-blue-600"
                      />
                      <span>Ganti seluruh tabel (Replace)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-semibold sticky top-0 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 w-10">No</th>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Deskripsi</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2">Satuan</th>
                      <th className="px-3 py-2 text-right">Harga Satuan</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-1.5 font-medium text-gray-900">{item.item}</td>
                        <td className="px-3 py-1.5 text-gray-600 truncate max-w-[200px]" title={item.description || ""}>
                          {item.description || "-"}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">{item.quantity}</td>
                        <td className="px-3 py-1.5 text-gray-700">{item.unit}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-1.5 text-right font-mono font-semibold text-emerald-700">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pasteText.trim() && parsedItems.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span>
                Data teks yang ditempelkan tidak dapat dikenali sebagai tabel baris. Pastikan Anda menyalin kolom dari Excel / spreadsheet.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {parsedItems.length > 0 ? (
              <span>Siap memasukkan <strong>{parsedItems.length} baris</strong> ke tabel RAB.</span>
            ) : (
              <span>Silakan paste data untuk melihat pratinjau.</span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={parsedItems.length === 0}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
            >
              <Check size={15} />
              Terapkan {parsedItems.length > 0 ? `(${parsedItems.length} Item)` : ""} ke RAB
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
