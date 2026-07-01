"use client";

import React from "react";
import type { LISFieldProps } from "../types";

/**
 * Date, time, or datetime-local input based on field.inputType.
 */
export function DateTimePicker({ field, value, onChange, error, disabled, index }: LISFieldProps) {
  const inputType =
    field.inputType === "date" ? "date" :
    field.inputType === "time" ? "time" : "datetime-local";

  return (
    <input
      type={inputType}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      data-index={index}
      className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:ring-2 focus:outline-none disabled:opacity-50 disabled:bg-gray-100 ${
        error
          ? "border-red-300 bg-red-50 focus:ring-red-200"
          : "border-gray-200 focus:ring-blue-200"
      }`}
      style={{ minWidth: 140 }}
    />
  );
}
