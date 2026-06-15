import { describe, it, expect } from 'vitest';
import { InMemoryAdminRepository } from '../../repositories/admin.repository.js';

describe('InMemoryAdminRepository', () => {
  describe('Formulas', () => {
    describe('given an empty repository', () => {
      it('when getFormula is called with a non-existent id, then it returns undefined', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.getFormula('nonexistent');

        expect(result).toBeUndefined();
      });

      it('when createFormula is called, then it creates and returns the formula', () => {
        const repo = new InMemoryAdminRepository();
        const data = {
          collection_id: 'col-1',
          symbol: 'formula-1',
          expression: {},
          output_type: 'number' as const,
          formula_references: [],
        };

        const result = repo.createFormula(data);

        expect(result.formula_id).toBeDefined();
        expect(result.symbol).toBe('formula-1');
      });

      it('when deleteFormula is called with a non-existent id, then it returns false', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.deleteFormula('nonexistent');

        expect(result).toBe(false);
      });
    });

    describe('given a repository with formulas', () => {
      it('when getFormula is called with the existing id, then it returns the formula', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createFormula({
          collection_id: 'col-1',
          symbol: 'f1',
          expression: {},
          output_type: 'number',
          formula_references: [],
        });

        const result = repo.getFormula(created.formula_id);

        expect(result).toEqual(created);
      });

      it('when listFormulas is called, then it returns all formulas', () => {
        const repo = new InMemoryAdminRepository();
        repo.createFormula({
          collection_id: 'col-1',
          symbol: 'f1',
          expression: {},
          output_type: 'number',
          formula_references: [],
        });

        const result = repo.listFormulas();

        expect(result).toHaveLength(1);
      });

      it('when updateFormula is called, then it updates the formula', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createFormula({
          collection_id: 'col-1',
          symbol: 'f1',
          expression: {},
          output_type: 'number',
          formula_references: [],
        });

        const updated = repo.updateFormula(created.formula_id, { symbol: 'f1-updated' });

        expect(updated).toBeDefined();
        expect(updated!.symbol).toBe('f1-updated');
      });

      it('when updateFormula is called with a non-existent id, then it returns undefined', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.updateFormula('nonexistent', { symbol: 'f1-updated' });

        expect(result).toBeUndefined();
      });

      it('when deleteFormula is called, then it removes the formula and returns true', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createFormula({
          collection_id: 'col-1',
          symbol: 'f1',
          expression: {},
          output_type: 'number',
          formula_references: [],
        });

        const deleted = repo.deleteFormula(created.formula_id);

        expect(deleted).toBe(true);
        expect(repo.listFormulas()).toEqual([]);
      });
    });
  });
});
