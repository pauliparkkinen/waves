import { describe, it, expect } from 'vitest';
import { InMemoryAdminRepository } from '../../repositories/admin.repository.js';

describe('InMemoryAdminRepository', () => {
  describe('Sections', () => {
    describe('given an empty repository', () => {
      it('when getSection is called with a non-existent id, then it returns undefined', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.getSection('nonexistent');

        expect(result).toBeUndefined();
      });

      it('when createSection is called, then it creates and returns the section', () => {
        const repo = new InMemoryAdminRepository();
        const data = {
          section_symbol: 's1',
          version: 1,
          status: 'draft' as const,
          section_questions: [],
          translations: [],
        };

        const result = repo.createSection(data);

        expect(result.section_id).toBeDefined();
        expect(result.section_symbol).toBe('s1');
      });

      it('when listSections is called, then it returns an empty array', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.listSections();

        expect(result).toEqual([]);
      });
    });

    describe('given a repository with sections', () => {
      it('when getSection is called with the existing id, then it returns the section', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createSection({
          section_symbol: 's1',
          version: 1,
          status: 'draft',
          section_questions: [],
          translations: [],
        });

        const result = repo.getSection(created.section_id);

        expect(result).toEqual(created);
      });

      it('when listSections is called, then it returns all sections', () => {
        const repo = new InMemoryAdminRepository();
        repo.createSection({
          section_symbol: 's1',
          version: 1,
          status: 'draft',
          section_questions: [],
          translations: [],
        });

        const result = repo.listSections();

        expect(result).toHaveLength(1);
      });

      it('when updateSection is called, then it updates the section', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createSection({
          section_symbol: 's1',
          version: 1,
          status: 'draft',
          section_questions: [],
          translations: [],
        });

        const updated = repo.updateSection(created.section_id, { section_symbol: 's1-updated' });

        expect(updated).toBeDefined();
        expect(updated!.section_symbol).toBe('s1-updated');
      });

      it('when updateSection is called with a non-existent id, then it returns undefined', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.updateSection('nonexistent', { section_symbol: 's1-updated' });

        expect(result).toBeUndefined();
      });

      it('when deleteSection is called, then it removes the section and returns true', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createSection({
          section_symbol: 's1',
          version: 1,
          status: 'draft',
          section_questions: [],
          translations: [],
        });

        const deleted = repo.deleteSection(created.section_id);

        expect(deleted).toBe(true);
        expect(repo.listSections()).toEqual([]);
      });
    });
  });

  describe('Forms', () => {
    describe('given an empty repository', () => {
      it('when getForm is called with a non-existent id, then it returns undefined', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.getForm('nonexistent');

        expect(result).toBeUndefined();
      });

      it('when createForm is called, then it creates and returns the form', () => {
        const repo = new InMemoryAdminRepository();
        const data = {
          collection_id: 'col-1',
          form_symbol: 'f1',
          version: 1,
          form_sections: [],
          formulas: [],
          status: 'draft' as const,
          form_organisations: [],
          translations: [],
        };

        const result = repo.createForm(data);

        expect(result.form_id).toBeDefined();
        expect(result.form_symbol).toBe('f1');
      });

      it('when deleteForm is called with a non-existent id, then it returns false', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.deleteForm('nonexistent');

        expect(result).toBe(false);
      });
    });

    describe('given a repository with forms', () => {
      it('when getForm is called with the existing id, then it returns the form', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createForm({
          collection_id: 'col-1',
          form_symbol: 'f1',
          version: 1,
          form_sections: [],
          formulas: [],
          status: 'draft',
          form_organisations: [],
          translations: [],
        });

        const result = repo.getForm(created.form_id);

        expect(result).toEqual(created);
      });

      it('when listForms is called, then it returns all forms', () => {
        const repo = new InMemoryAdminRepository();
        repo.createForm({
          collection_id: 'col-1',
          form_symbol: 'f1',
          version: 1,
          form_sections: [],
          formulas: [],
          status: 'draft',
          form_organisations: [],
          translations: [],
        });

        const result = repo.listForms();

        expect(result).toHaveLength(1);
      });

      it('when updateForm is called, then it updates the form', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createForm({
          collection_id: 'col-1',
          form_symbol: 'f1',
          version: 1,
          form_sections: [],
          formulas: [],
          status: 'draft',
          form_organisations: [],
          translations: [],
        });

        const updated = repo.updateForm(created.form_id, { form_symbol: 'f1-updated' });

        expect(updated).toBeDefined();
        expect(updated!.form_symbol).toBe('f1-updated');
      });

      it('when updateForm is called with a non-existent id, then it returns undefined', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.updateForm('nonexistent', { form_symbol: 'f1-updated' });

        expect(result).toBeUndefined();
      });

      it('when deleteForm is called, then it removes the form and returns true', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createForm({
          collection_id: 'col-1',
          form_symbol: 'f1',
          version: 1,
          form_sections: [],
          formulas: [],
          status: 'draft',
          form_organisations: [],
          translations: [],
        });

        const deleted = repo.deleteForm(created.form_id);

        expect(deleted).toBe(true);
        expect(repo.listForms()).toEqual([]);
      });
    });
  });

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
