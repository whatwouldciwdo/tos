"use client";

import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { TorFormData } from "@/app/(main)/tor/create/types";

export function useFieldSync(
  ydoc: Y.Doc | null,
  formData: TorFormData,
  setFormData: (data: TorFormData | ((prev: TorFormData) => TorFormData)) => void
) {
  const isSettingRef = useRef(false);

  useEffect(() => {
    if (!ydoc) return;

    const map = ydoc.getMap<any>("formFields");

    // 1. Initial sync: If Y.Map already has keys, load them into local state.
    // Otherwise, if the Y.Map is empty, populate it with current local formData.
    const keys = Array.from(map.keys());
    if (keys.length > 0) {
      const newValues: any = {};
      keys.forEach((key) => {
        const val = map.get(key);
        try {
          if (typeof val === "string" && (val.startsWith("[") || val.startsWith("{"))) {
            newValues[key] = JSON.parse(val);
          } else {
            newValues[key] = val;
          }
        } catch {
          newValues[key] = val;
        }
      });
      isSettingRef.current = true;
      setFormData((prev) => ({ ...prev, ...newValues }));
      isSettingRef.current = false;
    } else {
      // Y.Map is empty, so populate it from our current formData
      ydoc.transact(() => {
        Object.entries(formData).forEach(([key, val]) => {
          // Skip rich text fields which are managed by Tiptap Collaboration extension
          if (
            [
              "introduction",
              "background",
              "objective",
              "scope",
              "warranty",
              "acceptanceCriteria",
              "technicalSpec",
              "deliveryRequirements",
              "handoverPoint",
              "handoverMechanism",
              "generalProvisions",
              "vendorRequirements",
              "procurementMethod",
              "paymentTerms",
              "penaltyRules",
              "otherRequirements",
              "riskAssessment"
            ].includes(key)
          ) {
            return;
          }

          if (val !== undefined && val !== null) {
            if (typeof val === "object") {
              map.set(key, JSON.stringify(val));
            } else {
              map.set(key, val);
            }
          }
        });
      });
    }

    // 2. Observe changes from remote clients
    const observer = (event: Y.YMapEvent<any>) => {
      // Skip if we triggered this locally
      if (isSettingRef.current) return;

      const newValues: any = {};
      event.keysChanged.forEach((key) => {
        const val = map.get(key);
        try {
          if (typeof val === "string" && (val.startsWith("[") || val.startsWith("{"))) {
            newValues[key] = JSON.parse(val);
          } else {
            newValues[key] = val;
          }
        } catch {
          newValues[key] = val;
        }
      });

      isSettingRef.current = true;
      setFormData((prev) => ({ ...prev, ...newValues }));
      isSettingRef.current = false;
    };

    map.observe(observer);

    return () => {
      map.unobserve(observer);
    };
  }, [ydoc, setFormData]);

  // 3. Helper to update a field in Yjs map
  const syncField = (key: string, val: any) => {
    if (!ydoc || isSettingRef.current) return;
    const map = ydoc.getMap<any>("formFields");

    // Skip rich text fields which are managed by Tiptap Collaboration extension
    if (
      [
        "introduction",
        "background",
        "objective",
        "scope",
        "warranty",
        "acceptanceCriteria",
        "technicalSpec",
        "deliveryRequirements",
        "handoverPoint",
        "handoverMechanism",
        "generalProvisions",
        "vendorRequirements",
        "procurementMethod",
        "paymentTerms",
        "penaltyRules",
        "otherRequirements",
        "riskAssessment"
      ].includes(key)
    ) {
      return;
    }

    isSettingRef.current = true;
    if (val === undefined || val === null) {
      map.delete(key);
    } else if (typeof val === "object") {
      map.set(key, JSON.stringify(val));
    } else {
      map.set(key, val);
    }
    isSettingRef.current = false;
  };

  return { syncField };
}
