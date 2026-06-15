/** Question domain types. */
export type QuestionType = 'multiselect' | 'select' | 'radio' | 'free-text' | 'range';

export type TranslationRef = {
  translation_symbol: string;
  symbol: string;
};

export type FreeTextParameters = {
  max_length?: number;
  placeholder?: string;
  multiline?: boolean;
};

export type RangeParameters = {
  min: number;
  max: number;
  step?: number;
  min_label?: string;
  max_label?: string;
};

export type SelectOption = {
  label: string;
  value: string;
  order_index: number;
};

export type SelectParameters = {
  options: SelectOption[];
};

export type MultiselectParameters = SelectParameters & {
  min_select?: number;
  max_select?: number;
};

export type RadioParameters = {
  options: SelectOption[];
};

export type QuestionParameters =
  | { type: 'free-text'; parameters: FreeTextParameters }
  | { type: 'range'; parameters: RangeParameters }
  | { type: 'select'; parameters: SelectParameters }
  | { type: 'multiselect'; parameters: MultiselectParameters }
  | { type: 'radio'; parameters: RadioParameters };

export type Question = {
  collection_id: string;
  question_id: string;
  question_symbol: string;
  condition_formula_id?: string;
  type: QuestionType;
  version: number;
  parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  translations: TranslationRef[];
};

export type CreateQuestionInput = Omit<Question, 'question_id' | 'created_at' | 'updated_at'>;

export type UpdateQuestionInput = Partial<Omit<Question, 'question_id' | 'created_at' | 'updated_at'>>;
