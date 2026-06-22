import type { FormResponseStatus } from '../types/form-response.types.js';

export class FormResponseValidationError extends Error {
  constructor(public readonly errors: Array<{ field: string; message: string }>) {
    super('Form response validation failed');
    this.name = 'FormResponseValidationError';
  }
}

// ---- Helpers ----

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

function addError(
  errors: Array<{ field: string; message: string }>,
  field: string,
  message: string,
): void {
  errors.push({ field, message });
}

const VALID_FORM_RESPONSE_STATUSES: FormResponseStatus[] = ['Draft', 'Submitted'];

// ---- Create FormResponse ----

export function validateCreateFormResponseInput(data: unknown): void {
  if (!isRecord(data)) {
    throw new FormResponseValidationError([{ field: 'root', message: 'Input must be a non-null object' }]);
  }

  const errors: Array<{ field: string; message: string }> = [];

  if (!isNonEmptyString(data.form_response_group_id)) {
    addError(errors, 'form_response_group_id', 'form_response_group_id is required and must be a non-empty string');
  }

  if (!isNonEmptyString(data.collection_id)) {
    addError(errors, 'collection_id', 'collection_id is required and must be a non-empty string');
  }

  if (!isNonEmptyString(data.form_symbol)) {
    addError(errors, 'form_symbol', 'form_symbol is required and must be a non-empty string');
  }

  if (!isNumber(data.form_version)) {
    addError(errors, 'form_version', 'form_version is required and must be a number');
  }

  if (!isNonEmptyString(data.user_id)) {
    addError(errors, 'user_id', 'user_id is required and must be a non-empty string');
  }

  if (!isNonEmptyString(data.filling_user_id)) {
    addError(errors, 'filling_user_id', 'filling_user_id is required and must be a non-empty string');
  }

  if (errors.length > 0) {
    throw new FormResponseValidationError(errors);
  }
}

// ---- Update FormResponse ----

export function validateUpdateFormResponseInput(data: unknown): void {
  if (!isRecord(data)) {
    throw new FormResponseValidationError([{ field: 'root', message: 'Input must be a non-null object' }]);
  }

  const errors: Array<{ field: string; message: string }> = [];

  if (data.status !== undefined && !VALID_FORM_RESPONSE_STATUSES.includes(data.status as FormResponseStatus)) {
    addError(
      errors,
      'status',
      `status must be one of: ${VALID_FORM_RESPONSE_STATUSES.join(', ')}`,
    );
  }

  if (data.submitted_timestamp !== undefined && !isString(data.submitted_timestamp)) {
    addError(errors, 'submitted_timestamp', 'submitted_timestamp must be a string');
  }

  if (errors.length > 0) {
    throw new FormResponseValidationError(errors);
  }
}

// ---- Create QuestionResponse ----

export function validateCreateQuestionResponseInput(data: unknown): void {
  if (!isRecord(data)) {
    throw new FormResponseValidationError([{ field: 'root', message: 'Input must be a non-null object' }]);
  }

  const errors: Array<{ field: string; message: string }> = [];

  if (!isNonEmptyString(data.form_response_id)) {
    addError(errors, 'form_response_id', 'form_response_id is required and must be a non-empty string');
  }

  if (!isNonEmptyString(data.collection_id)) {
    addError(errors, 'collection_id', 'collection_id is required and must be a non-empty string');
  }

  if (!isNonEmptyString(data.question_symbol)) {
    addError(errors, 'question_symbol', 'question_symbol is required and must be a non-empty string');
  }

  if (!isNumber(data.question_version)) {
    addError(errors, 'question_version', 'question_version is required and must be a number');
  }

  if (errors.length > 0) {
    throw new FormResponseValidationError(errors);
  }
}

// ---- Update QuestionResponse ----

export function validateUpdateQuestionResponseInput(data: unknown): void {
  if (!isRecord(data)) {
    throw new FormResponseValidationError([{ field: 'root', message: 'Input must be a non-null object' }]);
  }

  const errors: Array<{ field: string; message: string }> = [];

  const hasValue =
    data.response_value_text !== undefined ||
    data.response_value_number !== undefined ||
    data.response_value_boolean !== undefined;

  if (!hasValue) {
    addError(errors, 'root', 'At least one response value field must be provided');
  }

  if (data.response_value_text !== undefined && !isString(data.response_value_text)) {
    addError(errors, 'response_value_text', 'response_value_text must be a string');
  }

  if (data.response_value_number !== undefined && !isNumber(data.response_value_number)) {
    addError(errors, 'response_value_number', 'response_value_number must be a number');
  }

  if (data.response_value_boolean !== undefined && typeof data.response_value_boolean !== 'boolean') {
    addError(errors, 'response_value_boolean', 'response_value_boolean must be a boolean');
  }

  if (errors.length > 0) {
    throw new FormResponseValidationError(errors);
  }
}
