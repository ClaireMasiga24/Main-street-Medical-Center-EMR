// ─── LIS Component Library ────────────────────────────────────────────────
// Reusable laboratory field components for configuration-driven result entry.
// ──────────────────────────────────────────────────────────────────────────

export { LISFieldRenderer } from "./LISFieldRenderer";
export { ResultEntryForm } from "./ResultEntryForm";
export { generateLabReportHTML } from "./PrintReport";

// Field components (exported individually for direct use if needed)
export { TextInput } from "./fields/TextInput";
export { TextAreaInput } from "./fields/TextAreaInput";
export { SelectInput } from "./fields/SelectInput";
export { MultiSelectInput } from "./fields/MultiSelectInput";
export { BinaryToggle } from "./fields/BinaryToggle";
export { ABOGroupSelect } from "./fields/ABOGroupSelect";
export { RhFactorSelect } from "./fields/RhFactorSelect";
export { TitreInput } from "./fields/TitreInput";
export { DateTimePicker } from "./fields/DateTimePicker";
export { FileUploadField } from "./fields/FileUploadField";

// Types
export type { LISFieldProps, LabAttachment } from "./types";
