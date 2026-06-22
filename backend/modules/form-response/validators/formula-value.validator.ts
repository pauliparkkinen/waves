export class FormulaValueValidationError extends Error {
  constructor(public readonly errors: Array<{ field: string; message: string }>) {
    super('Formula value validation failed');
    this.name = 'FormulaValueValidationError';
  }
}

// ---- Helpers ----

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

// ---- Create FormulaValue ----

export function validateCreateFormulaValueInput(data: unknown): void {
  if (!isRecord(data)) {
    throw new FormulaValueValidationError([{ field: 'root', message: 'Input must be a non-null object' }]);
  }

  const errors: Array<{ field: string; message: string }> = [];

  if (!isNonEmptyString(data.collection_id)) {
    addError(errors, 'collection_id', 'collection_id is required and must be a non-empty string');
  }

  if (!isNonEmptyString(data.formula_symbol)) {
    addError(errors, 'formula_symbol', 'formula_symbol is required and must be a non-empty string');
  }

  if (!isNumber(data.formula_version)) {
    addError(errors, 'formula_version', 'formula_version is required and must be a number');
  }

  if (data.entity_type !== 'user') {
    addError(errors, 'entity_type', 'entity_type must be "user"');
  }

  if (!isNonEmptyString(data.entity_id)) {
    addError(errors, 'entity_id', 'entity_id is required and must be a non-empty string');
  }

  if (typeof data.value !== 'number' && typeof data.value !== 'boolean') {
    addError(errors, 'value', 'value must be a number or boolean');
  }

  if (!Array.isArray(data.inputs)) {
    addError(errors, 'inputs', 'inputs must be an array');
  } else {
    for (let i = 0; i < data.inputs.length; i++) {
      const ref = data.inputs[i];
      if (!isRecord(ref) || !['formula_value', 'activity_value'].includes(ref.type as string)) {
        addError(errors, `inputs[${i}].type`, 'input type must be "formula_value" or "activity_value"');
      }
      if (!isNonEmptyString(ref.id as string)) {
        addError(errors, `inputs[${i}].id`, 'input id must be a non-empty string');
      }
    }
  }

  if (errors.length > 0) {
    throw new FormulaValueValidationError(errors);
  }
}
