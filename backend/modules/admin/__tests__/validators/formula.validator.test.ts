import { describe, it, expect } from 'vitest';
import {
  validateFormulaInput,
  validateFormulaUpdateInput,
  FormulaValidationError,
  inferAstType,
} from '../../validators/formula.validator.js';

// ---- Fixtures ----

const validNumberExpr = {
  type: 'binary_expression',
  operator: '+',
  left: { type: 'literal', value: 5 },
  right: { type: 'literal', value: 3 },
};

const validBooleanExpr = {
  type: 'logical_expression',
  operator: '&&',
  left: { type: 'literal', value: true },
  right: { type: 'literal', value: false },
};

const validFormulaInput = {
  collection_id: 'col-1',
  symbol: 'my-formula',
  expression: validNumberExpr,
  output_type: 'number',
  formula_references: [
    { formula_reference_id: 'ref-1', symbol: 'ref1', type: 'formula', referenced_formula_id: 'f-1' },
  ],
};

// ---- inferAstType ----

describe('inferAstType', () => {
  describe('given a literal node', () => {
    it('when the value is a number, then it returns "number"', () => {
      expect(inferAstType({ type: 'literal', value: 42 })).toBe('number');
    });

    it('when the value is a boolean, then it returns "boolean"', () => {
      expect(inferAstType({ type: 'literal', value: true })).toBe('boolean');
    });
  });

  describe('given a variable node', () => {
    it('when called, then it returns "unknown"', () => {
      expect(inferAstType({ type: 'variable', name: 'q1' })).toBe('unknown');
    });
  });

  describe('given a binary_expression node', () => {
    it('when called, then it returns "number"', () => {
      expect(inferAstType(validNumberExpr)).toBe('number');
    });
  });

  describe('given a logical_expression node', () => {
    it('when called, then it returns "boolean"', () => {
      expect(inferAstType(validBooleanExpr)).toBe('boolean');
    });
  });

  describe('given a comparison_expression node', () => {
    it('when called, then it returns "boolean"', () => {
      expect(inferAstType({ type: 'comparison_expression', operator: '>', left: { type: 'literal', value: 5 }, right: { type: 'literal', value: 3 } })).toBe('boolean');
    });
  });

  describe('given a function_call node', () => {
    it('when called, then it returns "number"', () => {
      expect(inferAstType({
        type: 'function_call',
        function: 'max',
        arguments: [{ type: 'literal', value: 5 }, { type: 'literal', value: 10 }],
      })).toBe('number');
    });
  });

  describe('given a unary_expression node', () => {
    it('when called, then it returns "number"', () => {
      expect(inferAstType({ type: 'unary_expression', operator: '-', operand: { type: 'literal', value: 5 } })).toBe('number');
    });
  });

  describe('given a ternary_expression node', () => {
    it('when true_branch is a number literal, then it returns "number"', () => {
      const node = {
        type: 'ternary_expression',
        condition: { type: 'literal', value: true },
        true_branch: { type: 'literal', value: 10 },
        false_branch: { type: 'literal', value: 20 },
      };
      expect(inferAstType(node)).toBe('number');
    });

    it('when true_branch is a boolean literal, then it returns "boolean"', () => {
      const node = {
        type: 'ternary_expression',
        condition: { type: 'literal', value: true },
        true_branch: { type: 'literal', value: true },
        false_branch: { type: 'literal', value: false },
      };
      expect(inferAstType(node)).toBe('boolean');
    });

    it('when branches have mismatched types, then it returns "unknown"', () => {
      const node = {
        type: 'ternary_expression',
        condition: { type: 'literal', value: true },
        true_branch: { type: 'literal', value: 42 },
        false_branch: { type: 'literal', value: false },
      };
      expect(inferAstType(node)).toBe('unknown');
    });
  });

  describe('given an unknown node type', () => {
    it('when called, then it returns "unknown"', () => {
      expect(inferAstType({ type: 'unknown_type' })).toBe('unknown');
    });
  });
});

// ---- validateFormulaInput ----

describe('validateFormulaInput', () => {
  describe('root validation', () => {
    it('given null input, then it throws FormulaValidationError', () => {
      expect(() => validateFormulaInput(null)).toThrow(FormulaValidationError);
    });

    it('given a non-object input, then it throws', () => {
      expect(() => validateFormulaInput('string')).toThrow(FormulaValidationError);
    });
  });

  describe('required fields', () => {
    it('given missing collection_id, then it throws', () => {
      const { collection_id: _, ...data } = validFormulaInput;
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given missing symbol, then it throws', () => {
      const { symbol: _, ...data } = validFormulaInput;
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given missing expression, then it throws', () => {
      const { expression: _, ...data } = validFormulaInput;
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given missing output_type, then it throws', () => {
      const { output_type: _, ...data } = validFormulaInput;
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given missing formula_references, then it throws', () => {
      const { formula_references: _, ...data } = validFormulaInput;
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });
  });

  describe('field type validation', () => {
    it('given empty collection_id, then it throws', () => {
      const data = { ...validFormulaInput, collection_id: '' };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given empty symbol, then it throws', () => {
      const data = { ...validFormulaInput, symbol: '' };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given expression that is not an object, then it throws', () => {
      const data = { ...validFormulaInput, expression: 'not-an-object' };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given invalid output_type, then it throws', () => {
      const data = { ...validFormulaInput, output_type: 'string' };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given formula_references is not an array, then it throws', () => {
      const data = { ...validFormulaInput, formula_references: 'not-array' };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });
  });

  describe('AST validation', () => {
    it('given a valid number expression, then it does not throw', () => {
      expect(() => validateFormulaInput(validFormulaInput)).not.toThrow();
    });

    it('given a valid boolean expression, then it does not throw', () => {
      const data = { ...validFormulaInput, expression: validBooleanExpr, output_type: 'boolean' };
      expect(() => validateFormulaInput(data)).not.toThrow();
    });

    it('given expression with null type, then it throws', () => {
      const data = { ...validFormulaInput, expression: { type: null } };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given expression with invalid node type, then it throws', () => {
      const data = { ...validFormulaInput, expression: { type: 'invalid_node' } };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given literal without value, then it throws', () => {
      const data = { ...validFormulaInput, expression: { type: 'literal' } };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given literal with string value, then it throws', () => {
      const data = { ...validFormulaInput, expression: { type: 'literal', value: 'string' } };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given variable without name, then it throws', () => {
      const data = { ...validFormulaInput, expression: { type: 'variable' } };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given binary_expression without operator, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'binary_expression', left: { type: 'literal', value: 1 }, right: { type: 'literal', value: 2 } },
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given binary_expression with invalid operator, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'binary_expression', operator: '^', left: { type: 'literal', value: 1 }, right: { type: 'literal', value: 2 } },
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given binary_expression without left operand, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'binary_expression', operator: '+', right: { type: 'literal', value: 2 } },
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given binary_expression without right operand, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'binary_expression', operator: '+', left: { type: 'literal', value: 1 } },
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given logical_expression without operator, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'logical_expression', left: { type: 'literal', value: true }, right: { type: 'literal', value: false } },
        output_type: 'boolean',
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given logical_expression with invalid operator, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'logical_expression', operator: '|||', left: { type: 'literal', value: true }, right: { type: 'literal', value: false } },
        output_type: 'boolean',
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given unary_expression with invalid operator, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'unary_expression', operator: '!', operand: { type: 'literal', value: 5 } },
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given unary_expression without operand, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'unary_expression', operator: '-' },
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given ternary_expression without condition, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'ternary_expression', true_branch: { type: 'literal', value: 1 }, false_branch: { type: 'literal', value: 2 } },
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given ternary_expression without true_branch, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'ternary_expression', condition: { type: 'literal', value: true }, false_branch: { type: 'literal', value: 2 } },
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given ternary_expression without false_branch, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'ternary_expression', condition: { type: 'literal', value: true }, true_branch: { type: 'literal', value: 1 } },
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given a valid comparison_expression, then it does not throw', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'comparison_expression', operator: '>', left: { type: 'literal', value: 10 }, right: { type: 'literal', value: 5 } },
        output_type: 'boolean',
      };
      expect(() => validateFormulaInput(data)).not.toThrow();
    });

    it('given comparison_expression with invalid operator, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'comparison_expression', operator: '!=', left: { type: 'literal', value: 1 }, right: { type: 'literal', value: 2 } },
        output_type: 'boolean',
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given comparison_expression without left operand, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'comparison_expression', operator: '>=', right: { type: 'literal', value: 5 } },
        output_type: 'boolean',
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given comparison_expression with number output_type, then it throws (type mismatch)', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'comparison_expression', operator: '<=', left: { type: 'literal', value: 10 }, right: { type: 'literal', value: 5 } },
        output_type: 'number',
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given deeply nested recursive AST, then it validates all levels', () => {
      const data = {
        ...validFormulaInput,
        expression: {
          type: 'binary_expression',
          operator: '+',
          left: {
            type: 'binary_expression',
            operator: '*',
            left: { type: 'literal', value: 2 },
            right: { type: 'variable', name: 'x' },
          },
          right: { type: 'literal', value: 10 },
        },
      };
      expect(() => validateFormulaInput(data)).not.toThrow();
    });

    it('given deeply nested AST with invalid inner node, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: {
          type: 'binary_expression',
          operator: '+',
          left: {
            type: 'binary_expression',
            operator: '*',
            left: { type: 'literal', value: 2 },
            right: { type: 'invalid_type' },
          },
          right: { type: 'literal', value: 10 },
        },
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given a valid function_call (max), then it does not throw', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'function_call', function: 'max', arguments: [{ type: 'literal', value: 5 }, { type: 'literal', value: 10 }] },
        output_type: 'number',
      };
      expect(() => validateFormulaInput(data)).not.toThrow();
    });

    it('given a valid function_call (min), then it does not throw', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'function_call', function: 'min', arguments: [{ type: 'literal', value: 3 }, { type: 'literal', value: 7 }, { type: 'literal', value: 1 }] },
        output_type: 'number',
      };
      expect(() => validateFormulaInput(data)).not.toThrow();
    });

    it('given function_call with invalid function name, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'function_call', function: 'sum', arguments: [{ type: 'literal', value: 1 }] },
        output_type: 'number',
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given function_call with non-array arguments, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'function_call', function: 'max', arguments: 'not-array' },
        output_type: 'number',
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given function_call with empty arguments, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'function_call', function: 'max', arguments: [] },
        output_type: 'number',
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given function_call with boolean output_type, then it throws (type mismatch)', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'function_call', function: 'min', arguments: [{ type: 'literal', value: 1 }, { type: 'literal', value: 2 }] },
        output_type: 'boolean',
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given function_call with invalid inner node, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: { type: 'function_call', function: 'max', arguments: [{ type: 'literal', value: 5 }, { type: 'invalid' }] },
        output_type: 'number',
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });
  });

  describe('output_type compatibility', () => {
    it('given number expression with boolean output_type, then it throws', () => {
      const data = { ...validFormulaInput, expression: validNumberExpr, output_type: 'boolean' };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given boolean expression with number output_type, then it throws', () => {
      const data = { ...validFormulaInput, expression: validBooleanExpr, output_type: 'number' };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given variable expression with any output_type, then it does not throw (unknown type)', () => {
      const varExpr = { type: 'variable', name: 'q1' };
      const dataNum = { ...validFormulaInput, expression: varExpr, output_type: 'number' };
      const dataBool = { ...validFormulaInput, expression: varExpr, output_type: 'boolean' };
      expect(() => validateFormulaInput(dataNum)).not.toThrow();
      expect(() => validateFormulaInput(dataBool)).not.toThrow();
    });

    it('given ternary with boolean branches and number output_type, then it throws', () => {
      const data = {
        ...validFormulaInput,
        expression: {
          type: 'ternary_expression',
          condition: { type: 'literal', value: true },
          true_branch: { type: 'literal', value: true },
          false_branch: { type: 'literal', value: false },
        },
        output_type: 'number',
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given ternary with mismatched branches, then any output_type passes (unknown)', () => {
      const data = {
        ...validFormulaInput,
        expression: {
          type: 'ternary_expression',
          condition: { type: 'literal', value: true },
          true_branch: { type: 'literal', value: 42 },
          false_branch: { type: 'literal', value: false },
        },
        output_type: 'number',
      };
      expect(() => validateFormulaInput(data)).not.toThrow();
    });
  });

  describe('formula_references validation', () => {
    it('given valid references, then it does not throw', () => {
      expect(() => validateFormulaInput(validFormulaInput)).not.toThrow();
    });

    it('given reference with missing formula_reference_id, then it throws', () => {
      const data = {
        ...validFormulaInput,
        formula_references: [
          { symbol: 'ref1', type: 'formula', referenced_formula_id: 'f-1' },
        ],
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given reference with empty symbol, then it throws', () => {
      const data = {
        ...validFormulaInput,
        formula_references: [
          { formula_reference_id: 'ref-1', symbol: '', type: 'formula', referenced_formula_id: 'f-1' },
        ],
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given reference with invalid type, then it throws', () => {
      const data = {
        ...validFormulaInput,
        formula_references: [
          { formula_reference_id: 'ref-1', symbol: 'ref1', type: 'invalid-type' },
        ],
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given formula reference with missing referenced_formula_id, then it throws', () => {
      const data = {
        ...validFormulaInput,
        formula_references: [
          { formula_reference_id: 'ref-1', symbol: 'ref1', type: 'formula' },
        ],
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given activity reference with referenced_formula_id set, then it throws', () => {
      const data = {
        ...validFormulaInput,
        formula_references: [
          { formula_reference_id: 'ref-1', symbol: 'ref1', type: 'activity', referenced_formula_id: 'f-1' },
        ],
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });

    it('given a reference that is not an object, then it throws', () => {
      const data = {
        ...validFormulaInput,
        formula_references: ['not-an-object'],
      };
      expect(() => validateFormulaInput(data)).toThrow(FormulaValidationError);
    });
  });

  describe('valid creation', () => {
    it('given fully valid input with number expression, then it does not throw', () => {
      expect(() => validateFormulaInput(validFormulaInput)).not.toThrow();
    });

    it('given fully valid input with boolean expression, then it does not throw', () => {
      const data = { ...validFormulaInput, expression: validBooleanExpr, output_type: 'boolean' };
      expect(() => validateFormulaInput(data)).not.toThrow();
    });
  });
});

// ---- validateFormulaUpdateInput ----

describe('validateFormulaUpdateInput', () => {
  describe('root validation', () => {
    it('given null input, then it throws FormulaValidationError', () => {
      expect(() => validateFormulaUpdateInput(null)).toThrow(FormulaValidationError);
    });

    it('given a non-object input, then it throws', () => {
      expect(() => validateFormulaUpdateInput('string')).toThrow(FormulaValidationError);
    });
  });

  describe('partial updates', () => {
    it('given empty object (no fields), then it does not throw', () => {
      expect(() => validateFormulaUpdateInput({})).not.toThrow();
    });

    it('given only symbol, then it validates just that field', () => {
      expect(() => validateFormulaUpdateInput({ symbol: 'valid-symbol' })).not.toThrow();
    });

    it('given empty symbol in update, then it throws', () => {
      expect(() => validateFormulaUpdateInput({ symbol: '' })).toThrow(FormulaValidationError);
    });

    it('given empty collection_id in update, then it throws', () => {
      expect(() => validateFormulaUpdateInput({ collection_id: '' })).toThrow(FormulaValidationError);
    });

    it('given invalid expression in update, then it throws', () => {
      const data = { expression: { type: 'invalid' } };
      expect(() => validateFormulaUpdateInput(data)).toThrow(FormulaValidationError);
    });

    it('given expression is not an object in update, then it throws', () => {
      const data = { expression: 'string' };
      expect(() => validateFormulaUpdateInput(data)).toThrow(FormulaValidationError);
    });

    it('given invalid output_type in update, then it throws', () => {
      expect(() => validateFormulaUpdateInput({ output_type: 'invalid' })).toThrow(FormulaValidationError);
    });

    it('given invalid formula_references in update, then it throws', () => {
      const data = { formula_references: 'not-array' };
      expect(() => validateFormulaUpdateInput(data)).toThrow(FormulaValidationError);
    });
  });

  describe('output_type compatibility in update', () => {
    it('given both expression and output_type are present and compatible, then it does not throw', () => {
      const data = { expression: validNumberExpr, output_type: 'number' };
      expect(() => validateFormulaUpdateInput(data)).not.toThrow();
    });

    it('given both expression and output_type are present but incompatible, then it throws', () => {
      const data = { expression: validNumberExpr, output_type: 'boolean' };
      expect(() => validateFormulaUpdateInput(data)).toThrow(FormulaValidationError);
    });
  });

  describe('valid partial updates', () => {
    it('given a single field update (symbol), then it does not throw', () => {
      expect(() => validateFormulaUpdateInput({ symbol: 'new-symbol' })).not.toThrow();
    });

    it('given a full valid update, then it does not throw', () => {
      const data = {
        symbol: 'updated-formula',
        output_type: 'number',
        expression: validNumberExpr,
      };
      expect(() => validateFormulaUpdateInput(data)).not.toThrow();
    });

    it('given references update, then it validates', () => {
      const data = {
        formula_references: [
          { formula_reference_id: 'ref-1', symbol: 'ref1', type: 'activity' },
        ],
      };
      expect(() => validateFormulaUpdateInput(data)).not.toThrow();
    });
  });
});
