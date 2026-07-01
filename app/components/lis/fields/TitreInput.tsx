"use client";

import React from "react";
import type { LISFieldProps } from "../types";

const TITRE_PRESETS = [
  "1:20", "1:40", "1:80", "1:160", "1:320", "1:640", "1:1280",
];

/**
 * Titre value input with quick-select preset buttons and a manual input.
 */
export function TitreInput({ field, value, onChange, error, disabled, index }: LISFieldProps) {
  return (
    <div className="flex flex-wrap gap-1" data-index={index}>
      {TITRE_PRESETS.map((titre) => {
        const isActive = value === titre;
        return (
          <button
            key={titre}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === titre ? "" : titre)}
            className={`text-[10px] px-2 py-1 rounded border transition-all font-mono ${
              isActive
                ? "bg-indigo-100 border-indigo-300 text-indigo-800"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            } disabled:opacity-50`}
          >
            {titre}
          </button>
        );
      })}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1:X"
        disabled={disabled}
        className={`w-20 px-2 py-1 border rounded-md text-xs font-mono focus:ring-2 focus:outline-none disabled:opacity-50 ${
          value && !TITRE_PRESETS.includes(value)
            ? "border-indigo-300 bg-indigo-50 focus:ring-indigo-200"
            : "border-gray-200 focus:ring-blue-200"
        }`}
      />
    </div>
  );
}
