/** Formula domain types. */

// ---- Formula Reference ----

export type FormulaReferenceType = 'formula' | 'activity';

export type FormulaReference = {
  formula_reference_id: string;
  symbol: string;
  type: FormulaReferenceType;
  referenced_formula_id?: string;
};

// ---- Formula ----

export type OutputType = 'number' | 'boolean';

export type Formula = {
  collection_id: string;
  formula_id: string;
  symbol: string;
  expression: AstNode;
  output_type: OutputType;
  formula_references: FormulaReference[];
};

export type CreateFormulaInput = Omit<Formula, 'formula_id'>;

export type UpdateFormulaInput = Partial<Omit<Formula, 'formula_id'>>;

// ---- AST Node Types ----

export type AstNodeType =
  | 'literal'
  | 'variable'
  | 'binary_expression'
  | 'logical_expression'
  | 'comparison_expression'
  | 'unary_expression'
  | 'ternary_expression'
  | 'function_call';

export type BinaryOperator = '+' | '-' | '*' | '/';

export type LogicalOperator = '&&' | '||';

export type FunctionName = 'max' | 'min';

export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==';

export type AstLiteralNode = {
  type: 'literal';
  value: number | boolean;
};

export type AstVariableNode = {
  type: 'variable';
  name: string;
};

export type AstBinaryExpressionNode = {
  type: 'binary_expression';
  operator: BinaryOperator;
  left: AstNode;
  right: AstNode;
};

export type AstLogicalExpressionNode = {
  type: 'logical_expression';
  operator: LogicalOperator;
  left: AstNode;
  right: AstNode;
};

export type AstComparisonExpressionNode = {
  type: 'comparison_expression';
  operator: ComparisonOperator;
  left: AstNode;
  right: AstNode;
};

export type AstUnaryExpressionNode = {
  type: 'unary_expression';
  operator: '-';
  operand: AstNode;
};

export type AstTernaryExpressionNode = {
  type: 'ternary_expression';
  condition: AstNode;
  true_branch: AstNode;
  false_branch: AstNode;
};

export type AstFunctionCallNode = {
  type: 'function_call';
  function: FunctionName;
  arguments: AstNode[];
};

export type AstNode =
  | AstLiteralNode
  | AstVariableNode
  | AstBinaryExpressionNode
  | AstLogicalExpressionNode
  | AstComparisonExpressionNode
  | AstUnaryExpressionNode
  | AstTernaryExpressionNode
  | AstFunctionCallNode;

/** Result of AST type inference. */
export type InferredType = 'number' | 'boolean' | 'unknown';
