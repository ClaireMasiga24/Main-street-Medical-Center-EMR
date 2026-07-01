"use client";

import React from "react";
import type { LISFieldProps } from "../types";

const RH_OPTIONS = ["Positive", "Negative"];

/**
 * Pill-button toggle for Rh factor selection.
 */
export function RhFactorSelect({ field, value, onChange, error, disabled, index }: LISFieldProps) {
  return (
    <div className="flex gap-1.5" data-index={index}>
      {RH_OPTIONS.map((opt) => {
        const isActive = value === opt;
        const color = opt === "Positive" ? "blue" : "green";
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
              isActive
                ? color === "blue"
                  ? "bg-blue-100 border-blue-400 text-blue-800 shadow-sm"
                  : "bg-green-100 border-green-400 text-green-800 shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            } disabled:opacity-50`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
