"use client";

import { useMemo } from "react";
import { TorFormData, BudgetItem } from "../types";
import Decimal from "decimal.js";

interface BudgetTableProps {
  formData: TorFormData;
  onChange: (data: Partial<TorFormData>) => void;
  isEditing?: boolean;
}

export default function BudgetTable({ formData, onChange, isEditing = true }: BudgetTableProps) {
  const budgetItems = formData.budgetItems || [];
  const ppnRate = formData.ppnRate ?? 11; // Default to 11% if not set
  const ppnIncluded = formData.ppnIncluded ?? true;
  const budgetItemTotalsKey = budgetItems.map((item) => item.totalPrice).join(",");

  // ✅ FIX: Calculate totals using useMemo for display only
  const calculatedTotals = useMemo(() => {
    const subtotalDecimal = budgetItems.reduce((sum, item) => {
      return sum.plus(new Decimal(item.totalPrice || 0));
    }, new Decimal(0));
    
    const ppnDecimal = ppnIncluded ? subtotalDecimal.times(ppnRate / 100).toDecimalPlaces(2) : new Decimal(0);
    const grandTotalDecimal = subtotalDecimal.plus(ppnDecimal).toDecimalPlaces(2);

    return {
      subtotal: subtotalDecimal.toNumber(),
      ppn: ppnDecimal.toNumber(),
      grandTotal: grandTotalDecimal.toNumber(),
    };
  }, [budgetItemTotalsKey, ppnRate, ppnIncluded]);

  const addRow = () => {
    if (!isEditing) return;
    
    const newItem: BudgetItem = {
      item: "",
      description: "",
      quantity: 1,
      unit: "Set",
      unitPrice: 0,
      totalPrice: 0,
    };
    onChange({
      budgetItems: [...budgetItems, newItem],
    });
  };

  const removeRow = (index: number) => {
    if (!isEditing) return;
    
    const updated = budgetItems.filter((_, i) => i !== index);
    onChange({ budgetItems: updated });
    recalculateTotals(updated);
  };

  const updateRow = (index: number, field: keyof BudgetItem, value: any) => {
    if (!isEditing) return;
    
    const updated = [...budgetItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate totalPrice using Decimal.js for precision
    if (field === "quantity" || field === "unitPrice") {
      const qty = field === "quantity" ? parseFloat(value) || 0 : updated[index].quantity;
      const price = field === "unitPrice" ? parseFloat(value) || 0 : updated[index].unitPrice;
      
      // ✅ FIX: Use Decimal.js for precise calculation
      const qtyDecimal = new Decimal(qty);
      const priceDecimal = new Decimal(price);
      const totalDecimal = qtyDecimal.times(priceDecimal);
      
      updated[index].totalPrice = totalDecimal.toNumber();
    }

    // Update budget items first
    onChange({ budgetItems: updated });
    
    // Then recalculate and save totals
    recalculateTotals(updated);
  };

  // ✅ FIX: Use Decimal.js for all calculations
  const recalculateTotals = (items: BudgetItem[]) => {
    // Calculate subtotal with Decimal precision
    const subtotalDecimal = items.reduce((sum, item) => {
      return sum.plus(new Decimal(item.totalPrice || 0));
    }, new Decimal(0));
    
    // Calculate PPN using current rate
    const currentPpnRate = formData.ppnRate ?? 11;
    const ppnDecimal = ppnIncluded ? subtotalDecimal.times(currentPpnRate / 100).toDecimalPlaces(2) : new Decimal(0);
    
    // Calculate grand total
    const grandTotalDecimal = subtotalDecimal.plus(ppnDecimal).toDecimalPlaces(2);

    // Save calculated totals to formData
    onChange({
      subtotal: subtotalDecimal.toNumber(),
      ppn: ppnDecimal.toNumber(),
      grandTotal: grandTotalDecimal.toNumber(),
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: formData.budgetCurrency || "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">No</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Item</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Description</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Qty</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Unit</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Unit Price ({formData.budgetCurrency || "IDR"})</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Total Price ({formData.budgetCurrency || "IDR"})</th>
              {isEditing && (
                <th className="px-3 py-2 text-center font-medium text-gray-700 border-b">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {budgetItems.map((item, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-600">{index + 1}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.item}
                    onChange={(e) => updateRow(index, "item", e.target.value)}
                    placeholder="Item name"
                    disabled={!isEditing}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.description || ""}
                    onChange={(e) => updateRow(index, "description", e.target.value)}
                    placeholder="Description"
                    disabled={!isEditing}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateRow(index, "quantity", e.target.value)}
                    disabled={!isEditing}
                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateRow(index, "unit", e.target.value)}
                    placeholder="Unit"
                    disabled={!isEditing}
                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateRow(index, "unitPrice", e.target.value)}
                    disabled={!isEditing}
                    className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-3 py-2 font-medium text-gray-900">
                  {formatCurrency(item.totalPrice)}
                </td>
                {isEditing && (
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => removeRow(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {budgetItems.length === 0 && (
              <tr>
                <td colSpan={isEditing ? 8 : 7} className="px-3 py-8 text-center text-gray-500">
                  {isEditing
                    ? "No budget items yet. Click 'Add Item' to start."
                    : "Belum ada data anggaran."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <button
          onClick={addRow}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Add Item
        </button>
      )}

      {/* Summary with precise formatting */}
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Subtotal:</span>
            <span className="font-medium text-gray-900">{formatCurrency(calculatedTotals.subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">PPN:</span>
              {isEditing && <select value={ppnIncluded ? "include" : "exclude"} onChange={(e) => onChange({ ppnIncluded: e.target.value === "include" })} className="px-2 py-1 border border-gray-300 rounded text-gray-900"><option value="include">Include PPN</option><option value="exclude">Exclude PPN</option></select>}
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={ppnRate}
                  onChange={(e) => {
                    const newRate = parseFloat(e.target.value) || 0;
                    onChange({ ppnRate: newRate });
                  }}
                  className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900 text-center"
                />
              ) : (
                <span className="text-gray-700 font-medium">{ppnRate}%</span>
              )}
              {isEditing && <span className="text-gray-500 text-xs">%</span>}
            </div>
            <span className="font-medium text-gray-900">{formatCurrency(calculatedTotals.ppn)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span className="text-gray-900">Grand Total:</span>
            <span className="text-blue-600">{formatCurrency(calculatedTotals.grandTotal)}</span>
          </div>
        </div>
      </div>
      
      {/* Note */}
      <div className="text-xs text-gray-600 italic">
        <span>Rencana anggaran sebesar {formatCurrency(calculatedTotals.grandTotal)} {ppnIncluded ? `termasuk PPN ${ppnRate}%` : "tidak termasuk PPN"}.</span>
      </div>
    </div>
  );
}