import type {
  AstNode,
  BinaryOperator,
  LogicalOperator,
  ComparisonOperator,
  FunctionName,
} from '../api/admin.js';

export type VariableDef = {
  name: string;
  type: 'number' | 'boolean' | 'unknown';
  kind: 'activity' | 'formula';
};

export class FormulaParseError extends Error {
  constructor(message: string, public position?: number) {
    super(message);
    this.name = 'FormulaParseError';
  }
}

type TokenType =
  | 'NUMBER'
  | 'BOOLEAN'
  | 'VARIABLE'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

type Token = {
  type: TokenType;
  value: string;
  pos: number;
};

// ── Precedence levels ───────────────────────────────────────────────────────────

const PREC_TERNARY = 1;
const PREC_OR = 2;
const PREC_AND = 3;
const PREC_EQ = 4;
const PREC_CMP = 5;
const PREC_ADD = 6;
const PREC_MUL = 7;
const PREC_UNARY = 8;
const PREC_PRIMARY = 9;

function nodePrecedence(node: AstNode): number {
  switch (node.type) {
    case 'ternary_expression':
      return PREC_TERNARY;
    case 'logical_expression':
      return node.operator === '||' ? PREC_OR : PREC_AND;
    case 'comparison_expression':
      return PREC_EQ;
    case 'binary_expression':
      return node.operator === '+' || node.operator === '-' ? PREC_ADD : PREC_MUL;
    case 'unary_expression':
      return PREC_UNARY;
    default:
      return PREC_PRIMARY;
  }
}

// ── Tokenizer ───────────────────────────────────────────────────────────────────

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }

    if (input[i] === '$') {
      const start = i;
      i++;
      if (i < input.length && /[a-zA-Z_]/.test(input[i])) {
        while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
          i++;
        }
        tokens.push({ type: 'VARIABLE', value: input.slice(start, i), pos: start });
      } else {
        throw new FormulaParseError(`Expected identifier after '$' at position ${start}`, start);
      }
      continue;
    }

    if (i + 1 < input.length) {
      const twoChar = input.slice(i, i + 2);
      if (['>=', '<=', '==', '&&', '||'].includes(twoChar)) {
        tokens.push({ type: 'OPERATOR', value: twoChar, pos: i });
        i += 2;
        continue;
      }
    }

    if (['+', '-', '*', '/', '>', '<', '?', ':'].includes(input[i])) {
      tokens.push({ type: 'OPERATOR', value: input[i], pos: i });
      i++;
      continue;
    }

    if (input[i] === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i });
      i++;
      continue;
    }

    if (input[i] === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i });
      i++;
      continue;
    }

    if (input[i] === ',') {
      tokens.push({ type: 'COMMA', value: ',', pos: i });
      i++;
      continue;
    }

    const remaining = input.slice(i);

    if (remaining.startsWith('true') && (i + 4 >= input.length || !/[a-zA-Z0-9_]/.test(input[i + 4]))) {
      tokens.push({ type: 'BOOLEAN', value: 'true', pos: i });
      i += 4;
      continue;
    }

    if (remaining.startsWith('false') && (i + 5 >= input.length || !/[a-zA-Z0-9_]/.test(input[i + 5]))) {
      tokens.push({ type: 'BOOLEAN', value: 'false', pos: i });
      i += 5;
      continue;
    }

    if (/[0-9]/.test(input[i])) {
      const start = i;
      while (i < input.length && /[0-9]/.test(input[i])) {
        i++;
      }
      if (i < input.length && input[i] === '.') {
        i++;
        if (i < input.length && /[0-9]/.test(input[i])) {
          while (i < input.length && /[0-9]/.test(input[i])) {
            i++;
          }
        } else {
          throw new FormulaParseError(
            `Invalid number literal '${input.slice(start, i)}' at position ${start}`,
            start,
          );
        }
      }
      tokens.push({ type: 'NUMBER', value: input.slice(start, i), pos: start });
      continue;
    }

    if (/[a-zA-Z_]/.test(input[i])) {
      const start = i;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        i++;
      }
      tokens.push({ type: 'IDENTIFIER', value: input.slice(start, i), pos: start });
      continue;
    }

    throw new FormulaParseError(`Unexpected character '${input[i]}' at position ${i}`, i);
  }

  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

// ── Parser ──────────────────────────────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[], private availableVars: VariableDef[]) {
    this.tokens = tokens;
  }

  parse(): AstNode {
    if (this.tokens.length <= 1) {
      throw new FormulaParseError('Empty expression', 0);
    }

    const node = this.expression();

    if (!this.isAtEnd()) {
      const tok = this.peek();
      throw new FormulaParseError(`Unexpected token '${tok.value}' at position ${tok.pos}`, tok.pos);
    }

    return node;
  }

  // expression → ternary
  private expression(): AstNode {
    return this.ternary();
  }

  // ternary → logical ("?" expression ":" expression)?
  private ternary(): AstNode {
    const node = this.logical();

    if (this.match('OPERATOR', '?')) {
      const trueBranch = this.expression();
      if (!this.match('OPERATOR', ':')) {
        throw new FormulaParseError(`Expected ':' at position ${this.peek().pos}`, this.peek().pos);
      }
      const falseBranch = this.expression();
      return {
        type: 'ternary_expression',
        condition: node,
        true_branch: trueBranch,
        false_branch: falseBranch,
      };
    }

    return node;
  }

  // logical → comparison (("&&" | "||") comparison)*
  private logical(): AstNode {
    let node = this.comparison();

    while (this.match('OPERATOR', '&&') || this.match('OPERATOR', '||')) {
      const op = this.previous().value as LogicalOperator;
      const right = this.comparison();
      node = { type: 'logical_expression', operator: op, left: node, right };
    }

    return node;
  }

  // comparison → addition ((">" | "<" | ">=" | "<=" | "==") addition)?
  private comparison(): AstNode {
    const node = this.addition();

    const comparisonOps = ['>', '<', '>=', '<=', '=='] as const;
    for (const op of comparisonOps) {
      if (this.match('OPERATOR', op)) {
        const right = this.addition();
        return {
          type: 'comparison_expression',
          operator: op as ComparisonOperator,
          left: node,
          right,
        };
      }
    }

    return node;
  }

  // addition → multiplication (("+" | "-") multiplication)*
  private addition(): AstNode {
    let node = this.multiplication();

    while (this.match('OPERATOR', '+') || this.match('OPERATOR', '-')) {
      const op = this.previous().value as BinaryOperator;
      const right = this.multiplication();
      node = { type: 'binary_expression', operator: op, left: node, right };
    }

    return node;
  }

  // multiplication → unary (("*" | "/") unary)*
  private multiplication(): AstNode {
    let node = this.unary();

    while (this.match('OPERATOR', '*') || this.match('OPERATOR', '/')) {
      const op = this.previous().value as BinaryOperator;
      const right = this.unary();
      node = { type: 'binary_expression', operator: op, left: node, right };
    }

    return node;
  }

  // unary → ("-") unary | call
  private unary(): AstNode {
    if (this.match('OPERATOR', '-')) {
      const operand = this.unary();
      return { type: 'unary_expression', operator: '-', operand };
    }

    return this.call();
  }

  // call → IDENTIFIER "(" arguments? ")" | primary
  private call(): AstNode {
    if (this.check('IDENTIFIER')) {
      const nameToken = this.advance();

      if (!this.match('LPAREN')) {
        throw new FormulaParseError(
          `Unexpected identifier '${nameToken.value}' at position ${nameToken.pos}`,
          nameToken.pos,
        );
      }

      const name = nameToken.value;
      if (name !== 'max' && name !== 'min') {
        throw new FormulaParseError(
          `Unknown function '${name}' at position ${nameToken.pos}`,
          nameToken.pos,
        );
      }

      const args: AstNode[] = [];
      if (!this.check('RPAREN')) {
        do {
          args.push(this.expression());
        } while (this.match('COMMA'));
      }

      this.consume('RPAREN', `Expected ')' at position ${this.peek().pos}`);
      return { type: 'function_call', function: name as FunctionName, arguments: args };
    }

    return this.primary();
  }

  // primary → NUMBER | BOOLEAN | VARIABLE | "(" expression ")"
  private primary(): AstNode {
    if (this.match('NUMBER')) {
      const tok = this.previous();
      const num = Number(tok.value);
      if (!isFinite(num)) {
        throw new FormulaParseError(
          `Invalid number literal '${tok.value}' at position ${tok.pos}`,
          tok.pos,
        );
      }
      return { type: 'literal', value: num };
    }

    if (this.match('BOOLEAN')) {
      const tok = this.previous();
      return { type: 'literal', value: tok.value === 'true' };
    }

    if (this.match('VARIABLE')) {
      const tok = this.previous();
      const name = tok.value.slice(1);

      if (this.availableVars.length > 0) {
        const found = this.availableVars.some((v) => v.name === name);
        if (!found) {
          const avail = this.availableVars.map((v) => v.name).join(', ');
          throw new FormulaParseError(
            `Unknown variable '$${name}'. Available variables: ${avail}`,
            tok.pos,
          );
        }
      }

      return { type: 'variable', name };
    }

    if (this.match('LPAREN')) {
      const lparenPos = this.previous().pos;
      const node = this.expression();

      if (!this.match('RPAREN')) {
        throw new FormulaParseError(`Unclosed parenthesis at position ${lparenPos}`, lparenPos);
      }

      return node;
    }

    const tok = this.peek();
    throw new FormulaParseError(`Unexpected token '${tok.value}' at position ${tok.pos}`, tok.pos);
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(type: TokenType, value?: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.peek().type !== type) return false;
    if (value !== undefined && this.peek().value !== value) return false;
    this.current++;
    return true;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    const pos = this.peek().pos;
    throw new FormulaParseError(`${message}`, pos);
  }
}

// ── AST → Human-Readable ────────────────────────────────────────────────────────

function renderInner(node: AstNode, myPrec: number): string {
  switch (node.type) {
    case 'literal':
      return String(node.value);

    case 'variable':
      return `$${node.name}`;

    case 'binary_expression':
    case 'logical_expression': {
      const left = toHR(node.left, myPrec, false);
      const right = toHR(node.right, myPrec, true);
      return `${left} ${node.operator} ${right}`;
    }

    case 'comparison_expression': {
      const left = toHR(node.left, myPrec, false);
      const right = toHR(node.right, myPrec, true);
      return `${left} ${node.operator} ${right}`;
    }

    case 'unary_expression':
      return `-${toHR(node.operand, PREC_UNARY, false)}`;

    case 'ternary_expression': {
      const cond = toHR(node.condition, PREC_TERNARY, false);
      const trueB = toHR(node.true_branch, PREC_TERNARY, false);
      const falseB = toHR(node.false_branch, PREC_TERNARY, false);
      return `${cond} ? ${trueB} : ${falseB}`;
    }

    case 'function_call': {
      const argsStr = node.arguments.map((a) => toHR(a, PREC_PRIMARY, false)).join(', ');
      return `${node.function}(${argsStr})`;
    }
  }
}

function toHR(node: AstNode, parentPrec: number, rightSide: boolean): string {
  const s = renderInner(node, nodePrecedence(node));
  const prec = nodePrecedence(node);

  if (prec < parentPrec || (rightSide && prec === parentPrec)) {
    return `(${s})`;
  }

  return s;
}

export function astToHumanReadable(node: AstNode): string {
  return toHR(node, 0, false);
}

// ── Human-Readable → AST ────────────────────────────────────────────────────────

export function humanReadableToAst(input: string, availableVars: VariableDef[]): AstNode {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new FormulaParseError('Empty expression', 0);
  }

  const tokens = tokenize(trimmed);
  const parser = new Parser(tokens, availableVars);
  return parser.parse();
}

// ── Validation ──────────────────────────────────────────────────────────────────

export function validateFormulaString(input: string, availableVars: VariableDef[]): string[] {
  try {
    humanReadableToAst(input, availableVars);
    return [];
  } catch (err) {
    if (err instanceof FormulaParseError) {
      return [err.message];
    }
    return [String(err)];
  }
}

// ── Type Inference ──────────────────────────────────────────────────────────────

export function inferAstType(node: AstNode): 'number' | 'boolean' | 'unknown' {
  switch (node.type) {
    case 'literal':
      return typeof node.value === 'boolean' ? 'boolean' : 'number';
    case 'variable':
      return 'unknown';
    case 'binary_expression':
      return 'number';
    case 'logical_expression':
      return 'boolean';
    case 'comparison_expression':
      return 'boolean';
    case 'unary_expression':
      return 'number';
    case 'function_call':
      return 'number';
    case 'ternary_expression': {
      const trueType = inferAstType(node.true_branch);
      const falseType = inferAstType(node.false_branch);
      if (trueType === falseType) return trueType;
      return 'unknown';
    }
  }
}
