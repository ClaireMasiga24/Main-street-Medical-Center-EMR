"use client";

import React from "react";
import type { LISFieldProps } from "../types";

interface BinaryOption {
  value: string;
  label: string;
  color: "red" | "green" | "amber" | "blue";
}

const BINARY_PRESETS: Record<string, [BinaryOption, BinaryOption]> = {
  positiveNegative: [
    { value: "Positive", label: "Positive", color: "red" },
    { value: "Negative", label: "Negative", color: "green" },
  ],
  reactiveNonReactive: [
    { value: "Reactive", label: "Reactive", color: "red" },
    { value: "Non-Reactive", label: "Non-Reactive", color: "green" },
  ],
  detectedNotDetected: [
    { value: "Detected", label: "Detected", color: "red" },
    { value: "Not Detected", label: "Not Detected", color: "green" },
  ],
};

const COLOR_MAP: Record<string, { active: string; activeBg: string; inactive: string; inactiveBg: string }> = {
  red:    { active: "text-red-700", activeBg: "bg-red-50 border-red-300", inactive: "text-gray-500", inactiveBg: "bg-white border-gray-200" },
  green:  { active: "text-green-700", activeBg: "bg-green-50 border-green-300", inactive: "text-gray-500", inactiveBg: "bg-white border-gray-200" },
  amber:  { active: "text-amber-700", activeBg: "bg-amber-50 border-amber-300", inactive: "text-gray-500", inactiveBg: "bg-white border-gray-200" },
  blue:   { active: "text-blue-700", activeBg: "bg-blue-50 border-blue-300", inactive: "text-gray-500", inactiveBg: "bg-white border-gray-200" },
};

/**
 * Two-pill toggle for binary results (Positive/Negative, Reactive/Non-Reactive, Detected/Not Detected).
 * Picks the correct label pair based on field.inputType.
 */
export function BinaryToggle({ field, value, onChange, error, disabled, index }: LISFieldProps) {
  const preset = BINARY_PRESETS[field.inputType];
  if (!preset) return null;

  const handleSelect = (val: string) => {
    onChange(value === val ? "" : val);
  };

  return (
    <div className="flex gap-1.5" data-index={index}>
      {preset.map((opt) => {
        const isActive = value === opt.value;
        const colors = COLOR_MAP[opt.color] || COLOR_MAP.blue;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => handleSelect(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
              isActive
                ? `${colors.activeBg} ${colors.active} shadow-sm`
                : `${colors.inactiveBg} ${colors.inactive} hover:border-gray-300`
            } disabled:opacity-50`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
