"use client";

import React from "react";
import type { LISFieldProps } from "../types";

/**
 * File upload trigger for file-based tests (e.g., Blood Picture).
 * Delegates to the parent's attachment system via the file input ref.
 * This component is just a trigger label — the actual file input and
 * handling lives in the parent (ResultEntryForm / page).
 */
export function FileUploadField({ field, value, onChange, error, disabled, index }: LISFieldProps) {
  // This is a placeholder that renders contextual info.
  // Actual file upload is handled by the parent's attachment system.
  return (
    <div className="text-xs text-gray-400 italic" data-index={index}>
      Use the attachment controls below to upload files for this test.
    </div>
  );
}
