import type { PublishStatus } from '../types/admin.types.js';

export type ValidationError = { field: string; message: string };

export class TranslationValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('Translation validation failed');
    this.name = 'TranslationValidationError';
  }
}

const VALID_STATUSES: PublishStatus[] = ['draft', 'published'];
const SYMBOL_PATTERN = /^[a-zA-Z0-9_]+$/;

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

export function validateTranslationInput(data: unknown): void {
  const errors: ValidationError[] = [];

  if (!isRecord(data)) {
    addError(errors, 'root', 'Input must be a non-null object');
    throw new TranslationValidationError(errors);
  }

  if (!('collection_id' in data) || !isNonEmptyString(data.collection_id)) {
    addError(errors, 'collection_id', 'collection_id is required and must be a non-empty string');
  }

  if (!('symbol' in data) || !isNonEmptyString(data.symbol)) {
    addError(errors, 'symbol', 'symbol is required and must be a non-empty string');
  } else if (!SYMBOL_PATTERN.test(data.symbol as string)) {
    addError(errors, 'symbol', 'symbol must match pattern ^[a-zA-Z0-9_]+$');
  }

  if (!('locale_code' in data) || !isNonEmptyString(data.locale_code)) {
    addError(errors, 'locale_code', 'locale_code is required and must be a non-empty string');
  }

  if (!('value' in data) || !isNonEmptyString(data.value)) {
    addError(errors, 'value', 'value is required and must be a non-empty string');
  }

  if (!('status' in data) || !VALID_STATUSES.includes(data.status as PublishStatus)) {
    addError(errors, 'status', 'status must be one of: draft, published');
  }

  if (errors.length > 0) {
    throw new TranslationValidationError(errors);
  }
}

export function validateTranslationUpdateInput(data: unknown): void {
  const errors: ValidationError[] = [];

  if (!isRecord(data)) {
    addError(errors, 'root', 'Input must be a non-null object');
    throw new TranslationValidationError(errors);
  }

  if ('collection_id' in data && !isNonEmptyString(data.collection_id)) {
    addError(errors, 'collection_id', 'collection_id must be a non-empty string');
  }

  if ('symbol' in data) {
    if (!isNonEmptyString(data.symbol)) {
      addError(errors, 'symbol', 'symbol must be a non-empty string');
    } else if (!SYMBOL_PATTERN.test(data.symbol as string)) {
      addError(errors, 'symbol', 'symbol must match pattern ^[a-zA-Z0-9_]+$');
    }
  }

  if ('locale_code' in data && !isNonEmptyString(data.locale_code)) {
    addError(errors, 'locale_code', 'locale_code must be a non-empty string');
  }

  if ('value' in data && !isNonEmptyString(data.value)) {
    addError(errors, 'value', 'value must be a non-empty string');
  }

  if ('status' in data && !VALID_STATUSES.includes(data.status as PublishStatus)) {
    addError(errors, 'status', 'status must be one of: draft, published');
  }

  if (errors.length > 0) {
    throw new TranslationValidationError(errors);
  }
}
