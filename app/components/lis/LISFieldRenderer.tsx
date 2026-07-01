"use client";

import React from "react";
import type { LISFieldProps } from "./types";
import { TextInput } from "./fields/TextInput";
import { TextAreaInput } from "./fields/TextAreaInput";
import { SelectInput } from "./fields/SelectInput";
import { MultiSelectInput } from "./fields/MultiSelectInput";
import { BinaryToggle } from "./fields/BinaryToggle";
import { ABOGroupSelect } from "./fields/ABOGroupSelect";
import { RhFactorSelect } from "./fields/RhFactorSelect";
import { TitreInput } from "./fields/TitreInput";
import { DateTimePicker } from "./fields/DateTimePicker";
import { FileUploadField } from "./fields/FileUploadField";

/**
 * Maps a TestFieldConfig's inputType to the correct field component.
 * This is the central dispatch point for the LIS component library.
 * Adding a new input type requires:
 *  1. Adding it to the FieldInputType union in types.ts
 *  2. Building the component in fields/
 *  3. Adding a case here
 */
export function LISFieldRenderer(props: LISFieldProps) {
  const { field } = props;

  switch (field.inputType) {
    // Text / numeric inputs
    case "text":
    case "number":
    case "decimal":
      return <TextInput {...props} />;

    // Multiline text
    case "textarea":
      return <TextAreaInput {...props} />;

    // Single / multi select
    case "select":
      return <SelectInput {...props} />;
    case "multiSelect":
      return <MultiSelectInput {...props} />;

    // Binary toggle selectors
    case "positiveNegative":
    case "reactiveNonReactive":
    case "detectedNotDetected":
      return <BinaryToggle {...props} />;

    // Blood group selectors
    case "abo":
      return <ABOGroupSelect {...props} />;
    case "rh":
      return <RhFactorSelect {...props} />;

    // Titre (dilution) input
    case "titre":
      return <TitreInput {...props} />;

    // Date / time pickers
    case "dateTime":
    case "date":
    case "time":
      return <DateTimePicker {...props} />;

    // File upload
    case "file":
      return <FileUploadField {...props} />;

    // Safety: fallback to plain text input
    default:
      return <TextInput {...props} />;
  }
}
