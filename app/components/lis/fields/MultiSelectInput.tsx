"use client";

import React from "react";
import type { LISFieldProps } from "../types";

/**
 * Multi-select rendered as a checkbox group.
 * Values are stored as a semicolon-separated string.
 */
export function MultiSelectInput({ field, value, onChange, error, disabled, index }: LISFieldProps) {
  const options = (field.options ?? []).map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  const selectedValues = value ? value.split(";").map((s) => s.trim()).filter(Boolean) : [];

  const toggleOption = (optValue: string) => {
    const exists = selectedValues.includes(optValue);
    const next = exists
      ? selectedValues.filter((v) => v !== optValue)
      : [...selectedValues, optValue];
    onChange(next.join("; "));
  };

  return (
    <div className="flex flex-wrap gap-1.5" data-index={index}>
      {options.map((opt) => {
        const isSelected = selectedValues.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => toggleOption(opt.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all font-medium ${
              isSelected
                ? "bg-blue-100 border-blue-300 text-blue-800"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            } disabled:opacity-50`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
