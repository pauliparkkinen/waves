import type { PublishStatus } from '../types/admin.types.js';

export type ValidationError = { field: string; message: string };

export class SectionValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('Section validation failed');
    this.name = 'SectionValidationError';
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

function validateSectionQuestionsList(sectionQuestions: unknown, errors: ValidationError[]): void {
  if (!Array.isArray(sectionQuestions)) {
    addError(errors, 'section_questions', 'section_questions must be an array');
    return;
  }
  (sectionQuestions as unknown[]).forEach((sq, i) => {
    if (!isRecord(sq)) {
      addError(errors, `section_questions[${i}]`, 'each section question must be an object');
      return;
    }
    if (!isNonEmptyString(sq.question_symbol)) {
      addError(errors, `section_questions[${i}].question_symbol`, 'question_symbol must be a non-empty string');
    }
    if (!('version_number' in sq) || !Number.isInteger(sq.version_number) || (sq.version_number as number) < 1) {
      addError(errors, `section_questions[${i}].version_number`, 'version_number must be a positive integer >= 1');
    }
    if (!('order_number' in sq) || !Number.isInteger(sq.order_number) || (sq.order_number as number) < 0) {
      addError(errors, `section_questions[${i}].order_number`, 'order_number must be a non-negative integer >= 0');
    }
    if (typeof sq.required !== 'boolean') {
      addError(errors, `section_questions[${i}].required`, 'required must be a boolean');
    }
  });
}

export function validateSectionInput(data: unknown): void {
  const errors: ValidationError[] = [];

  if (!isRecord(data)) {
    addError(errors, 'root', 'Input must be a non-null object');
    throw new SectionValidationError(errors);
  }

  if (!('section_symbol' in data) || !isNonEmptyString(data.section_symbol)) {
    addError(errors, 'section_symbol', 'section_symbol is required and must be a non-empty string');
  }

  if (!('version' in data) || typeof data.version !== 'number' || (data.version as number) < 1) {
    addError(errors, 'version', 'version is required and must be >= 1');
  }

  if (!('status' in data) || !isString(data.status) || !VALID_STATUSES.includes(data.status as PublishStatus)) {
    addError(errors, 'status', 'status must be one of: draft, published');
  }

  if ('condition_formula_id' in data && data.condition_formula_id !== undefined && !isString(data.condition_formula_id)) {
    addError(errors, 'condition_formula_id', 'condition_formula_id must be a string');
  }

  if (!('section_questions' in data)) {
    addError(errors, 'section_questions', 'section_questions is required');
  } else {
    validateSectionQuestionsList(data.section_questions, errors);
  }

  if ('translations' in data) {
    validateTranslations(data.translations, errors, 'translations');
  }

  if (errors.length > 0) {
    throw new SectionValidationError(errors);
  }
}

export function validateSectionUpdateInput(data: unknown): void {
  const errors: ValidationError[] = [];

  if (!isRecord(data)) {
    addError(errors, 'root', 'Input must be a non-null object');
    throw new SectionValidationError(errors);
  }

  if ('section_symbol' in data && !isNonEmptyString(data.section_symbol)) {
    addError(errors, 'section_symbol', 'section_symbol must be a non-empty string');
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

  if ('condition_formula_id' in data && data.condition_formula_id !== undefined && !isString(data.condition_formula_id)) {
    addError(errors, 'condition_formula_id', 'condition_formula_id must be a string');
  }

  if ('section_questions' in data) {
    validateSectionQuestionsList(data.section_questions, errors);
  }

  if ('translations' in data) {
    validateTranslations(data.translations, errors, 'translations');
  }

  if (errors.length > 0) {
    throw new SectionValidationError(errors);
  }
}
