import { describe, it, expect } from 'vitest';
import { InMemoryAdminRepository } from '../../repositories/admin.repository.js';

describe('InMemoryAdminRepository', () => {
  describe('Collections', () => {
    describe('given an empty repository', () => {
      it('when listCollections is called, then it returns an empty array', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.listCollections();

        expect(result).toEqual([]);
      });

      it('when getCollection is called with a non-existent id, then it returns undefined', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.getCollection('nonexistent');

        expect(result).toBeUndefined();
      });

      it('when createCollection is called, then it creates and returns the collection', () => {
        const repo = new InMemoryAdminRepository();
        const data = { collection_permissions: [] };

        const result = repo.createCollection(data);

        expect(result.collection_id).toBeDefined();
        expect(result.collection_permissions).toEqual([]);
      });

      it('when deleteCollection is called with a non-existent id, then it returns false', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.deleteCollection('nonexistent');

        expect(result).toBe(false);
      });
    });

    describe('given a repository with a collection', () => {
      it('when getCollection is called with the existing id, then it returns the collection', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createCollection({ collection_permissions: [] });

        const result = repo.getCollection(created.collection_id);

        expect(result).toEqual(created);
      });

      it('when updateCollection is called, then it updates the collection', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createCollection({ collection_permissions: [] });

        const updated = repo.updateCollection(created.collection_id, {
          collection_permissions: [
            { organisation_id: 'org-1', read: true, use: false, edit: false, owner: false },
          ],
        });

        expect(updated).toBeDefined();
        expect(updated!.collection_permissions).toHaveLength(1);
      });

      it('when updateCollection is called with a non-existent id, then it returns undefined', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.updateCollection('nonexistent', { collection_permissions: [] });

        expect(result).toBeUndefined();
      });

      it('when deleteCollection is called, then it removes the collection and returns true', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createCollection({ collection_permissions: [] });

        const deleted = repo.deleteCollection(created.collection_id);

        expect(deleted).toBe(true);
        expect(repo.listCollections()).toEqual([]);
      });
    });
  });

  describe('Questions', () => {
    describe('given an empty repository', () => {
      it('when listQuestions is called, then it returns an empty array', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.listQuestions();

        expect(result).toEqual([]);
      });

      it('when getQuestion is called with a non-existent id, then it returns undefined', () => {
        const repo = new InMemoryAdminRepository();

        const result = repo.getQuestion('nonexistent');

        expect(result).toBeUndefined();
      });

      it('when createQuestion is called, then it creates and returns the question', () => {
        const repo = new InMemoryAdminRepository();
        const data = {
          collection_id: 'col-1',
          question_symbol: 'q1',
          type: 'free-text' as const,
          version: 1,
          parameters: {},
          translations: [],
        };

        const result = repo.createQuestion(data);

        expect(result.question_id).toBeDefined();
        expect(result.created_at).toBeDefined();
        expect(result.updated_at).toBeDefined();
        expect(result.question_symbol).toBe('q1');
      });
    });

    describe('given a repository with questions', () => {
      it('when listQuestions is called with a collectionId filter, then it returns matching questions', () => {
        const repo = new InMemoryAdminRepository();
        repo.createQuestion({
          collection_id: 'col-1',
          question_symbol: 'q1',
          type: 'free-text',
          version: 1,
          parameters: {},
          translations: [],
        });
        repo.createQuestion({
          collection_id: 'col-2',
          question_symbol: 'q2',
          type: 'free-text',
          version: 1,
          parameters: {},
          translations: [],
        });

        const result = repo.listQuestions('col-1');

        expect(result).toHaveLength(1);
        expect(result[0].question_symbol).toBe('q1');
      });

      it('when updateQuestion is called, then it updates the question and changes updated_at', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createQuestion({
          collection_id: 'col-1',
          question_symbol: 'q1',
          type: 'free-text',
          version: 1,
          parameters: {},
          translations: [],
        });

        const updated = repo.updateQuestion(created.question_id, { question_symbol: 'q1-updated' });

        expect(updated).toBeDefined();
        expect(updated!.question_symbol).toBe('q1-updated');
        expect(typeof updated!.updated_at).toBe('string');
      });

      it('when deleteQuestion is called, then it removes the question and returns true', () => {
        const repo = new InMemoryAdminRepository();
        const created = repo.createQuestion({
          collection_id: 'col-1',
          question_symbol: 'q1',
          type: 'free-text',
          version: 1,
          parameters: {},
          translations: [],
        });

        const deleted = repo.deleteQuestion(created.question_id);

        expect(deleted).toBe(true);
        expect(repo.listQuestions()).toEqual([]);
      });
    });
  });

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
