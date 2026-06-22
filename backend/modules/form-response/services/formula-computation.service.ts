import type { AuthUser } from '../../../src/types/auth.types.js';
import type { FormulaValue, CreateFormulaValueInput } from '../types/formula-value.types.js';
import type { IFormulaValueRepository } from '../repositories/formula-value.repository.js';
import { validateCreateFormulaValueInput } from '../validators/formula-value.validator.js';

/**
 * Service responsible for storing and retrieving formula values.
 * Actual formula evaluation is performed by the caller, which provides
 * the already-computed value for persistence. Future iterations may
 * integrate the formula AST evaluator directly.
 */
export interface IFormulaValueService {
  listFormulaValues(
    opts?: { collectionId?: string; entityId?: string; formulaSymbol?: string },
    user?: AuthUser,
  ): FormulaValue[];
  getFormulaValue(id: string, user?: AuthUser): FormulaValue | undefined;
  computeAndStore(input: CreateFormulaValueInput, user?: AuthUser): FormulaValue;
  deleteFormulaValue(id: string, user?: AuthUser): boolean;
}

export class FormulaValueService implements IFormulaValueService {
  constructor(
    private readonly formulaValueRepository: IFormulaValueRepository,
  ) {}

  listFormulaValues(
    opts?: { collectionId?: string; entityId?: string; formulaSymbol?: string },
    _user?: AuthUser,
  ): FormulaValue[] {
    return this.formulaValueRepository.list(opts);
  }

  getFormulaValue(id: string, _user?: AuthUser): FormulaValue | undefined {
    return this.formulaValueRepository.get(id);
  }

  computeAndStore(input: CreateFormulaValueInput, user?: AuthUser): FormulaValue {
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to compute formula values');
    }
    validateCreateFormulaValueInput(input);
    return this.formulaValueRepository.create(input);
  }

  deleteFormulaValue(id: string, user?: AuthUser): boolean {
    const existing = this.formulaValueRepository.get(id);
    if (!existing) return false;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to delete a formula value');
    }
    return this.formulaValueRepository.delete(id);
  }
}
