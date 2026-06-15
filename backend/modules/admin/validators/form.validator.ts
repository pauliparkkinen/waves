import type { PublishStatus } from '../types/admin.types.js';

export type ValidationError = { field: string; message: string };

export class FormValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('Form validation failed');
    this.name = 'FormValidationError';
  }
}

const VALID_STATUSES: PublishStatus[] = ['draft', 'published'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

function addError(errors: ValidationError[], field: string, message: string): void {
  errors.push({ field, message });
}

function validateTranslations(translations: unknown, errors: ValidationError[], prefix: string): void {
  if (!Array.isArray(translations)) {
    addError(errors, `${prefix}`, 'translations must be an array');
    return;
  }
  (translations as unknown[]).forEach((t, i) => {
    if (!isRecord(t)) {
      addError(errors, `${prefix}[${i}]`, 'each translation must be an object');
      return;
    }
    if (!isString(t.translation_symbol)) {
      addError(errors, `${prefix}[${i}].translation_symbol`, 'translation_symbol must be a string');
    }
    if (!isString(t.symbol)) {
      addError(errors, `${prefix}[${i}].symbol`, 'symbol must be a string');
    }
  });
}

function validateFormOrganisations(organisations: unknown, errors: ValidationError[]): void {
  if (!Array.isArray(organisations)) {
    addError(errors, 'form_organisations', 'form_organisations must be an array');
    return;
  }
  (organisations as unknown[]).forEach((org, i) => {
    if (!isRecord(org)) {
      addError(errors, `form_organisations[${i}]`, 'each organisation must be an object');
      return;
    }
    if (!isNonEmptyString(org.organisation_id)) {
      addError(errors, `form_organisations[${i}].organisation_id`, 'organisation_id must be a non-empty string');
    }
    if (typeof org.read !== 'boolean') {
      addError(errors, `form_organisations[${i}].read`, 'read must be a boolean');
    }
    if (typeof org.use !== 'boolean') {
      addError(errors, `form_organisations[${i}].use`, 'use must be a boolean');
    }
    if (typeof org.edit !== 'boolean') {
      addError(errors, `form_organisations[${i}].edit`, 'edit must be a boolean');
    }
    if (typeof org.owner !== 'boolean') {
      addError(errors, `form_organisations[${i}].owner`, 'owner must be a boolean');
    }
  });
}

function validateFormSections(sections: unknown, errors: ValidationError[]): void {
  if (!Array.isArray(sections)) {
    addError(errors, 'form_sections', 'form_sections must be an array');
    return;
  }
  (sections as unknown[]).forEach((fs, i) => {
    if (!isRecord(fs)) {
      addError(errors, `form_sections[${i}]`, 'each form section must be an object');
      return;
    }
    if (!isNonEmptyString(fs.section_symbol)) {
      addError(errors, `form_sections[${i}].section_symbol`, 'section_symbol must be a non-empty string');
    }
    if (!('version_number' in fs) || !Number.isInteger(fs.version_number) || (fs.version_number as number) < 1) {
      addError(errors, `form_sections[${i}].version_number`, 'version_number must be a positive integer >= 1');
    }
    if (!('order_number' in fs) || !Number.isInteger(fs.order_number) || (fs.order_number as number) < 0) {
      addError(errors, `form_sections[${i}].order_number`, 'order_number must be a non-negative integer >= 0');
    }
  });
}

export function validateFormInput(data: unknown): void {
  const errors: ValidationError[] = [];

  if (!isRecord(data)) {
    addError(errors, 'root', 'Input must be a non-null object');
    throw new FormValidationError(errors);
  }

  if (!('collection_id' in data) || !isNonEmptyString(data.collection_id)) {
    addError(errors, 'collection_id', 'collection_id is required and must be a non-empty string');
  }

  if (!('form_symbol' in data) || !isNonEmptyString(data.form_symbol)) {
    addError(errors, 'form_symbol', 'form_symbol is required and must be a non-empty string');
  }

  if (!('version' in data) || typeof data.version !== 'number' || (data.version as number) < 1) {
    addError(errors, 'version', 'version is required and must be >= 1');
  }

  if (!('status' in data) || !isString(data.status) || !VALID_STATUSES.includes(data.status as PublishStatus)) {
    addError(errors, 'status', 'status must be one of: draft, published');
  }

  if (!('form_sections' in data)) {
    addError(errors, 'form_sections', 'form_sections is required');
  } else {
    validateFormSections(data.form_sections, errors);
  }

  if ('formulas' in data && data.formulas !== undefined) {
    if (!Array.isArray(data.formulas)) {
      addError(errors, 'formulas', 'formulas must be an array');
    } else {
      (data.formulas as unknown[]).forEach((f, i) => {
        if (!isString(f)) {
          addError(errors, `formulas[${i}]`, 'each formula must be a string');
        }
      });
    }
  }

  if ('form_organisations' in data) {
    validateFormOrganisations(data.form_organisations, errors);
  }

  if ('translations' in data) {
    validateTranslations(data.translations, errors, 'translations');
  }

  if (errors.length > 0) {
    throw new FormValidationError(errors);
  }
}

export function validateFormUpdateInput(data: unknown): void {
  const errors: ValidationError[] = [];

  if (!isRecord(data)) {
    addError(errors, 'root', 'Input must be a non-null object');
    throw new FormValidationError(errors);
  }

  if ('collection_id' in data && !isNonEmptyString(data.collection_id)) {
    addError(errors, 'collection_id', 'collection_id must be a non-empty string');
  }

  if ('form_symbol' in data && !isNonEmptyString(data.form_symbol)) {
    addError(errors, 'form_symbol', 'form_symbol must be a non-empty string');
  }

  if ('version' in data) {
    if (typeof data.version !== 'number' || (data.version as number) < 1) {
      addError(errors, 'version', 'version must be >= 1');
    }
  }

  if ('status' in data) {
    if (!isString(data.status) || !VALID_STATUSES.includes(data.status as PublishStatus)) {
      addError(errors, 'status', 'status must be one of: draft, published');
    }
  }

  if ('form_sections' in data) {
    validateFormSections(data.form_sections, errors);
  }

  if ('formulas' in data && data.formulas !== undefined) {
    if (!Array.isArray(data.formulas)) {
      addError(errors, 'formulas', 'formulas must be an array');
    } else {
      (data.formulas as unknown[]).forEach((f, i) => {
        if (!isString(f)) {
          addError(errors, `formulas[${i}]`, 'each formula must be a string');
        }
      });
    }
  }

  if ('form_organisations' in data) {
    validateFormOrganisations(data.form_organisations, errors);
  }

  if ('translations' in data) {
    validateTranslations(data.translations, errors, 'translations');
  }

  if (errors.length > 0) {
    throw new FormValidationError(errors);
  }
}
