import { describe, it, expect, vi } from 'vitest';
import { FormulaService } from '../../services/formula.service.js';
import type { IFormulaRepository } from '../../repositories/formula.repository.js';
import type { IQuestionRepository } from '../../repositories/question.repository.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';

// ---- Helpers ----

const adminUser: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
const nonAdminUser: AuthUser = { sub: 'u-2', permissions: ['read'] };

const validNumberExpr = {
  type: 'binary_expression',
  operator: '+',
  left: { type: 'literal', value: 5 },
  right: { type: 'literal', value: 3 },
} as const;

const validFormulaData = {
  collection_id: 'col-1',
  symbol: 'test-formula',
  expression: validNumberExpr,
  output_type: 'number' as const,
  formula_references: [],
};

const existingFormula = {
  formula_id: 'formula-1',
  ...validFormulaData,
};

function makeFormulaRepo(overrides: Partial<IFormulaRepository> = {}): IFormulaRepository {
  return {
    listFormulas: vi.fn().mockReturnValue([existingFormula]),
    getFormula: vi.fn().mockImplementation((id: string) =>
      id === 'formula-1' ? { ...existingFormula } : undefined,
    ),
    createFormula: vi.fn().mockImplementation((data) => ({
      formula_id: 'formula-new',
      ...data,
    })),
    updateFormula: vi.fn().mockImplementation((id, data) =>
      id === 'formula-1' ? { ...existingFormula, ...data } : undefined,
    ),
    deleteFormula: vi.fn().mockImplementation((id: string) => id === 'formula-1'),
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

function createService(
  formulaRepo?: IFormulaRepository,
  questionRepo?: IQuestionRepository,
): FormulaService {
  return new FormulaService(
    formulaRepo ?? makeFormulaRepo(),
    questionRepo ?? makeQuestionRepo(),
  );
}

// ---- Tests ----

describe('FormulaService', () => {
  describe('listFormulas', () => {
    describe('given a service with formulas', () => {
      it('when called without collection filter, then it returns all formulas', () => {
        const service = createService();

        const result = service.listFormulas();

        expect(result).toHaveLength(1);
        expect(result[0].symbol).toBe('test-formula');
      });

      it('when called with a collection id, then it passes the filter to the repository', () => {
        const repo = makeFormulaRepo();
        const service = createService(repo);

        service.listFormulas('col-1');

        expect(repo.listFormulas).toHaveBeenCalledWith('col-1');
      });
    });
  });

  describe('getFormula', () => {
    describe('given an existing formula', () => {
      it('when called with its id, then it returns the formula', () => {
        const service = createService();

        const result = service.getFormula('formula-1');

        expect(result).toBeDefined();
        expect(result!.formula_id).toBe('formula-1');
      });
    });

    describe('given a non-existent formula', () => {
      it('when called, then it returns undefined', () => {
        const service = createService();

        const result = service.getFormula('nonexistent');

        expect(result).toBeUndefined();
      });
    });
  });

  describe('createFormula', () => {
    describe('given an admin user', () => {
      it('when valid data is provided, then it creates the formula', () => {
        const service = createService();

        const result = service.createFormula(validFormulaData, adminUser);

        expect(result.formula_id).toBe('formula-new');
        expect(result.symbol).toBe('test-formula');
      });

      it('when data has invalid output_type, then it throws', () => {
        const service = createService();
        const invalidData = { ...validFormulaData, output_type: 'invalid' as never };

        expect(() => service.createFormula(invalidData, adminUser)).toThrow();
      });

      it('when data has invalid expression, then it throws', () => {
        const service = createService();
        const invalidData = { ...validFormulaData, expression: { type: 'invalid-node' } as never };

        expect(() => service.createFormula(invalidData, adminUser)).toThrow();
      });
    });

    describe('given a non-admin user', () => {
      it('when called, then it throws a permission error', () => {
        const service = createService();

        expect(() => service.createFormula(validFormulaData, nonAdminUser)).toThrow(
          'Insufficient permissions',
        );
      });
    });

    describe('given a formula reference to another formula', () => {
      it('when the referenced formula exists, then it creates successfully', () => {
        const formulaRepo = makeFormulaRepo();
        // getFormula returns the existing formula for 'formula-1'
        const service = createService(formulaRepo);
        const data = {
          ...validFormulaData,
          formula_references: [
            {
              formula_reference_id: 'ref-1',
              symbol: 'my-ref',
              type: 'formula' as const,
              referenced_formula_id: 'formula-1',
            },
          ],
        };

        const result = service.createFormula(data, adminUser);

        expect(result.formula_id).toBe('formula-new');
      });

      it('when the referenced formula does not exist, then it throws', () => {
        const formulaRepo = makeFormulaRepo();
        // getFormula returns undefined for any id
        const repoNoFormula = makeFormulaRepo({
          getFormula: vi.fn().mockReturnValue(undefined),
        });
        const service = createService(repoNoFormula);
        const data = {
          ...validFormulaData,
          formula_references: [
            {
              formula_reference_id: 'ref-1',
              symbol: 'my-ref',
              type: 'formula' as const,
              referenced_formula_id: 'non-existent-formula',
            },
          ],
        };

        expect(() => service.createFormula(data, adminUser)).toThrow(
          'references non-existent formula',
        );
      });

      it('when the referenced formula is in a different collection, then it throws', () => {
        const formulaRepo = makeFormulaRepo({
          getFormula: vi.fn().mockReturnValue({
            formula_id: 'formula-2',
            collection_id: 'col-other',
            symbol: 'other',
            expression: validNumberExpr,
            output_type: 'number',
            formula_references: [],
          }),
        });
        const service = createService(formulaRepo);
        const data = {
          ...validFormulaData,
          collection_id: 'col-1',
          formula_references: [
            {
              formula_reference_id: 'ref-1',
              symbol: 'my-ref',
              type: 'formula' as const,
              referenced_formula_id: 'formula-2',
            },
          ],
        };

        expect(() => service.createFormula(data, adminUser)).toThrow(
          'different collection',
        );
      });
    });

    describe('given a formula reference to an activity/question', () => {
      it('when the question exists in the collection, then it creates successfully', () => {
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([
            { question_symbol: 'q1', collection_id: 'col-1' },
          ]),
        });
        const service = createService(undefined, questionRepo);
        const data = {
          ...validFormulaData,
          formula_references: [
            {
              formula_reference_id: 'ref-1',
              symbol: 'q1',
              type: 'activity' as const,
            },
          ],
        };

        const result = service.createFormula(data, adminUser);

        expect(result.formula_id).toBe('formula-new');
      });

      it('when the question does not exist in the collection, then it throws', () => {
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([]),
        });
        const service = createService(undefined, questionRepo);
        const data = {
          ...validFormulaData,
          formula_references: [
            {
              formula_reference_id: 'ref-1',
              symbol: 'non-existent-q',
              type: 'activity' as const,
            },
          ],
        };

        expect(() => service.createFormula(data, adminUser)).toThrow(
          'non-existent activity',
        );
      });
    });
  });

  describe('updateFormula', () => {
    describe('given an admin user', () => {
      it('when the formula exists, then it updates and returns it', () => {
        const service = createService();

        const result = service.updateFormula('formula-1', { symbol: 'updated' }, adminUser);

        expect(result).toBeDefined();
        expect(result!.symbol).toBe('updated');
      });

      it('when the formula does not exist, then it returns undefined', () => {
        const service = createService();

        const result = service.updateFormula('nonexistent', { symbol: 'updated' }, adminUser);

        expect(result).toBeUndefined();
      });

      it('when invalid data is provided, then it throws', () => {
        const service = createService();

        expect(() =>
          service.updateFormula('formula-1', { symbol: '' }, adminUser),
        ).toThrow();
      });
    });

    describe('given a formula reference to another formula in update', () => {
      it('when the referenced formula exists, then it succeeds', () => {
        const service = createService();
        const result = service.updateFormula(
          'formula-1',
          {
            formula_references: [
              {
                formula_reference_id: 'ref-1',
                symbol: 'my-ref',
                type: 'formula' as const,
                referenced_formula_id: 'formula-1',
              },
            ],
          },
          adminUser,
        );
        expect(result).toBeDefined();
      });

      it('when the referenced formula does not exist, then it throws', () => {
        const repoNoFormula = makeFormulaRepo({
          getFormula: vi.fn().mockImplementation((id: string) =>
            id === 'formula-1' ? existingFormula : undefined,
          ),
        });
        const service = createService(repoNoFormula);
        expect(() =>
          service.updateFormula(
            'formula-1',
            {
              formula_references: [
                {
                  formula_reference_id: 'ref-1',
                  symbol: 'my-ref',
                  type: 'formula' as const,
                  referenced_formula_id: 'non-existent',
                },
              ],
            },
            adminUser,
          ),
        ).toThrow('non-existent formula');
      });

      it('when collection_id is omitted, it uses the existing formula collection', () => {
        const questionRepo = makeQuestionRepo({
          listQuestions: vi.fn().mockReturnValue([
            { question_symbol: 'q1', collection_id: 'col-1' },
          ]),
        });
        const service = createService(undefined, questionRepo);
        const result = service.updateFormula(
          'formula-1',
          {
            // No collection_id — should fall back to existing formula's 'col-1'
            formula_references: [
              {
                formula_reference_id: 'ref-1',
                symbol: 'q1',
                type: 'activity' as const,
              },
            ],
          },
          adminUser,
        );
        expect(result).toBeDefined();
      });
    });

    describe('given a non-admin user', () => {
      it('when called, then it throws a permission error', () => {
        const service = createService();

        expect(() =>
          service.updateFormula('formula-1', { symbol: 'updated' }, nonAdminUser),
        ).toThrow('Insufficient permissions');
      });
    });
  });

  describe('deleteFormula', () => {
    describe('given an admin user', () => {
      it('when the formula exists, then it deletes and returns true', () => {
        const service = createService();

        const result = service.deleteFormula('formula-1', adminUser);

        expect(result).toBe(true);
      });

      it('when the formula does not exist, then it returns false', () => {
        const service = createService();

        const result = service.deleteFormula('nonexistent', adminUser);

        expect(result).toBe(false);
      });
    });

    describe('given a non-admin user', () => {
      it('when called, then it throws a permission error', () => {
        const service = createService();

        expect(() => service.deleteFormula('formula-1', nonAdminUser)).toThrow(
          'Insufficient permissions',
        );
      });
    });
  });
});
