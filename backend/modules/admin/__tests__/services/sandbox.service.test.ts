import { describe, it, expect, vi } from 'vitest';
import { SandboxService } from '../../services/sandbox.service.js';
import { FormulaEvaluatorService } from '../../services/formula-evaluator.service.js';
import type { IFormRepository } from '../../repositories/form.repository.js';
import type { ISectionRepository } from '../../repositories/section.repository.js';
import type { IQuestionRepository } from '../../repositories/question.repository.js';
import type { IFormulaRepository } from '../../repositories/formula.repository.js';
import type {
  SandboxTestInput,
  SandboxTestResult,
} from '../../types/sandbox.types.js';

// ---- Helpers ----

const formulaEval = new FormulaEvaluatorService();

function makeFormRepo(overrides: Partial<IFormRepository> = {}): IFormRepository {
  return {
    listForms: vi.fn().mockReturnValue([]),
    getForm: vi.fn().mockReturnValue(undefined),
    createForm: vi.fn(),
    updateForm: vi.fn(),
    deleteForm: vi.fn(),
    ...overrides,
  };
}

function makeSectionRepo(overrides: Partial<ISectionRepository> = {}): ISectionRepository {
  return {
    listSections: vi.fn().mockReturnValue([]),
    getSection: vi.fn().mockReturnValue(undefined),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    ...overrides,
  };
}

function makeQuestionRepo(overrides: Partial<IQuestionRepository> = {}): IQuestionRepository {
  return {
    listQuestions: vi.fn().mockReturnValue([]),
    getQuestion: vi.fn().mockReturnValue(undefined),
    createQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    ...overrides,
  };
}

function makeFormulaRepo(overrides: Partial<IFormulaRepository> = {}): IFormulaRepository {
  return {
    listFormulas: vi.fn().mockReturnValue([]),
    getFormula: vi.fn().mockReturnValue(undefined),
    createFormula: vi.fn(),
    updateFormula: vi.fn(),
    deleteFormula: vi.fn(),
    ...overrides,
  };
}

const sampleForm = {
  form_id: 'form-1',
  collection_id: 'col-1',
  form_symbol: 'test-form',
  version: 1,
  status: 'draft' as const,
  form_sections: [
    { section_symbol: 'sec-1', version_number: 1, order_number: 0 },
  ],
  formulas: ['formula-1'],
  form_organisations: [],
  translations: [],
};

const sampleSection = {
  section_id: 'section-1',
  section_symbol: 'sec-1',
  collection_id: 'col-1',
  condition_formula_id: undefined,
  version: 1,
  status: 'published' as const,
  section_questions: [
    { question_symbol: 'q1', version_number: 1, order_number: 0, required: true },
  ],
  translations: [],
};

const sampleQuestion = {
  collection_id: 'col-1',
  question_id: 'question-1',
  question_symbol: 'q1',
  condition_formula_id: undefined,
  type: 'range' as const,
  value_type: 'number' as const,
  version: 1,
  parameters: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  translations: [],
};

const sampleFormula = {
  formula_id: 'formula-1',
  collection_id: 'col-1',
  symbol: 'total-score',
  expression: {
    type: 'binary_expression' as const,
    operator: '+' as const,
    left: { type: 'literal' as const, value: 10 },
    right: { type: 'literal' as const, value: 20 },
  },
  output_type: 'number' as const,
  formula_references: [],
};

// ---- Tests ----

describe('SandboxService', () => {
  describe('testForm', () => {
    describe('given a valid form with sections, questions, and formulas', () => {
      it('when test answers are provided, then it returns correct results', () => {
        const formRepo = makeFormRepo({
          getForm: vi.fn().mockReturnValue(sampleForm),
        });
        const sectionRepo = makeSectionRepo({
          listSections: vi.fn().mockReturnValue([sampleSection]),
        });
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([sampleQuestion]),
        });
        const formulaRepo = makeFormulaRepo({
          getFormula: vi.fn().mockReturnValue(sampleFormula),
        });
        const service = new SandboxService(
          formRepo,
          sectionRepo,
          questionRepo,
          formulaRepo,
          formulaEval,
        );
        const input: SandboxTestInput = { answers: { q1: 15 } };

        const result = service.testForm('form-1', input);

        expect(result.form_id).toBe('form-1');
        expect(result.sections).toHaveLength(1);
        expect(result.sections[0].section_symbol).toBe('sec-1');
        expect(result.sections[0].visible).toBe(true);
        expect(result.sections[0].questions).toHaveLength(1);
        expect(result.sections[0].questions[0].question_symbol).toBe('q1');
        expect(result.sections[0].questions[0].visible).toBe(true);
        expect(result.formulas).toHaveLength(1);
        expect(result.formulas[0].formula_symbol).toBe('total-score');
        expect(result.formulas[0].value).toBe(30);
      });

      it('when test answers include boolean values, then they are used in evaluation', () => {
        const formRepo = makeFormRepo({
          getForm: vi.fn().mockReturnValue(sampleForm),
        });
        const sectionRepo = makeSectionRepo({
          listSections: vi.fn().mockReturnValue([sampleSection]),
        });
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([sampleQuestion]),
        });
        const formulaWithVar = {
          ...sampleFormula,
          expression: {
            type: 'binary_expression' as const,
            operator: '+' as const,
            left: { type: 'variable' as const, name: 'flag' },
            right: { type: 'literal' as const, value: 5 },
          },
        };
        const formulaRepo = makeFormulaRepo({
          getFormula: vi.fn().mockReturnValue(formulaWithVar),
        });
        const service = new SandboxService(
          formRepo,
          sectionRepo,
          questionRepo,
          formulaRepo,
          formulaEval,
        );

        const result = service.testForm('form-1', { answers: { flag: true } });

        expect(result.formulas[0].value).toBe(6);
      });
    });

    describe('given a form with visibility conditions', () => {
      it('when section condition evaluates to true, then section is visible', () => {
        const conditionFormula = {
          formula_id: 'cond-formula',
          collection_id: 'col-1',
          symbol: 'section-visible',
          expression: {
            type: 'comparison_expression' as const,
            operator: '>' as const,
            left: { type: 'variable' as const, name: 'score' },
            right: { type: 'literal' as const, value: 50 },
          },
          output_type: 'boolean' as const,
          formula_references: [],
        };
        const sectionWithCondition = {
          ...sampleSection,
          condition_formula_id: 'cond-formula',
        };
        const formRepo = makeFormRepo({
          getForm: vi.fn().mockReturnValue(sampleForm),
        });
        const sectionRepo = makeSectionRepo({
          listSections: vi.fn().mockReturnValue([sectionWithCondition]),
        });
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([sampleQuestion]),
        });
        const formulaRepo = makeFormulaRepo({
          getFormula: vi.fn().mockImplementation((id: string) =>
            id === 'cond-formula' ? conditionFormula : sampleFormula,
          ),
        });
        const service = new SandboxService(
          formRepo,
          sectionRepo,
          questionRepo,
          formulaRepo,
          formulaEval,
        );

        const result = service.testForm('form-1', { answers: { score: 75 } });

        expect(result.sections[0].visible).toBe(true);
      });

      it('when section condition evaluates to false, then section is not visible', () => {
        const conditionFormula = {
          formula_id: 'cond-formula',
          collection_id: 'col-1',
          symbol: 'section-visible',
          expression: {
            type: 'comparison_expression' as const,
            operator: '>' as const,
            left: { type: 'variable' as const, name: 'score' },
            right: { type: 'literal' as const, value: 50 },
          },
          output_type: 'boolean' as const,
          formula_references: [],
        };
        const sectionWithCondition = {
          ...sampleSection,
          condition_formula_id: 'cond-formula',
        };
        const formRepo = makeFormRepo({
          getForm: vi.fn().mockReturnValue(sampleForm),
        });
        const sectionRepo = makeSectionRepo({
          listSections: vi.fn().mockReturnValue([sectionWithCondition]),
        });
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([sampleQuestion]),
        });
        const formulaRepo = makeFormulaRepo({
          getFormula: vi.fn().mockImplementation((id: string) =>
            id === 'cond-formula' ? conditionFormula : sampleFormula,
          ),
        });
        const service = new SandboxService(
          formRepo,
          sectionRepo,
          questionRepo,
          formulaRepo,
          formulaEval,
        );

        const result = service.testForm('form-1', { answers: { score: 25 } });

        expect(result.sections[0].visible).toBe(false);
      });

      it('when question condition evaluates to false, then question is not visible', () => {
        const conditionFormula = {
          formula_id: 'cond-formula',
          collection_id: 'col-1',
          symbol: 'q-visible',
          expression: {
            type: 'comparison_expression' as const,
            operator: '>' as const,
            left: { type: 'variable' as const, name: 'score' },
            right: { type: 'literal' as const, value: 50 },
          },
          output_type: 'boolean' as const,
          formula_references: [],
        };
        const questionWithCondition = {
          ...sampleQuestion,
          condition_formula_id: 'cond-formula',
        };
        const formRepo = makeFormRepo({
          getForm: vi.fn().mockReturnValue(sampleForm),
        });
        const sectionRepo = makeSectionRepo({
          listSections: vi.fn().mockReturnValue([sampleSection]),
        });
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([questionWithCondition]),
        });
        const formulaRepo = makeFormulaRepo({
          getFormula: vi.fn().mockImplementation((id: string) =>
            id === 'cond-formula' ? conditionFormula : sampleFormula,
          ),
        });
        const service = new SandboxService(
          formRepo,
          sectionRepo,
          questionRepo,
          formulaRepo,
          formulaEval,
        );

        const result = service.testForm('form-1', { answers: { score: 25 } });

        expect(result.sections[0].questions[0].visible).toBe(false);
      });

      it('when there is no condition formula, then section and questions are visible', () => {
        const formRepo = makeFormRepo({
          getForm: vi.fn().mockReturnValue(sampleForm),
        });
        const sectionRepo = makeSectionRepo({
          listSections: vi.fn().mockReturnValue([sampleSection]),
        });
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([sampleQuestion]),
        });
        const formulaRepo = makeFormulaRepo({
          getFormula: vi.fn().mockReturnValue(sampleFormula),
        });
        const service = new SandboxService(
          formRepo,
          sectionRepo,
          questionRepo,
          formulaRepo,
          formulaEval,
        );

        const result = service.testForm('form-1', { answers: {} });

        expect(result.sections[0].visible).toBe(true);
        expect(result.sections[0].questions[0].visible).toBe(true);
      });
    });

    describe('given a form with formula references', () => {
      it('when formulas depend on each other, they are evaluated in order', () => {
        const formulaA = {
          formula_id: 'formula-a',
          collection_id: 'col-1',
          symbol: 'base',
          expression: { type: 'literal' as const, value: 5 },
          output_type: 'number' as const,
          formula_references: [],
        };
        const formulaB = {
          formula_id: 'formula-b',
          collection_id: 'col-1',
          symbol: 'derived',
          expression: {
            type: 'binary_expression' as const,
            operator: '+' as const,
            left: { type: 'variable' as const, name: 'base' },
            right: { type: 'literal' as const, value: 3 },
          },
          output_type: 'number' as const,
          formula_references: [],
        };
        const formWithTwoFormulas = {
          ...sampleForm,
          formulas: ['formula-a', 'formula-b'],
        };
        const formRepo = makeFormRepo({
          getForm: vi.fn().mockReturnValue(formWithTwoFormulas),
        });
        const sectionRepo = makeSectionRepo({
          listSections: vi.fn().mockReturnValue([sampleSection]),
        });
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([sampleQuestion]),
        });
        const formulaRepo = makeFormulaRepo({
          getFormula: vi.fn().mockImplementation((id: string) => {
            if (id === 'formula-a') return formulaA;
            if (id === 'formula-b') return formulaB;
            return undefined;
          }),
        });
        const service = new SandboxService(
          formRepo,
          sectionRepo,
          questionRepo,
          formulaRepo,
          formulaEval,
        );

        const result = service.testForm('form-1', { answers: {} });

        expect(result.formulas).toHaveLength(2);
        expect(result.formulas[0].formula_symbol).toBe('base');
        expect(result.formulas[0].value).toBe(5);
        expect(result.formulas[1].formula_symbol).toBe('derived');
        expect(result.formulas[1].value).toBe(8);
      });
    });

    describe('given a non-existent form', () => {
      it('when calling testForm, then it throws', () => {
        const formRepo = makeFormRepo({
          getForm: vi.fn().mockReturnValue(undefined),
        });
        const sectionRepo = makeSectionRepo();
        const questionRepo = makeQuestionRepo();
        const formulaRepo = makeFormulaRepo();
        const service = new SandboxService(
          formRepo,
          sectionRepo,
          questionRepo,
          formulaRepo,
          formulaEval,
        );

        expect(() => service.testForm('nonexistent', { answers: {} })).toThrow(
          'Form not found: nonexistent',
        );
      });
    });

    describe('given a form referencing a non-existent formula', () => {
      it('when calling testForm, then it throws', () => {
        const formRepo = makeFormRepo({
          getForm: vi.fn().mockReturnValue(sampleForm),
        });
        const sectionRepo = makeSectionRepo({
          listSections: vi.fn().mockReturnValue([sampleSection]),
        });
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([sampleQuestion]),
        });
        const formulaRepo = makeFormulaRepo({
          getFormula: vi.fn().mockReturnValue(undefined),
        });
        const service = new SandboxService(
          formRepo,
          sectionRepo,
          questionRepo,
          formulaRepo,
          formulaEval,
        );

        expect(() => service.testForm('form-1', { answers: {} })).toThrow(
          'Formula not found: formula-1',
        );
      });
    });

    describe('given string answer values', () => {
      it('when the string value is provided in answers, it is excluded from variables', () => {
        const formRepo = makeFormRepo({
          getForm: vi.fn().mockReturnValue(sampleForm),
        });
        const sectionRepo = makeSectionRepo({
          listSections: vi.fn().mockReturnValue([sampleSection]),
        });
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([sampleQuestion]),
        });
        const formulaRepo = makeFormulaRepo({
          getFormula: vi.fn().mockReturnValue(sampleFormula),
        });
        const service = new SandboxService(
          formRepo,
          sectionRepo,
          questionRepo,
          formulaRepo,
          formulaEval,
        );

        const result = service.testForm('form-1', {
          answers: { q1: 'some-string', q2: 42 },
        });

        expect(result.formulas).toHaveLength(1);
        expect(result.formulas[0].value).toBe(30);
      });
    });
  });
});
