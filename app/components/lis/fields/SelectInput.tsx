"use client";

import React from "react";
import type { LISFieldProps } from "../types";

/**
 * Single-select dropdown. Supports options as string[] or { label, value }[].
 */
export function SelectInput({ field, value, onChange, error, disabled, index }: LISFieldProps) {
  const options = (field.options ?? []).map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      data-index={index}
      className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:ring-2 focus:outline-none disabled:opacity-50 disabled:bg-gray-100 bg-white ${
        error
          ? "border-red-300 bg-red-50 focus:ring-red-200"
          : "border-gray-200 focus:ring-blue-200"
      }`}
      style={{ minWidth: 120 }}
    >
      <option value="">Select...</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
