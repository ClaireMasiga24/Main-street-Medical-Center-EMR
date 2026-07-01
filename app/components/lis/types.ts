import type { TestFieldConfig } from "../../lib/lab-config/types";

export interface LISFieldProps {
  field: TestFieldConfig;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  index: number;
}

export interface LabAttachment {
  name: string;
  data: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}
