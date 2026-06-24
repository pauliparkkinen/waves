export type SandboxTestInput = {
  answers: Record<string, number | boolean | string>;
};

export type SandboxQuestionResult = {
  question_symbol: string;
  visible: boolean;
};

export type SandboxSectionResult = {
  section_symbol: string;
  visible: boolean;
  questions: SandboxQuestionResult[];
};

export type SandboxFormulaResult = {
  formula_symbol: string;
  value: number | boolean;
};

export type SandboxTestResult = {
  form_id: string;
  form_symbol: string;
  sections: SandboxSectionResult[];
  formulas: SandboxFormulaResult[];
  received_answers: Record<string, number | boolean | string>;
};
