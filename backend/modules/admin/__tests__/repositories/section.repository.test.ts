import { describe, it, expect } from 'vitest';
import { InMemorySectionRepository } from '../../repositories/section.repository.js';
import type { CreateSectionInput } from '../../types/section.types.js';

const sampleData: CreateSectionInput = {
  section_symbol: 'sec-1',
  version: 1,
  status: 'draft',
  condition_formula_id: undefined,
  section_questions: [
    { question_symbol: 'q1', version_number: 1, order_number: 0, required: true },
  ],
  translations: [],
};

describe('InMemorySectionRepository', () => {
  describe('given an empty repository', () => {
    it('when listSections is called, then it returns an empty array', () => {
      const repo = new InMemorySectionRepository();

      const result = repo.listSections();

      expect(result).toEqual([]);
    });

    it('when getSection is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemorySectionRepository();

      const result = repo.getSection('nonexistent');

      expect(result).toBeUndefined();
    });

    it('when createSection is called, then it creates and returns the section with generated id', () => {
      const repo = new InMemorySectionRepository();

      const result = repo.createSection(sampleData);

      expect(result.section_id).toBeDefined();
      expect(result.section_id).toMatch(/^section-/);
      expect(result.section_symbol).toBe('sec-1');
      expect(result.version).toBe(1);
      expect(result.status).toBe('draft');
    });

    it('when deleteSection is called with a non-existent id, then it returns false', () => {
      const repo = new InMemorySectionRepository();

      const result = repo.deleteSection('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('given a repository with sections', () => {
    it('when createSection is called with all fields, then it stores and returns them', () => {
      const repo = new InMemorySectionRepository();

      const result = repo.createSection(sampleData);

      expect(result.section_id).toBeDefined();
      expect(result.section_symbol).toBe('sec-1');
      expect(result.version).toBe(1);
      expect(result.status).toBe('draft');
      expect(result.section_questions).toEqual(sampleData.section_questions);
      expect(result.translations).toEqual([]);
    });

    it('when listSections is called, then it returns all sections', () => {
      const repo = new InMemorySectionRepository();
      repo.createSection(sampleData);
      repo.createSection({
        ...sampleData,
        section_symbol: 'sec-2',
      });

      const result = repo.listSections();

      expect(result).toHaveLength(2);
    });

    it('when getSection is called with an existing id, then it returns the section', () => {
      const repo = new InMemorySectionRepository();
      const created = repo.createSection(sampleData);

      const result = repo.getSection(created.section_id);

      expect(result).toEqual(created);
    });

    it('when updateSection is called, then it updates the fields', () => {
      const repo = new InMemorySectionRepository();
      const created = repo.createSection(sampleData);

      const updated = repo.updateSection(created.section_id, {
        section_symbol: 'sec-1-updated',
        version: 2,
      });

      expect(updated).toBeDefined();
      expect(updated!.section_symbol).toBe('sec-1-updated');
      expect(updated!.version).toBe(2);
    });

    it('when updateSection is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemorySectionRepository();

      const result = repo.updateSection('nonexistent', {
        section_symbol: 'updated',
      });

      expect(result).toBeUndefined();
    });

    it('when deleteSection is called, then it removes the section and returns true', () => {
      const repo = new InMemorySectionRepository();
      const created = repo.createSection(sampleData);

      const deleted = repo.deleteSection(created.section_id);

      expect(deleted).toBe(true);
      expect(repo.listSections()).toEqual([]);
    });

    it('when updateSection is called, then section_id from update data is stripped', () => {
      const repo = new InMemorySectionRepository();
      const created = repo.createSection(sampleData);
      const originalId = created.section_id;

      const updated = repo.updateSection(originalId, {
        section_id: 'should-be-ignored',
        section_symbol: 'updated-sec',
      } as any);

      expect(updated).toBeDefined();
      expect(updated!.section_id).toBe(originalId);
      expect(updated!.section_symbol).toBe('updated-sec');
    });
  });
});
