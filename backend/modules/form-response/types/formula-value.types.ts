export type FormulaValueInputRef = {
  type: 'formula_value' | 'activity_value';
  id: string;
};

export type FormulaValue = {
  formula_value_id: string;
  collection_id: string;
  formula_symbol: string;
  formula_version: number;
  entity_type: 'user';
  entity_id: string;
  value: number | boolean;
  inputs: FormulaValueInputRef[];
  computed_at: string;
};

export type CreateFormulaValueInput = {
  collection_id: string;
  formula_symbol: string;
  formula_version: number;
  entity_type: 'user';
  entity_id: string;
  value: number | boolean;
  inputs: FormulaValueInputRef[];
};
