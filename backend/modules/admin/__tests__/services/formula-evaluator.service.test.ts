import { describe, it, expect } from 'vitest';
import { FormulaEvaluatorService } from '../../services/formula-evaluator.service.js';
import type { AstNode } from '../../types/formula.types.js';

const service = new FormulaEvaluatorService();

describe('FormulaEvaluatorService', () => {
  describe('evaluate', () => {
    describe('given a literal node', () => {
      it('when it is a number, then it returns the number', () => {
        const node: AstNode = { type: 'literal', value: 42 };

        const result = service.evaluate(node, {});

        expect(result).toBe(42);
      });

      it('when it is a boolean, then it returns the boolean', () => {
        const node: AstNode = { type: 'literal', value: true };

        const result = service.evaluate(node, {});

        expect(result).toBe(true);
      });
    });

    describe('given a variable node', () => {
      it('when the variable exists in the map, then it returns its value', () => {
        const node: AstNode = { type: 'variable', name: 'x' };

        const result = service.evaluate(node, { x: 10 });

        expect(result).toBe(10);
      });

      it('when the variable does not exist, then it throws', () => {
        const node: AstNode = { type: 'variable', name: 'missing' };

        expect(() => service.evaluate(node, {})).toThrow('Variable not found: missing');
      });
    });

    describe('given a binary_expression node', () => {
      it('when operator is +, then it adds left and right', () => {
        const node: AstNode = {
          type: 'binary_expression',
          operator: '+',
          left: { type: 'literal', value: 5 },
          right: { type: 'literal', value: 3 },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(8);
      });

      it('when operator is -, then it subtracts right from left', () => {
        const node: AstNode = {
          type: 'binary_expression',
          operator: '-',
          left: { type: 'literal', value: 10 },
          right: { type: 'literal', value: 4 },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(6);
      });

      it('when operator is *, then it multiplies left and right', () => {
        const node: AstNode = {
          type: 'binary_expression',
          operator: '*',
          left: { type: 'literal', value: 3 },
          right: { type: 'literal', value: 7 },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(21);
      });

      it('when operator is /, then it divides left by right', () => {
        const node: AstNode = {
          type: 'binary_expression',
          operator: '/',
          left: { type: 'literal', value: 20 },
          right: { type: 'literal', value: 4 },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(5);
      });

      it('when dividing by zero, then it throws', () => {
        const node: AstNode = {
          type: 'binary_expression',
          operator: '/',
          left: { type: 'literal', value: 10 },
          right: { type: 'literal', value: 0 },
        };

        expect(() => service.evaluate(node, {})).toThrow('Division by zero');
      });
    });

    describe('given a logical_expression node', () => {
      it('when operator is || and left is true, then it short-circuits and returns true', () => {
        const node: AstNode = {
          type: 'logical_expression',
          operator: '||',
          left: { type: 'literal', value: true },
          right: { type: 'variable', name: 'undefined' },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(true);
      });

      it('when operator is || and both are false, then it returns false', () => {
        const node: AstNode = {
          type: 'logical_expression',
          operator: '||',
          left: { type: 'literal', value: false },
          right: { type: 'literal', value: false },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(false);
      });

      it('when operator is && and left is false, then it short-circuits and returns false', () => {
        const node: AstNode = {
          type: 'logical_expression',
          operator: '&&',
          left: { type: 'literal', value: false },
          right: { type: 'literal', value: true },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(false);
      });

      it('when operator is && and both are true, then it returns true', () => {
        const node: AstNode = {
          type: 'logical_expression',
          operator: '&&',
          left: { type: 'literal', value: true },
          right: { type: 'literal', value: true },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(true);
      });
    });

    describe('given a comparison_expression node', () => {
      it('when operator is > and left > right, then it returns true', () => {
        const node: AstNode = {
          type: 'comparison_expression',
          operator: '>',
          left: { type: 'literal', value: 5 },
          right: { type: 'literal', value: 3 },
        };

        expect(service.evaluate(node, {})).toBe(true);
      });

      it('when operator is > and left <= right, then it returns false', () => {
        const node: AstNode = {
          type: 'comparison_expression',
          operator: '>',
          left: { type: 'literal', value: 3 },
          right: { type: 'literal', value: 5 },
        };

        expect(service.evaluate(node, {})).toBe(false);
      });

      it('when operator is <, then it compares correctly', () => {
        const node: AstNode = {
          type: 'comparison_expression',
          operator: '<',
          left: { type: 'literal', value: 2 },
          right: { type: 'literal', value: 8 },
        };

        expect(service.evaluate(node, {})).toBe(true);
      });

      it('when operator is >=, then it compares correctly', () => {
        const node: AstNode = {
          type: 'comparison_expression',
          operator: '>=',
          left: { type: 'literal', value: 5 },
          right: { type: 'literal', value: 5 },
        };

        expect(service.evaluate(node, {})).toBe(true);
      });

      it('when operator is <=, then it compares correctly', () => {
        const node: AstNode = {
          type: 'comparison_expression',
          operator: '<=',
          left: { type: 'literal', value: 4 },
          right: { type: 'literal', value: 4 },
        };

        expect(service.evaluate(node, {})).toBe(true);
      });

      it('when operator is ==, then it compares correctly', () => {
        const node: AstNode = {
          type: 'comparison_expression',
          operator: '==',
          left: { type: 'literal', value: 7 },
          right: { type: 'literal', value: 7 },
        };

        expect(service.evaluate(node, {})).toBe(true);
      });

      it('when operator is == and values differ, then it returns false', () => {
        const node: AstNode = {
          type: 'comparison_expression',
          operator: '==',
          left: { type: 'literal', value: 7 },
          right: { type: 'literal', value: 8 },
        };

        expect(service.evaluate(node, {})).toBe(false);
      });
    });

    describe('given a unary_expression node', () => {
      it('when operator is -, then it negates the operand', () => {
        const node: AstNode = {
          type: 'unary_expression',
          operator: '-',
          operand: { type: 'literal', value: 42 },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(-42);
      });
    });

    describe('given a ternary_expression node', () => {
      it('when condition is true, then it returns the true_branch', () => {
        const node: AstNode = {
          type: 'ternary_expression',
          condition: { type: 'literal', value: true },
          true_branch: { type: 'literal', value: 100 },
          false_branch: { type: 'literal', value: 200 },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(100);
      });

      it('when condition is false, then it returns the false_branch', () => {
        const node: AstNode = {
          type: 'ternary_expression',
          condition: { type: 'literal', value: false },
          true_branch: { type: 'literal', value: 100 },
          false_branch: { type: 'literal', value: 200 },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(200);
      });
    });

    describe('given a function_call node', () => {
      it('when function is max, then it returns the maximum', () => {
        const node: AstNode = {
          type: 'function_call',
          function: 'max',
          arguments: [
            { type: 'literal', value: 3 },
            { type: 'literal', value: 7 },
            { type: 'literal', value: 5 },
          ],
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(7);
      });

      it('when function is min, then it returns the minimum', () => {
        const node: AstNode = {
          type: 'function_call',
          function: 'min',
          arguments: [
            { type: 'literal', value: 3 },
            { type: 'literal', value: 7 },
            { type: 'literal', value: 5 },
          ],
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(3);
      });
    });

    describe('given a nested/deep AST tree', () => {
      it('when nodes are deeply nested, then it evaluates correctly', () => {
        const node: AstNode = {
          type: 'binary_expression',
          operator: '+',
          left: {
            type: 'binary_expression',
            operator: '*',
            left: { type: 'literal', value: 2 },
            right: { type: 'literal', value: 3 },
          },
          right: {
            type: 'binary_expression',
            operator: '/',
            left: { type: 'literal', value: 10 },
            right: { type: 'literal', value: 2 },
          },
        };

        const result = service.evaluate(node, {});

        expect(result).toBe(11);
      });

      it('when combining variables and operators, then it evaluates correctly', () => {
        const node: AstNode = {
          type: 'comparison_expression',
          operator: '>',
          left: {
            type: 'binary_expression',
            operator: '+',
            left: { type: 'variable', name: 'a' },
            right: { type: 'variable', name: 'b' },
          },
          right: { type: 'literal', value: 10 },
        };

        const result = service.evaluate(node, { a: 5, b: 7 });

        expect(result).toBe(true);
      });
    });

    describe('given an unknown node type', () => {
      it('then it throws', () => {
        const node = { type: 'unknown_type' } as unknown as AstNode;

        expect(() => service.evaluate(node, {})).toThrow('Unknown node type');
      });
    });
  });
});
