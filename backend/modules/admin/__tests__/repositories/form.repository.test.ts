import { describe, it, expect } from 'vitest';
import { InMemoryFormRepository } from '../../repositories/form.repository.js';
import type { CreateFormInput } from '../../types/form.types.js';

const sampleData: CreateFormInput = {
  collection_id: 'col-1',
  form_symbol: 'form-1',
  version: 1,
  status: 'draft',
  form_sections: [
    { section_symbol: 'sec-1', version_number: 1, order_number: 0 },
  ],
  formulas: [],
  form_organisations: [],
  translations: [],
};

describe('InMemoryFormRepository', () => {
  describe('given an empty repository', () => {
    it('when listForms is called, then it returns an empty array', () => {
      const repo = new InMemoryFormRepository();
      const result = repo.listForms();
      expect(result).toEqual([]);
    });

    it('when getForm is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryFormRepository();
      const result = repo.getForm('nonexistent');
      expect(result).toBeUndefined();
    });

    it('when createForm is called, then it creates and returns the form with generated id', () => {
      const repo = new InMemoryFormRepository();
      const result = repo.createForm(sampleData);
      expect(result.form_id).toBeDefined();
      expect(result.form_id).toMatch(/^form-/);
      expect(result.form_symbol).toBe('form-1');
      expect(result.version).toBe(1);
      expect(result.status).toBe('draft');
    });

    it('when deleteForm is called with a non-existent id, then it returns false', () => {
      const repo = new InMemoryFormRepository();
      const result = repo.deleteForm('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('given a repository with forms', () => {
    it('when createForm is called with all fields, then it stores and returns them', () => {
      const repo = new InMemoryFormRepository();
      const result = repo.createForm(sampleData);
      expect(result.form_id).toBeDefined();
      expect(result.collection_id).toBe('col-1');
      expect(result.form_symbol).toBe('form-1');
      expect(result.version).toBe(1);
      expect(result.status).toBe('draft');
      expect(result.form_sections).toEqual(sampleData.form_sections);
      expect(result.formulas).toEqual([]);
      expect(result.form_organisations).toEqual([]);
      expect(result.translations).toEqual([]);
    });

    it('when listForms is called, then it returns all forms', () => {
      const repo = new InMemoryFormRepository();
      repo.createForm(sampleData);
      repo.createForm({ ...sampleData, form_symbol: 'form-2' });
      const result = repo.listForms();
      expect(result).toHaveLength(2);
    });

    it('when getForm is called with an existing id, then it returns the form', () => {
      const repo = new InMemoryFormRepository();
      const created = repo.createForm(sampleData);
      const result = repo.getForm(created.form_id);
      expect(result).toEqual(created);
    });

    it('when updateForm is called, then it modifies the fields', () => {
      const repo = new InMemoryFormRepository();
      const created = repo.createForm(sampleData);
      const updated = repo.updateForm(created.form_id, {
        form_symbol: 'form-1-updated',
        version: 2,
      });
      expect(updated).toBeDefined();
      expect(updated!.form_symbol).toBe('form-1-updated');
      expect(updated!.version).toBe(2);
    });

    it('when updateForm is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryFormRepository();
      const result = repo.updateForm('nonexistent', { form_symbol: 'updated' });
      expect(result).toBeUndefined();
    });

    it('when deleteForm is called, then it removes the form and returns true', () => {
      const repo = new InMemoryFormRepository();
      const created = repo.createForm(sampleData);
      const deleted = repo.deleteForm(created.form_id);
      expect(deleted).toBe(true);
      expect(repo.listForms()).toEqual([]);
    });

    it('when updateForm is called, then form_id from update data is stripped', () => {
      const repo = new InMemoryFormRepository();
      const created = repo.createForm(sampleData);
      const originalId = created.form_id;
      const updated = repo.updateForm(originalId, {
        form_id: 'should-be-ignored',
        form_symbol: 'updated-form',
      } as any);
      expect(updated).toBeDefined();
      expect(updated!.form_id).toBe(originalId);
      expect(updated!.form_symbol).toBe('updated-form');
    });
  });
});
