import type { AuthUser } from '../../../src/types/auth.types.js';
import type { Formula, CreateFormulaInput, UpdateFormulaInput } from '../types/formula.types.js';
import type { IFormulaRepository } from '../repositories/formula.repository.js';
import type { IQuestionRepository } from '../repositories/question.repository.js';
import {
  validateFormulaInput,
  validateFormulaUpdateInput,
} from '../validators/formula.validator.js';

export interface IFormulaService {
  listFormulas(collectionId?: string, user?: AuthUser): Formula[];
  getFormula(id: string, user?: AuthUser): Formula | undefined;
  createFormula(data: CreateFormulaInput, user?: AuthUser): Formula;
  updateFormula(id: string, data: UpdateFormulaInput, user?: AuthUser): Formula | undefined;
  deleteFormula(id: string, user?: AuthUser): boolean;
}

export class FormulaService implements IFormulaService {
  constructor(
    private readonly formulaRepository: IFormulaRepository,
    private readonly questionRepository: IQuestionRepository,
  ) {}

  listFormulas(collectionId?: string, _user?: AuthUser): Formula[] {
    return this.formulaRepository.listFormulas(collectionId);
  }

  getFormula(id: string, _user?: AuthUser): Formula | undefined {
    return this.formulaRepository.getFormula(id);
  }

  createFormula(data: CreateFormulaInput, user?: AuthUser): Formula {
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to create a formula');
    }
    validateFormulaInput(data);
    this.validateReferencesExist(data);
    return this.formulaRepository.createFormula(data);
  }

  updateFormula(id: string, data: UpdateFormulaInput, user?: AuthUser): Formula | undefined {
    const existing = this.formulaRepository.getFormula(id);
    if (!existing) return undefined;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to update a formula');
    }
    validateFormulaUpdateInput(data);
    // Use existing formula's collection_id when not provided in update data
    this.validateReferencesExist(
      { ...data, collection_id: data.collection_id ?? existing.collection_id },
    );
    return this.formulaRepository.updateFormula(id, data);
  }

  deleteFormula(id: string, user?: AuthUser): boolean {
    const existing = this.formulaRepository.getFormula(id);
    if (!existing) return false;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to delete a formula');
    }
    return this.formulaRepository.deleteFormula(id);
  }

  // ---- Private ----

  /**
   * Validate that all formula_references reference existing entities:
   * - type 'formula' → referenced_formula_id must exist in the formula repository
   * - type 'activity' → symbol must match an existing question_symbol in the same collection
   */
  private validateReferencesExist(data: CreateFormulaInput | UpdateFormulaInput): void {
    const refs = data.formula_references;
    if (!refs || !Array.isArray(refs)) return;

    const collectionId = data.collection_id;

    for (const ref of refs) {
      if (ref.type === 'formula' && ref.referenced_formula_id) {
        const referenced = this.formulaRepository.getFormula(ref.referenced_formula_id);
        if (!referenced) {
          throw new Error(
            `Formula reference "${ref.symbol}" references non-existent formula "${ref.referenced_formula_id}"`,
          );
        }
        // Ensure the referenced formula is in the same collection
        if (collectionId && referenced.collection_id !== collectionId) {
          throw new Error(
            `Formula reference "${ref.symbol}" references formula in a different collection`,
          );
        }
      }

      if (ref.type === 'activity' && collectionId) {
        const questions = this.questionRepository.listQuestions(collectionId);
        const matchingQuestion = questions.find((q) => q.question_symbol === ref.symbol);
        if (!matchingQuestion) {
          throw new Error(
            `Formula reference "${ref.symbol}" references non-existent activity/question in collection "${collectionId}"`,
          );
        }
      }
    }
  }
}
