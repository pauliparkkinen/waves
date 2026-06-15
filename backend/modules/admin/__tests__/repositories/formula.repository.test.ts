import { describe, it, expect } from 'vitest';
import { InMemoryFormulaRepository } from '../../repositories/formula.repository.js';

const validData = {
  collection_id: 'col-1',
  symbol: 'formula-1',
  expression: { type: 'literal', value: 42 } as const,
  output_type: 'number' as const,
  formula_references: [],
};

describe('InMemoryFormulaRepository', () => {
  describe('given an empty repository', () => {
    it('when listFormulas is called, then it returns an empty array', () => {
      const repo = new InMemoryFormulaRepository();
      expect(repo.listFormulas()).toEqual([]);
    });

    it('when getFormula is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryFormulaRepository();

      const result = repo.getFormula('nonexistent');

      expect(result).toBeUndefined();
    });

    it('when createFormula is called, then it creates and returns the formula with an id', () => {
      const repo = new InMemoryFormulaRepository();

      const result = repo.createFormula(validData);

      expect(result.formula_id).toBeDefined();
      expect(result.formula_id).toMatch(/^formula-/);
      expect(result.symbol).toBe('formula-1');
    });

    it('when updateFormula is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryFormulaRepository();

      const result = repo.updateFormula('nonexistent', { symbol: 'updated' });

      expect(result).toBeUndefined();
    });

    it('when deleteFormula is called with a non-existent id, then it returns false', () => {
      const repo = new InMemoryFormulaRepository();

      const result = repo.deleteFormula('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('given a repository with formulas', () => {
    it('when listFormulas is called, then it returns all formulas', () => {
      const repo = new InMemoryFormulaRepository();
      repo.createFormula(validData);
      repo.createFormula({ ...validData, symbol: 'formula-2' });

      const result = repo.listFormulas();

      expect(result).toHaveLength(2);
    });

    it('when listFormulas is called with a collection id, then it filters', () => {
      const repo = new InMemoryFormulaRepository();
      repo.createFormula(validData);
      repo.createFormula({ ...validData, symbol: 'formula-2', collection_id: 'col-2' });

      const result = repo.listFormulas('col-1');

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('formula-1');
    });

    it('when getFormula is called with the existing id, then it returns the formula', () => {
      const repo = new InMemoryFormulaRepository();
      const created = repo.createFormula(validData);

      const result = repo.getFormula(created.formula_id);

      expect(result).toEqual(created);
    });

    it('when getFormula is called, then it returns a copy (not a reference)', () => {
      const repo = new InMemoryFormulaRepository();
      const created = repo.createFormula(validData);

      const result = repo.getFormula(created.formula_id);
      result!.symbol = 'mutated';

      // Original should be unchanged
      const again = repo.getFormula(created.formula_id);
      expect(again!.symbol).toBe('formula-1');
    });

    it('when updateFormula is called, then it updates the formula', () => {
      const repo = new InMemoryFormulaRepository();
      const created = repo.createFormula(validData);

      const updated = repo.updateFormula(created.formula_id, { symbol: 'updated-formula' });

      expect(updated).toBeDefined();
      expect(updated!.symbol).toBe('updated-formula');
    });

    it('when updateFormula is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryFormulaRepository();

      const result = repo.updateFormula('nonexistent', { symbol: 'updated' });

      expect(result).toBeUndefined();
    });

    it('when deleteFormula is called with existing id, then it removes the formula and returns true', () => {
      const repo = new InMemoryFormulaRepository();
      const created = repo.createFormula(validData);

      const deleted = repo.deleteFormula(created.formula_id);

      expect(deleted).toBe(true);
      expect(repo.listFormulas()).toEqual([]);
    });
  });
});
