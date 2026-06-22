import { describe, it, expect } from 'vitest';
import { InMemoryTranslationRepository } from '../../repositories/translation.repository.js';

const validData = {
  collection_id: 'col-1',
  symbol: 'greeting',
  locale_code: 'en',
  value: 'Hello',
  status: 'draft' as const,
};

describe('InMemoryTranslationRepository', () => {
  describe('given an empty repository', () => {
    it('when listTranslations is called, then it returns an empty array', () => {
      const repo = new InMemoryTranslationRepository();
      expect(repo.listTranslations()).toEqual([]);
    });

    it('when getTranslation is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryTranslationRepository();

      const result = repo.getTranslation('nonexistent');

      expect(result).toBeUndefined();
    });

    it('when createTranslation is called, then it creates and returns the translation with an id', () => {
      const repo = new InMemoryTranslationRepository();

      const result = repo.createTranslation(validData);

      expect(result.translation_id).toBeDefined();
      expect(result.translation_id).toMatch(/^translation-/);
      expect(result.symbol).toBe('greeting');
    });

    it('when updateTranslation is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryTranslationRepository();

      const result = repo.updateTranslation('nonexistent', { symbol: 'updated' });

      expect(result).toBeUndefined();
    });

    it('when deleteTranslation is called with a non-existent id, then it returns false', () => {
      const repo = new InMemoryTranslationRepository();

      const result = repo.deleteTranslation('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('given a repository with translations', () => {
    it('when listTranslations is called, then it returns all translations', () => {
      const repo = new InMemoryTranslationRepository();
      repo.createTranslation(validData);
      repo.createTranslation({ ...validData, symbol: 'farewell' });

      const result = repo.listTranslations();

      expect(result).toHaveLength(2);
    });

    it('when listTranslations is called with a collection id, then it filters', () => {
      const repo = new InMemoryTranslationRepository();
      repo.createTranslation(validData);
      repo.createTranslation({ ...validData, symbol: 'farewell', collection_id: 'col-2' });

      const result = repo.listTranslations('col-1');

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('greeting');
    });

    it('when getTranslation is called with the existing id, then it returns the translation', () => {
      const repo = new InMemoryTranslationRepository();
      const created = repo.createTranslation(validData);

      const result = repo.getTranslation(created.translation_id);

      expect(result).toEqual(created);
    });

    it('when getTranslation is called, then it returns a copy (not a reference)', () => {
      const repo = new InMemoryTranslationRepository();
      const created = repo.createTranslation(validData);

      const result = repo.getTranslation(created.translation_id);
      result!.symbol = 'mutated';

      const again = repo.getTranslation(created.translation_id);
      expect(again!.symbol).toBe('greeting');
    });

    it('when updateTranslation is called, then it updates the translation', () => {
      const repo = new InMemoryTranslationRepository();
      const created = repo.createTranslation(validData);

      const updated = repo.updateTranslation(created.translation_id, { symbol: 'updated-greeting' });

      expect(updated).toBeDefined();
      expect(updated!.symbol).toBe('updated-greeting');
    });

    it('when updateTranslation is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryTranslationRepository();

      const result = repo.updateTranslation('nonexistent', { symbol: 'updated' });

      expect(result).toBeUndefined();
    });

    it('when deleteTranslation is called with existing id, then it removes the translation and returns true', () => {
      const repo = new InMemoryTranslationRepository();
      const created = repo.createTranslation(validData);

      const deleted = repo.deleteTranslation(created.translation_id);

      expect(deleted).toBe(true);
      expect(repo.listTranslations()).toEqual([]);
    });
  });
});
