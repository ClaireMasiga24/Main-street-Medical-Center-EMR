"use client";

import React from "react";
import type { LISFieldProps } from "../types";

const ABO_GROUPS = ["A", "B", "AB", "O"];

/**
 * Pill-button grid for ABO blood group selection.
 */
export function ABOGroupSelect({ field, value, onChange, error, disabled, index }: LISFieldProps) {
  return (
    <div className="flex gap-1.5" data-index={index}>
      {ABO_GROUPS.map((group) => {
        const isActive = value === group;
        return (
          <button
            key={group}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === group ? "" : group)}
            className={`w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all ${
              isActive
                ? "bg-blue-100 border-blue-400 text-blue-800 shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            } disabled:opacity-50`}
          >
            {group}
          </button>
        );
      })}
    </div>
  );
}
