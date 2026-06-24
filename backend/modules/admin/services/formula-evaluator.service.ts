import type { AstNode } from '../types/formula.types.js';

export interface IFormulaEvaluatorService {
  evaluate(node: AstNode, variables: Record<string, number | boolean>): number | boolean;
}

export class FormulaEvaluatorService implements IFormulaEvaluatorService {
  evaluate(node: AstNode, variables: Record<string, number | boolean>): number | boolean {
    switch (node.type) {
      case 'literal':
        return node.value;
      case 'variable':
        return this.evaluateVariable(node, variables);
      case 'binary_expression':
        return this.evaluateBinary(node, variables);
      case 'logical_expression':
        return this.evaluateLogical(node, variables);
      case 'comparison_expression':
        return this.evaluateComparison(node, variables);
      case 'unary_expression':
        return this.evaluateUnary(node, variables);
      case 'ternary_expression':
        return this.evaluateTernary(node, variables);
      case 'function_call':
        return this.evaluateFunctionCall(node, variables);
      default:
        throw new Error(`Unknown node type: ${(node as AstNode).type}`);
    }
  }

  private evaluateVariable(
    node: { type: 'variable'; name: string },
    variables: Record<string, number | boolean>,
  ): number | boolean {
    if (!(node.name in variables)) {
      throw new Error(`Variable not found: ${node.name}`);
    }
    return variables[node.name];
  }

  private evaluateBinary(
    node: {
      type: 'binary_expression';
      operator: '+' | '-' | '*' | '/';
      left: AstNode;
      right: AstNode;
    },
    variables: Record<string, number | boolean>,
  ): number {
    const left = this.evaluate(node.left, variables);
    const right = this.evaluate(node.right, variables);
    const numLeft = Number(left);
    const numRight = Number(right);

    switch (node.operator) {
      case '+':
        return numLeft + numRight;
      case '-':
        return numLeft - numRight;
      case '*':
        return numLeft * numRight;
      case '/': {
        if (numRight === 0) {
          throw new Error('Division by zero');
        }
        return numLeft / numRight;
      }
      default:
        throw new Error(`Unknown binary operator: ${node.operator}`);
    }
  }

  private evaluateLogical(
    node: {
      type: 'logical_expression';
      operator: '&&' | '||';
      left: AstNode;
      right: AstNode;
    },
    variables: Record<string, number | boolean>,
  ): boolean {
    const left = this.evaluate(node.left, variables);

    if (node.operator === '||') {
      return Boolean(left) || Boolean(this.evaluate(node.right, variables));
    }

    return Boolean(left) && Boolean(this.evaluate(node.right, variables));
  }

  private evaluateComparison(
    node: {
      type: 'comparison_expression';
      operator: '>' | '<' | '>=' | '<=' | '==';
      left: AstNode;
      right: AstNode;
    },
    variables: Record<string, number | boolean>,
  ): boolean {
    const left = this.evaluate(node.left, variables);
    const right = this.evaluate(node.right, variables);
    const numLeft = Number(left);
    const numRight = Number(right);

    switch (node.operator) {
      case '>':
        return numLeft > numRight;
      case '<':
        return numLeft < numRight;
      case '>=':
        return numLeft >= numRight;
      case '<=':
        return numLeft <= numRight;
      case '==':
        return numLeft === numRight;
      default:
        throw new Error(`Unknown comparison operator: ${node.operator}`);
    }
  }

  private evaluateUnary(
    node: {
      type: 'unary_expression';
      operator: '-';
      operand: AstNode;
    },
    variables: Record<string, number | boolean>,
  ): number {
    const operand = this.evaluate(node.operand, variables);
    return -Number(operand);
  }

  private evaluateTernary(
    node: {
      type: 'ternary_expression';
      condition: AstNode;
      true_branch: AstNode;
      false_branch: AstNode;
    },
    variables: Record<string, number | boolean>,
  ): number | boolean {
    const condition = this.evaluate(node.condition, variables);
    if (Boolean(condition)) {
      return this.evaluate(node.true_branch, variables);
    }
    return this.evaluate(node.false_branch, variables);
  }

  private evaluateFunctionCall(
    node: {
      type: 'function_call';
      function: 'max' | 'min';
      arguments: AstNode[];
    },
    variables: Record<string, number | boolean>,
  ): number {
    const args = node.arguments.map((arg) => Number(this.evaluate(arg, variables)));

    if (args.length === 0) {
      throw new Error('Function call requires at least one argument');
    }

    switch (node.function) {
      case 'max':
        return Math.max(...args);
      case 'min':
        return Math.min(...args);
      default:
        throw new Error(`Unknown function: ${node.function}`);
    }
  }
}
