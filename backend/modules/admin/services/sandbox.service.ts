import type { AstNode } from '../types/formula.types.js';
import type { IFormRepository } from '../repositories/form.repository.js';
import type { ISectionRepository } from '../repositories/section.repository.js';
import type { IQuestionRepository } from '../repositories/question.repository.js';
import type { IFormulaRepository } from '../repositories/formula.repository.js';
import type { IFormulaEvaluatorService } from './formula-evaluator.service.js';
import type {
  SandboxTestInput,
  SandboxTestResult,
  SandboxSectionResult,
  SandboxQuestionResult,
  SandboxFormulaResult,
} from '../types/sandbox.types.js';

const TEST_SENTINEL = '__test__' as const;

export interface ISandboxService {
  testForm(formId: string, input: SandboxTestInput): SandboxTestResult;
  testSection(sectionId: string, input: SandboxTestInput): SandboxTestResult;
  testQuestion(questionId: string, input: SandboxTestInput): SandboxTestResult;
}

export class SandboxService implements ISandboxService {
  constructor(
    private readonly formRepository: IFormRepository,
    private readonly sectionRepository: ISectionRepository,
    private readonly questionRepository: IQuestionRepository,
    private readonly formulaRepository: IFormulaRepository,
    private readonly formulaEvaluator: IFormulaEvaluatorService,
  ) {}

  testForm(formId: string, input: SandboxTestInput): SandboxTestResult {
    const form = this.formRepository.getForm(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    const allSections = this.sectionRepository.listSections();
    const allQuestions = this.questionRepository.listQuestions();

    const sectionMap = new Map<string, (typeof allSections)[0]>();
    for (const section of allSections) {
      sectionMap.set(section.section_symbol, section);
    }

    const questionMap = new Map<string, (typeof allQuestions)[0]>();
    for (const question of allQuestions) {
      questionMap.set(question.question_symbol, question);
    }

    const formulaCache = new Map<string, { symbol: string; expression: AstNode }>();

    // Echo all received answers back to the caller, regardless of type
    const receivedAnswers: Record<string, number | boolean | string> = { ...input.answers };

    // For formula evaluation, only numeric/boolean values are usable
    const variables: Record<string, number | boolean> = {};
    for (const [key, value] of Object.entries(input.answers)) {
      if (typeof value === 'number' || typeof value === 'boolean') {
        variables[key] = value;
      }
    }

    const formulaResults: SandboxFormulaResult[] = [];
    for (const formulaId of form.formulas) {
      if (!formulaCache.has(formulaId)) {
        const f = this.formulaRepository.getFormula(formulaId);
        if (!f) {
          throw new Error(`Formula not found: ${formulaId}`);
        }
        formulaCache.set(formulaId, { symbol: f.symbol, expression: f.expression });
      }
      const cached = formulaCache.get(formulaId)!;
      const value = this.formulaEvaluator.evaluate(cached.expression, variables);
      variables[cached.symbol] = value;
      formulaResults.push({ formula_symbol: cached.symbol, value });
    }

    const sectionResults: SandboxSectionResult[] = [];
    for (const formSection of form.form_sections) {
      const section = sectionMap.get(formSection.section_symbol);
      if (!section) {
        continue;
      }

      let sectionVisible = true;
      if (section.condition_formula_id) {
        const cached = this.getCachedFormula(section.condition_formula_id, formulaCache);
        const value = this.formulaEvaluator.evaluate(cached.expression, variables);
        sectionVisible = Boolean(value);
      }

      const questionResults: SandboxQuestionResult[] = [];
      for (const sq of section.section_questions) {
        let questionVisible = true;
        const question = questionMap.get(sq.question_symbol);
        if (question?.condition_formula_id) {
          const cached = this.getCachedFormula(question.condition_formula_id, formulaCache);
          const value = this.formulaEvaluator.evaluate(cached.expression, variables);
          questionVisible = Boolean(value);
        }
        questionResults.push({
          question_symbol: sq.question_symbol,
          visible: questionVisible,
        });
      }

      sectionResults.push({
        section_symbol: formSection.section_symbol,
        visible: sectionVisible,
        questions: questionResults,
      });
    }

    return {
      form_id: formId,
      form_symbol: form.form_symbol,
      sections: sectionResults,
      formulas: formulaResults,
      received_answers: receivedAnswers,
    };
  }

  testSection(sectionId: string, input: SandboxTestInput): SandboxTestResult {
    const section = this.sectionRepository.getSection(sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    const allQuestions = this.questionRepository.listQuestions();
    const questionMap = new Map<string, (typeof allQuestions)[0]>();
    for (const question of allQuestions) {
      questionMap.set(question.question_symbol, question);
    }

    const formulaCache = new Map<string, { symbol: string; expression: AstNode }>();

    const receivedAnswers: Record<string, number | boolean | string> = { ...input.answers };
    const variables: Record<string, number | boolean> = {};
    for (const [key, value] of Object.entries(input.answers)) {
      if (typeof value === 'number' || typeof value === 'boolean') {
        variables[key] = value;
      }
    }

    const formulaIds: string[] = [];
    if (section.condition_formula_id) {
      formulaIds.push(section.condition_formula_id);
    }
    for (const sq of section.section_questions) {
      const question = questionMap.get(sq.question_symbol);
      if (question?.condition_formula_id && !formulaIds.includes(question.condition_formula_id)) {
        formulaIds.push(question.condition_formula_id);
      }
    }

    const formulaResults: SandboxFormulaResult[] = [];
    for (const formulaId of formulaIds) {
      const cached = this.getCachedFormula(formulaId, formulaCache);
      const value = this.formulaEvaluator.evaluate(cached.expression, variables);
      variables[cached.symbol] = value;
      formulaResults.push({ formula_symbol: cached.symbol, value });
    }

    let sectionVisible = true;
    if (section.condition_formula_id) {
      const cached = this.getCachedFormula(section.condition_formula_id, formulaCache);
      const value = this.formulaEvaluator.evaluate(cached.expression, variables);
      sectionVisible = Boolean(value);
    }

    const questionResults: SandboxQuestionResult[] = [];
    for (const sq of section.section_questions) {
      let questionVisible = true;
      const question = questionMap.get(sq.question_symbol);
      if (question?.condition_formula_id) {
        const cached = this.getCachedFormula(question.condition_formula_id, formulaCache);
        const value = this.formulaEvaluator.evaluate(cached.expression, variables);
        questionVisible = Boolean(value);
      }
      questionResults.push({
        question_symbol: sq.question_symbol,
        visible: questionVisible,
      });
    }

    return {
      form_id: TEST_SENTINEL,
      form_symbol: TEST_SENTINEL,
      sections: [
        {
          section_symbol: section.section_symbol,
          visible: sectionVisible,
          questions: questionResults,
        },
      ],
      formulas: formulaResults,
      received_answers: receivedAnswers,
    };
  }

  testQuestion(questionId: string, input: SandboxTestInput): SandboxTestResult {
    const question = this.questionRepository.getQuestion(questionId);
    if (!question) {
      throw new Error(`Question not found: ${questionId}`);
    }

    const formulaCache = new Map<string, { symbol: string; expression: AstNode }>();

    const receivedAnswers: Record<string, number | boolean | string> = { ...input.answers };
    const variables: Record<string, number | boolean> = {};
    for (const [key, value] of Object.entries(input.answers)) {
      if (typeof value === 'number' || typeof value === 'boolean') {
        variables[key] = value;
      }
    }

    const formulaResults: SandboxFormulaResult[] = [];
    let questionVisible = true;
    if (question.condition_formula_id) {
      const cached = this.getCachedFormula(question.condition_formula_id, formulaCache);
      const value = this.formulaEvaluator.evaluate(cached.expression, variables);
      variables[cached.symbol] = value;
      formulaResults.push({ formula_symbol: cached.symbol, value });
      questionVisible = Boolean(value);
    }

    return {
      form_id: TEST_SENTINEL,
      form_symbol: TEST_SENTINEL,
      sections: [
        {
          section_symbol: TEST_SENTINEL,
          visible: true,
          questions: [
            {
              question_symbol: question.question_symbol,
              visible: questionVisible,
            },
          ],
        },
      ],
      formulas: formulaResults,
      received_answers: receivedAnswers,
    };
  }

  private getCachedFormula(
    formulaId: string,
    cache: Map<string, { symbol: string; expression: AstNode }>,
  ): { symbol: string; expression: AstNode } {
    if (!cache.has(formulaId)) {
      const f = this.formulaRepository.getFormula(formulaId);
      if (!f) {
        throw new Error(`Formula not found: ${formulaId}`);
      }
      cache.set(formulaId, { symbol: f.symbol, expression: f.expression });
    }
    return cache.get(formulaId)!;
  }
}
