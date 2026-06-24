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

export interface ISandboxService {
  testForm(formId: string, input: SandboxTestInput): SandboxTestResult;
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
      sections: sectionResults,
      formulas: formulaResults,
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
