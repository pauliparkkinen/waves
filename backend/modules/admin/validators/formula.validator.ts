/**
 * Formula input validation.
 *
 * Validates:
 * - Basic field presence and types (collection_id, symbol, expression, output_type, formula_references)
 * - AST expression structure (recursive tree validation)
 * - output_type compatibility with inferred expression type
 * - formula_references structure
 *
 * Reference existence validation (that referenced formulas/activities actually exist
 * in the collection) is done in the service layer, not here.
 */
import type {
  OutputType,
  FormulaReferenceType,
  AstNodeType,
  BinaryOperator,
  LogicalOperator,
  ComparisonOperator,
  FunctionName,
  InferredType,
} from '../types/formula.types.js';

export type ValidationError = { field: string; message: string };

export class FormulaValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('Formula validation failed');
    this.name = 'FormulaValidationError';
  }
}

const VALID_OUTPUT_TYPES: OutputType[] = ['number', 'boolean'];
const VALID_REFERENCE_TYPES: FormulaReferenceType[] = ['formula', 'activity'];

// ---- Helpers ----

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

// ---- AST Node Type Validation ----

const VALID_AST_NODE_TYPES: AstNodeType[] = [
  'literal',
  'variable',
  'binary_expression',
  'logical_expression',
  'unary_expression',
  'ternary_expression',
  'comparison_expression',
  'function_call',
];

const VALID_BINARY_OPERATORS: BinaryOperator[] = ['+', '-', '*', '/'];
const VALID_LOGICAL_OPERATORS: LogicalOperator[] = ['&&', '||'];
const VALID_COMPARISON_OPERATORS: ComparisonOperator[] = ['>', '<', '>=', '<=', '=='];
const VALID_FUNCTION_NAMES: FunctionName[] = ['max', 'min'];

/**
 * Validate a single AST node recursively.
 * Accumulates errors into the `errors` array with a dot-separated path prefix.
 */
function validateAstNode(node: unknown, errors: ValidationError[], path: string): void {
  if (!isRecord(node)) {
    addError(errors, path, 'AST node must be a non-null object');
    return;
  }

  // type field is required
  if (!('type' in node) || !isString(node.type)) {
    addError(errors, `${path}.type`, 'AST node must have a string type field');
    return;
  }

  if (!VALID_AST_NODE_TYPES.includes(node.type as AstNodeType)) {
    addError(
      errors,
      `${path}.type`,
      `Invalid AST node type "${String(node.type)}". Must be one of: ${VALID_AST_NODE_TYPES.join(', ')}`
    );
    return;
  }

  const nodeType = node.type as AstNodeType;

  switch (nodeType) {
    case 'literal': {
      if (!('value' in node)) {
        addError(errors, `${path}.value`, 'literal node must have a value field');
      } else if (typeof node.value !== 'number' && typeof node.value !== 'boolean') {
        addError(errors, `${path}.value`, 'literal value must be a number or boolean');
      }
      break;
    }

    case 'variable': {
      if (!('name' in node) || !isNonEmptyString(node.name)) {
        addError(errors, `${path}.name`, 'variable node must have a non-empty string name field');
      }
      break;
    }

    case 'binary_expression': {
      if (!('operator' in node) || !VALID_BINARY_OPERATORS.includes(node.operator as BinaryOperator)) {
        addError(
          errors,
          `${path}.operator`,
          `binary_expression operator must be one of: ${VALID_BINARY_OPERATORS.join(', ')}`
        );
      }
      if (!('left' in node)) {
        addError(errors, `${path}.left`, 'binary_expression must have a left operand');
      } else {
        validateAstNode(node.left, errors, `${path}.left`);
      }
      if (!('right' in node)) {
        addError(errors, `${path}.right`, 'binary_expression must have a right operand');
      } else {
        validateAstNode(node.right, errors, `${path}.right`);
      }
      break;
    }

    case 'logical_expression': {
      if (!('operator' in node) || !VALID_LOGICAL_OPERATORS.includes(node.operator as LogicalOperator)) {
        addError(
          errors,
          `${path}.operator`,
          `logical_expression operator must be one of: ${VALID_LOGICAL_OPERATORS.join(', ')}`
        );
      }
      if (!('left' in node)) {
        addError(errors, `${path}.left`, 'logical_expression must have a left operand');
      } else {
        validateAstNode(node.left, errors, `${path}.left`);
      }
      if (!('right' in node)) {
        addError(errors, `${path}.right`, 'logical_expression must have a right operand');
      } else {
        validateAstNode(node.right, errors, `${path}.right`);
      }
      break;
    }

    case 'comparison_expression': {
      if (!('operator' in node) || !VALID_COMPARISON_OPERATORS.includes(node.operator as ComparisonOperator)) {
        addError(
          errors,
          `${path}.operator`,
          `comparison_expression operator must be one of: ${VALID_COMPARISON_OPERATORS.join(', ')}`
        );
      }
      if (!('left' in node)) {
        addError(errors, `${path}.left`, 'comparison_expression must have a left operand');
      } else {
        validateAstNode(node.left, errors, `${path}.left`);
      }
      if (!('right' in node)) {
        addError(errors, `${path}.right`, 'comparison_expression must have a right operand');
      } else {
        validateAstNode(node.right, errors, `${path}.right`);
      }
      break;
    }

    case 'unary_expression': {
      if (!('operator' in node) || node.operator !== '-') {
        addError(errors, `${path}.operator`, 'unary_expression operator must be "-"');
      }
      if (!('operand' in node)) {
        addError(errors, `${path}.operand`, 'unary_expression must have an operand');
      } else {
        validateAstNode(node.operand, errors, `${path}.operand`);
      }
      break;
    }

    case 'ternary_expression': {
      if (!('condition' in node)) {
        addError(errors, `${path}.condition`, 'ternary_expression must have a condition');
      } else {
        validateAstNode(node.condition, errors, `${path}.condition`);
      }
      if (!('true_branch' in node)) {
        addError(errors, `${path}.true_branch`, 'ternary_expression must have a true_branch');
      } else {
        validateAstNode(node.true_branch, errors, `${path}.true_branch`);
      }
      if (!('false_branch' in node)) {
        addError(errors, `${path}.false_branch`, 'ternary_expression must have a false_branch');
      } else {
        validateAstNode(node.false_branch, errors, `${path}.false_branch`);
      }
      break;
    }

    case 'function_call': {
      if (!('function' in node) || !VALID_FUNCTION_NAMES.includes(node.function as FunctionName)) {
        addError(
          errors,
          `${path}.function`,
          `function_call function name must be one of: ${VALID_FUNCTION_NAMES.join(', ')}`
        );
      }
      if (!('arguments' in node) || !Array.isArray(node.arguments)) {
        addError(errors, `${path}.arguments`, 'function_call must have an arguments array');
      } else {
        const args = node.arguments as unknown[];
        if (args.length < 1) {
          addError(errors, `${path}.arguments`, 'function_call must have at least 1 argument');
        }
        args.forEach((arg, i) => {
          validateAstNode(arg, errors, `${path}.arguments[${i}]`);
        });
      }
      break;
    }
  }
}

// ---- Type Inference ----

/**
 * Infer the result type of an AST node.
 * Returns 'unknown' for variable nodes (type cannot be determined statically).
 * Errors are expected to have been caught by validateAstNode already.
 */
export function inferAstType(node: Record<string, unknown>): InferredType {
  const type = node.type as string;

  switch (type) {
    case 'literal': {
      return typeof node.value === 'boolean' ? 'boolean' : 'number';
    }
    case 'variable': {
      return 'unknown';
    }
    case 'binary_expression': {
      return 'number';
    }
    case 'logical_expression': {
      return 'boolean';
    }
    case 'comparison_expression': {
      return 'boolean';
    }
    case 'function_call': {
      return 'number';
    }
    case 'unary_expression': {
      return 'number';
    }
    case 'ternary_expression': {
      // Infer from both branches; if they match, use that type, else unknown
      if (
        node.true_branch &&
        isRecord(node.true_branch) &&
        node.false_branch &&
        isRecord(node.false_branch)
      ) {
        const trueType = inferAstType(node.true_branch);
        const falseType = inferAstType(node.false_branch);
        if (trueType === falseType) return trueType;
      }
      return 'unknown';
    }
    default:
      return 'unknown';
  }
}

// ---- Formula Reference Validation ----

function validateFormulaReferences(references: unknown, errors: ValidationError[]): void {
  if (!Array.isArray(references)) {
    addError(errors, 'formula_references', 'formula_references must be an array');
    return;
  }

  (references as unknown[]).forEach((ref, i) => {
    const prefix = `formula_references[${i}]`;

    if (!isRecord(ref)) {
      addError(errors, prefix, 'each formula_reference must be an object');
      return;
    }

    if (!('formula_reference_id' in ref) || !isNonEmptyString(ref.formula_reference_id)) {
      addError(errors, `${prefix}.formula_reference_id`, 'formula_reference_id must be a non-empty string');
    }

    if (!('symbol' in ref) || !isNonEmptyString(ref.symbol)) {
      addError(errors, `${prefix}.symbol`, 'symbol must be a non-empty string');
    }

    if (!('type' in ref) || !VALID_REFERENCE_TYPES.includes(ref.type as FormulaReferenceType)) {
      addError(
        errors,
        `${prefix}.type`,
        `type must be one of: ${VALID_REFERENCE_TYPES.join(', ')}`
      );
    }

    // referenced_formula_id is required only when type is 'formula'
    if (
      ref.type === 'formula' &&
      (!('referenced_formula_id' in ref) || !isNonEmptyString(ref.referenced_formula_id))
    ) {
      addError(
        errors,
        `${prefix}.referenced_formula_id`,
        'referenced_formula_id is required when type is "formula"'
      );
    }

    // referenced_formula_id must NOT be present when type is 'activity'
    if (ref.type === 'activity' && 'referenced_formula_id' in ref && ref.referenced_formula_id !== undefined) {
      addError(
        errors,
        `${prefix}.referenced_formula_id`,
        'referenced_formula_id must not be set when type is "activity"'
      );
    }
  });
}

// ---- Public API ----

export function validateFormulaInput(data: unknown): void {
  const errors: ValidationError[] = [];

  if (!isRecord(data)) {
    addError(errors, 'root', 'Input must be a non-null object');
    throw new FormulaValidationError(errors);
  }

  // collection_id
  if (!('collection_id' in data) || !isNonEmptyString(data.collection_id)) {
    addError(errors, 'collection_id', 'collection_id is required and must be a non-empty string');
  }

  // symbol
  if (!('symbol' in data) || !isNonEmptyString(data.symbol)) {
    addError(errors, 'symbol', 'symbol is required and must be a non-empty string');
  }

  // expression
  if (!('expression' in data)) {
    addError(errors, 'expression', 'expression is required');
  } else if (!isRecord(data.expression)) {
    addError(errors, 'expression', 'expression must be a non-null object (JSON AST)');
  } else {
    validateAstNode(data.expression, errors, 'expression');
  }

  // output_type
  if (!('output_type' in data) || !isString(data.output_type) || !VALID_OUTPUT_TYPES.includes(data.output_type as OutputType)) {
    addError(errors, 'output_type', 'output_type must be one of: number, boolean');
  }

  // output_type compatibility with expression
  if (
    'expression' in data &&
    'output_type' in data &&
    isRecord(data.expression) &&
    data.expression.type &&
    isString(data.output_type) &&
    VALID_OUTPUT_TYPES.includes(data.output_type as OutputType)
  ) {
    const inferred = inferAstType(data.expression as Record<string, unknown>);
    const declaredType = data.output_type as OutputType;
    if (inferred !== 'unknown' && inferred !== declaredType) {
      addError(
        errors,
        'output_type',
        `Expression type "${inferred}" is not compatible with declared output_type "${declaredType}"`
      );
    }
  }

  // formula_references
  if (!('formula_references' in data)) {
    addError(errors, 'formula_references', 'formula_references is required');
  } else {
    validateFormulaReferences(data.formula_references, errors);
  }

  if (errors.length > 0) {
    throw new FormulaValidationError(errors);
  }
}

export function validateFormulaUpdateInput(data: unknown): void {
  const errors: ValidationError[] = [];

  if (!isRecord(data)) {
    addError(errors, 'root', 'Input must be a non-null object');
    throw new FormulaValidationError(errors);
  }

  if ('collection_id' in data && !isNonEmptyString(data.collection_id)) {
    addError(errors, 'collection_id', 'collection_id must be a non-empty string');
  }

  if ('symbol' in data && !isNonEmptyString(data.symbol)) {
    addError(errors, 'symbol', 'symbol must be a non-empty string');
  }

  if ('expression' in data) {
    if (!isRecord(data.expression)) {
      addError(errors, 'expression', 'expression must be a non-null object (JSON AST)');
    } else {
      validateAstNode(data.expression, errors, 'expression');
    }
  }

  if ('output_type' in data) {
    if (!isString(data.output_type) || !VALID_OUTPUT_TYPES.includes(data.output_type as OutputType)) {
      addError(errors, 'output_type', 'output_type must be one of: number, boolean');
    }
  }

  // output_type compatibility (only when both are present)
  if (
    'expression' in data &&
    'output_type' in data &&
    isRecord(data.expression) &&
    data.expression.type &&
    isString(data.output_type) &&
    VALID_OUTPUT_TYPES.includes(data.output_type as OutputType)
  ) {
    const inferred = inferAstType(data.expression as Record<string, unknown>);
    const declaredType = data.output_type as OutputType;
    if (inferred !== 'unknown' && inferred !== declaredType) {
      addError(
        errors,
        'output_type',
        `Expression type "${inferred}" is not compatible with declared output_type "${declaredType}"`
      );
    }
  }

  if ('formula_references' in data) {
    validateFormulaReferences(data.formula_references, errors);
  }

  if (errors.length > 0) {
    throw new FormulaValidationError(errors);
  }
}
