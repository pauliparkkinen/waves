import type { TranslationRef } from './question.types.js';

export type CollectionPermission = {
  organisation_id: string;
  read: boolean;
  use: boolean;
  edit: boolean;
  owner: boolean;
};

export type Collection = {
  collection_id: string;
  collection_symbol: string;
  collection_permissions: CollectionPermission[];
};

export type SectionQuestion = {
  question_symbol: string;
  version_number: number;
  order_number: number;
  required: boolean;
};

export type PublishStatus = 'draft' | 'published';

export type Section = {
  section_id: string;
  section_symbol: string;
  collection_id: string;
  condition_formula_id?: string;
  version: number;
  status: PublishStatus;
  section_questions: SectionQuestion[];
  translations: TranslationRef[];
};

export type FormSection = {
  section_symbol: string;
  version_number: number;
  order_number: number;
};

export type FormOrganisation = {
  organisation_id: string;
  read: boolean;
  use: boolean;
  edit: boolean;
  owner: boolean;
};

export type FormulaReference = {
  formula_reference_id: string;
  symbol: string;
  type: string;
  referenced_formula_id?: string;
};

export type Formula = {
  collection_id: string;
  formula_id: string;
  symbol: string;
  expression: Record<string, unknown>;
  output_type: 'number' | 'boolean';
  formula_references: FormulaReference[];
};

export type Form = {
  collection_id: string;
  form_id: string;
  form_symbol: string;
  version: number;
  form_sections: FormSection[];
  formulas: string[];
  status: PublishStatus;
  form_organisations: FormOrganisation[];
  translations: TranslationRef[];
};

export type Translation = {
  translation_id: string;
  collection_id: string;
  symbol: string;
  locale_code: string;
  value: string;
  version: number;
  status: PublishStatus;
};
