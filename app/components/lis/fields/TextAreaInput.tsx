"use client";

import React from "react";
import type { LISFieldProps } from "../types";

/**
 * Multiline textarea for longer qualitative results.
 */
export function TextAreaInput({ field, value, onChange, error, disabled, index }: LISFieldProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder || `Enter ${field.test.toLowerCase()}...`}
      disabled={disabled}
      data-index={index}
      rows={3}
      className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:ring-2 focus:outline-none disabled:opacity-50 disabled:bg-gray-100 resize-vertical ${
        error
          ? "border-red-300 bg-red-50 focus:ring-red-200"
          : "border-gray-200 focus:ring-blue-200"
      }`}
    />
  );
}
