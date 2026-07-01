"use client";

import React from "react";
import type { LISFieldProps } from "../types";

/**
 * Renders text, number, and decimal inputs.
 * - "number" → type="number" with step="1"
 * - "decimal" → type="number" with step="0.01" and inputMode="decimal"
 * - "text" (default) → type="text"
 */
export function TextInput({ field, value, onChange, error, disabled, index }: LISFieldProps) {
  const isNumber = field.inputType === "number" || field.inputType === "decimal";
  const step = field.inputType === "decimal" ? (field.decimalPlaces ? 1 / Math.pow(10, field.decimalPlaces) : 0.01) : undefined;

  return (
    <input
      type={isNumber ? "number" : "text"}
      inputMode={field.inputType === "decimal" ? "decimal" : isNumber ? "numeric" : "text"}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder || `Enter ${field.test.toLowerCase()}...`}
      disabled={disabled}
      data-index={index}
      className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:ring-2 focus:outline-none disabled:opacity-50 disabled:bg-gray-100 ${
        error
          ? "border-red-300 bg-red-50 focus:ring-red-200"
          : "border-gray-200 focus:ring-blue-200"
      }`}
      style={{ minWidth: 70 }}
    />
  );
}
