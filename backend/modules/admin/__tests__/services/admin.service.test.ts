import { describe, it, expect, vi } from 'vitest';
import { AdminService } from '../../services/admin.service.js';
import type { IAdminRepository } from '../../repositories/admin.repository.js';

function makeRepository(overrides: Partial<IAdminRepository> = {}): IAdminRepository {
  return {
    listFormulas: vi.fn().mockReturnValue([]),
    getFormula: vi.fn().mockReturnValue(undefined),
    createFormula: vi.fn().mockReturnValue({
      formula_id: 'admin-1',
      collection_id: 'col-1',
      symbol: 'f1',
      expression: {},
      output_type: 'number',
      formula_references: [],
    }),
    updateFormula: vi.fn().mockReturnValue(undefined),
    deleteFormula: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

describe('AdminService', () => {
  describe('getStatus', () => {
    describe('given an AdminService instance', () => {
      it('when called, then it returns status ok for the admin module', () => {
        const service = new AdminService(makeRepository());

        const result = service.getStatus();

        expect(result).toEqual({ status: 'ok', module: 'admin' });
      });
    });
  });

  describe('Formulas', () => {
    it('when listFormulas is called, then it delegates to the repository', () => {
      const formulas = [
        {
          formula_id: 'f-1',
          collection_id: 'col-1',
          symbol: 'f1',
          expression: {},
          output_type: 'number' as const,
          formula_references: [],
        },
      ];
      const repo = makeRepository({ listFormulas: vi.fn().mockReturnValue(formulas) });
      const service = new AdminService(repo);

      const result = service.listFormulas();

      expect(result).toEqual(formulas);
      expect(repo.listFormulas).toHaveBeenCalled();
    });
  });
});
