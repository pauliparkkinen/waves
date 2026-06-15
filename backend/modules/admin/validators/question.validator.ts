import type { QuestionType } from '../types/question.types.js';

export type ValidationResult = { valid: boolean; errors: ValidationError[] };
export type ValidationError = { field: string; message: string };

const VALID_QUESTION_TYPES: QuestionType[] = ['free-text', 'range', 'select', 'multiselect', 'radio'];

export class QuestionValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('Question validation failed');
    this.name = 'QuestionValidationError';
  }
}

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

function validateFreeTextParameters(params: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isRecord(params)) {
    addError(errors, 'parameters', 'Free-text parameters must be an object');
    return errors;
  }
  if ('max_length' in params) {
    if (!Number.isInteger(params.max_length) || (params.max_length as number) <= 0) {
      addError(errors, 'parameters.max_length', 'max_length must be a positive integer');
    }
  }
  if ('placeholder' in params) {
    if (!isString(params.placeholder)) {
      addError(errors, 'parameters.placeholder', 'placeholder must be a string');
    }
  }
  if ('multiline' in params) {
    if (typeof params.multiline !== 'boolean') {
      addError(errors, 'parameters.multiline', 'multiline must be a boolean');
    }
  }
  return errors;
}

function validateRangeParameters(params: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isRecord(params)) {
    addError(errors, 'parameters', 'Range parameters must be an object');
    return errors;
  }
  if (!('min' in params) || typeof params.min !== 'number') {
    addError(errors, 'parameters.min', 'min must be a number');
  }
  if (!('max' in params) || typeof params.max !== 'number') {
    addError(errors, 'parameters.max', 'max must be a number');
  }
  if (typeof params.min === 'number' && typeof params.max === 'number') {
    if (params.min > params.max) {
      addError(errors, 'parameters.min', 'min must be less than or equal to max');
    }
  }
  if ('step' in params) {
    if (typeof params.step !== 'number' || !Number.isFinite(params.step as number) || (params.step as number) <= 0) {
      addError(errors, 'parameters.step', 'step must be a finite positive number');
    }
  }
  if ('min_label' in params) {
    if (!isString(params.min_label)) {
      addError(errors, 'parameters.min_label', 'min_label must be a string');
    }
  }
  if ('max_label' in params) {
    if (!isString(params.max_label)) {
      addError(errors, 'parameters.max_label', 'max_label must be a string');
    }
  }
  return errors;
}

function validateSelectParameters(params: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isRecord(params)) {
    addError(errors, 'parameters', 'Select parameters must be an object');
    return errors;
  }
  if (!('options' in params) || !Array.isArray(params.options)) {
    addError(errors, 'parameters.options', 'options must be an array');
    return errors;
  }
  const options = params.options as unknown[];
  if (options.length < 2) {
    addError(errors, 'parameters.options', 'options must have at least 2 items');
    return errors;
  }
  options.forEach((opt, i) => {
    if (!isRecord(opt)) {
      addError(errors, `parameters.options[${i}]`, 'each option must be an object');
      return;
    }
    if (!isString(opt.label)) {
      addError(errors, `parameters.options[${i}].label`, 'label must be a string');
    }
    if (!isString(opt.value)) {
      addError(errors, `parameters.options[${i}].value`, 'value must be a string');
    }
    if (typeof opt.order_index !== 'number') {
      addError(errors, `parameters.options[${i}].order_index`, 'order_index must be a number');
    }
  });
  return errors;
}

function validateMultiselectParameters(params: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isRecord(params)) {
    addError(errors, 'parameters', 'Multiselect parameters must be an object');
    return errors;
  }
  // Validate select-like options first
  const selectErrors = validateSelectParameters(params);
  errors.push(...selectErrors);

  if ('min_select' in params) {
    if (!Number.isInteger(params.min_select) || (params.min_select as number) < 0) {
      addError(errors, 'parameters.min_select', 'min_select must be a non-negative integer');
    }
  }
  if ('max_select' in params) {
    if (!Number.isInteger(params.max_select) || (params.max_select as number) <= 0) {
      addError(errors, 'parameters.max_select', 'max_select must be a positive integer');
    }
  }
  if (
    'min_select' in params &&
    'max_select' in params &&
    typeof params.min_select === 'number' &&
    typeof params.max_select === 'number' &&
    params.min_select > params.max_select
  ) {
    addError(errors, 'parameters.min_select', 'min_select must be less than or equal to max_select');
  }
  return errors;
}

function validateRadioParameters(params: unknown): ValidationError[] {
  return validateSelectParameters(params);
}

function getTypeSpecificValidator(type: string): ((params: unknown) => ValidationError[]) | null {
  switch (type) {
    case 'free-text':
      return validateFreeTextParameters;
    case 'range':
      return validateRangeParameters;
    case 'select':
      return validateSelectParameters;
    case 'multiselect':
      return validateMultiselectParameters;
    case 'radio':
      return validateRadioParameters;
    default:
      return null;
  }
}

export function validateQuestionInput(data: unknown): void {
  const errors: ValidationError[] = [];

  if (!isRecord(data)) {
    addError(errors, 'root', 'Input must be a non-null object');
    throw new QuestionValidationError(errors);
  }

  // collection_id
  if (!('collection_id' in data) || !isNonEmptyString(data.collection_id)) {
    addError(errors, 'collection_id', 'collection_id is required and must be a non-empty string');
  }

  // question_symbol
  if (!('question_symbol' in data) || !isNonEmptyString(data.question_symbol)) {
    addError(errors, 'question_symbol', 'question_symbol is required and must be a non-empty string');
  }

  // type
  if (!('type' in data) || !isString(data.type) || !VALID_QUESTION_TYPES.includes(data.type as QuestionType)) {
    addError(errors, 'type', `type must be one of: ${VALID_QUESTION_TYPES.join(', ')}`);
  }

  // version
  if (!('version' in data) || typeof data.version !== 'number' || (data.version as number) < 1) {
    addError(errors, 'version', 'version is required and must be >= 1');
  }

  // translations
  if ('translations' in data) {
    if (!Array.isArray(data.translations)) {
      addError(errors, 'translations', 'translations must be an array');
    } else {
      (data.translations as unknown[]).forEach((t, i) => {
        if (!isRecord(t)) {
          addError(errors, `translations[${i}]`, 'each translation must be an object');
          return;
        }
        if (!isString(t.translation_symbol)) {
          addError(errors, `translations[${i}].translation_symbol`, 'translation_symbol must be a string');
        }
        if (!isString(t.symbol)) {
          addError(errors, `translations[${i}].symbol`, 'symbol must be a string');
        }
      });
    }
  }

  // Type-specific parameters
  const type = data.type as string | undefined;
  if (type && VALID_QUESTION_TYPES.includes(type as QuestionType)) {
    if (type !== 'free-text' && !('parameters' in data)) {
      addError(errors, 'parameters', `${type} questions require parameters`);
    } else if ('parameters' in data) {
      const validator = getTypeSpecificValidator(type);
      if (validator) {
        errors.push(...validator(data.parameters));
      }
    }
  }

  if (errors.length > 0) {
    throw new QuestionValidationError(errors);
  }
}

export function validateQuestionUpdateInput(data: unknown): void {
  const errors: ValidationError[] = [];

  if (!isRecord(data)) {
    addError(errors, 'root', 'Input must be a non-null object');
    throw new QuestionValidationError(errors);
  }

  if ('collection_id' in data && !isNonEmptyString(data.collection_id)) {
    addError(errors, 'collection_id', 'collection_id must be a non-empty string');
  }

  if ('question_symbol' in data && !isNonEmptyString(data.question_symbol)) {
    addError(errors, 'question_symbol', 'question_symbol must be a non-empty string');
  }

  if ('type' in data) {
    if (!isString(data.type) || !VALID_QUESTION_TYPES.includes(data.type as QuestionType)) {
      addError(errors, 'type', `type must be one of: ${VALID_QUESTION_TYPES.join(', ')}`);
    }
  }

  if ('version' in data) {
    if (typeof data.version !== 'number' || (data.version as number) < 1) {
      addError(errors, 'version', 'version must be >= 1');
    }
  }

  if ('translations' in data) {
    if (!Array.isArray(data.translations)) {
      addError(errors, 'translations', 'translations must be an array');
    } else {
      (data.translations as unknown[]).forEach((t, i) => {
        if (!isRecord(t)) {
          addError(errors, `translations[${i}]`, 'each translation must be an object');
          return;
        }
        if (!isString(t.translation_symbol)) {
          addError(errors, `translations[${i}].translation_symbol`, 'translation_symbol must be a string');
        }
        if (!isString(t.symbol)) {
          addError(errors, `translations[${i}].symbol`, 'symbol must be a string');
        }
      });
    }
  }

  // Only validate type-specific params if both type AND parameters are present
  const type = data.type as string | undefined;
  if ('parameters' in data && type && VALID_QUESTION_TYPES.includes(type as QuestionType)) {
    const validator = getTypeSpecificValidator(type);
    if (validator) {
      errors.push(...validator(data.parameters));
    }
  }

  if (errors.length > 0) {
    throw new QuestionValidationError(errors);
  }
}
