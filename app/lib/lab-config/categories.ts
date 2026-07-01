import type { TestCategory } from "./types";

export const TEST_CATEGORIES: Record<string, TestCategory> = {
  HAEMATOLOGY: {
    id: "HAEMATOLOGY",
    label: "Haematology",
    description: "Blood cell analysis and coagulation",
  },
  BIOCHEMISTRY: {
    id: "BIOCHEMISTRY",
    label: "Biochemistry",
    description: "Blood chemistry, organ function, and electrolytes",
  },
  SEROLOGY: {
    id: "SEROLOGY",
    label: "Serology",
    description: "Immunoassays, antigen / antibody detection",
  },
  MICROBIOLOGY: {
    id: "MICROBIOLOGY",
    label: "Microbiology",
    description: "Microscopy, culture, and molecular tests",
  },
  URINALYSIS: {
    id: "URINALYSIS",
    label: "Urinalysis",
    description: "Urine dipstick and microscopy",
  },
  ENDOCRINOLOGY: {
    id: "ENDOCRINOLOGY",
    label: "Endocrinology",
    description: "Hormone and glucose tests",
  },
  IMMUNOLOGY: {
    id: "IMMUNOLOGY",
    label: "Immunology",
    description: "Immune system markers",
  },
};

export function getTestCategory(categoryId?: string): TestCategory | undefined {
  if (categoryId && TEST_CATEGORIES[categoryId]) {
    return TEST_CATEGORIES[categoryId];
  }
  return undefined;
}
