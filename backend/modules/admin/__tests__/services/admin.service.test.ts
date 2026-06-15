import { describe, it, expect, vi } from 'vitest';
import { AdminService } from '../../services/admin.service.js';
import type { IAdminRepository } from '../../repositories/admin.repository.js';

function makeRepository(overrides: Partial<IAdminRepository> = {}): IAdminRepository {
  return {
    listCollections: vi.fn().mockReturnValue([]),
    getCollection: vi.fn().mockReturnValue(undefined),
    createCollection: vi
      .fn()
      .mockReturnValue({ collection_id: 'admin-1', collection_permissions: [] }),
    updateCollection: vi.fn().mockReturnValue(undefined),
    deleteCollection: vi.fn().mockReturnValue(false),
    listQuestions: vi.fn().mockReturnValue([]),
    getQuestion: vi.fn().mockReturnValue(undefined),
    createQuestion: vi.fn().mockReturnValue({
      question_id: 'admin-1',
      collection_id: 'col-1',
      question_symbol: 'q1',
      type: 'free-text',
      version: 1,
      parameters: {},
      created_at: '',
      updated_at: '',
      translations: [],
    }),
    updateQuestion: vi.fn().mockReturnValue(undefined),
    deleteQuestion: vi.fn().mockReturnValue(false),
    listSections: vi.fn().mockReturnValue([]),
    getSection: vi.fn().mockReturnValue(undefined),
    createSection: vi.fn().mockReturnValue({
      section_id: 'admin-1',
      section_symbol: 's1',
      version: 1,
      status: 'draft',
      section_questions: [],
      translations: [],
    }),
    updateSection: vi.fn().mockReturnValue(undefined),
    deleteSection: vi.fn().mockReturnValue(false),
    listForms: vi.fn().mockReturnValue([]),
    getForm: vi.fn().mockReturnValue(undefined),
    createForm: vi.fn().mockReturnValue({
      form_id: 'admin-1',
      collection_id: 'col-1',
      form_symbol: 'f1',
      version: 1,
      form_sections: [],
      formulas: [],
      status: 'draft',
      form_organisations: [],
      translations: [],
    }),
    updateForm: vi.fn().mockReturnValue(undefined),
    deleteForm: vi.fn().mockReturnValue(false),
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

  describe('Collections', () => {
    describe('given a repository with collections', () => {
      it('when listCollections is called, then it delegates to the repository', () => {
        const collections = [{ collection_id: 'c-1', collection_permissions: [] }];
        const repo = makeRepository({ listCollections: vi.fn().mockReturnValue(collections) });
        const service = new AdminService(repo);

        const result = service.listCollections();

        expect(result).toEqual(collections);
        expect(repo.listCollections).toHaveBeenCalled();
      });
    });

    describe('given a repository', () => {
      it('when createCollection is called, then it delegates to the repository', () => {
        const data = { collection_permissions: [] };
        const created = { collection_id: 'c-1', collection_permissions: [] };
        const repo = makeRepository({ createCollection: vi.fn().mockReturnValue(created) });
        const service = new AdminService(repo);

        const result = service.createCollection(data);

        expect(result).toEqual(created);
        expect(repo.createCollection).toHaveBeenCalledWith(data);
      });

      it('when getCollection is called, then it delegates to the repository', () => {
        const collection = { collection_id: 'c-1', collection_permissions: [] };
        const repo = makeRepository({ getCollection: vi.fn().mockReturnValue(collection) });
        const service = new AdminService(repo);

        const result = service.getCollection('c-1');

        expect(result).toEqual(collection);
        expect(repo.getCollection).toHaveBeenCalledWith('c-1');
      });

      it('when updateCollection is called, then it delegates to the repository', () => {
        const updated = {
          collection_id: 'c-1',
          collection_permissions: [
            { organisation_id: 'org-1', read: true, use: false, edit: false, owner: false },
          ],
        };
        const repo = makeRepository({ updateCollection: vi.fn().mockReturnValue(updated) });
        const service = new AdminService(repo);

        const result = service.updateCollection('c-1', {
          collection_permissions: updated.collection_permissions,
        });

        expect(result).toEqual(updated);
        expect(repo.updateCollection).toHaveBeenCalledWith('c-1', {
          collection_permissions: updated.collection_permissions,
        });
      });

      it('when deleteCollection is called, then it delegates to the repository', () => {
        const repo = makeRepository({ deleteCollection: vi.fn().mockReturnValue(true) });
        const service = new AdminService(repo);

        const result = service.deleteCollection('c-1');

        expect(result).toBe(true);
        expect(repo.deleteCollection).toHaveBeenCalledWith('c-1');
      });
    });
  });

  describe('Questions', () => {
    it('when listQuestions is called, then it delegates to the repository', () => {
      const questions = [
        {
          question_id: 'q-1',
          collection_id: 'col-1',
          question_symbol: 'q1',
          type: 'free-text' as const,
          version: 1,
          parameters: {},
          created_at: '',
          updated_at: '',
          translations: [],
        },
      ];
      const repo = makeRepository({ listQuestions: vi.fn().mockReturnValue(questions) });
      const service = new AdminService(repo);

      const result = service.listQuestions('col-1');

      expect(result).toEqual(questions);
      expect(repo.listQuestions).toHaveBeenCalledWith('col-1');
    });

    it('when createQuestion is called, then it delegates to the repository', () => {
      const data = {
        collection_id: 'col-1',
        question_symbol: 'q1',
        type: 'free-text' as const,
        version: 1,
        parameters: {},
        translations: [],
      };
      const created = { question_id: 'q-1', ...data, created_at: '', updated_at: '' };
      const repo = makeRepository({ createQuestion: vi.fn().mockReturnValue(created) });
      const service = new AdminService(repo);

      const result = service.createQuestion(data);

      expect(result).toEqual(created);
      expect(repo.createQuestion).toHaveBeenCalledWith(data);
    });
  });

  describe('Sections', () => {
    it('when listSections is called, then it delegates to the repository', () => {
      const sections = [
        {
          section_id: 's-1',
          section_symbol: 's1',
          version: 1,
          status: 'draft' as const,
          section_questions: [],
          translations: [],
        },
      ];
      const repo = makeRepository({ listSections: vi.fn().mockReturnValue(sections) });
      const service = new AdminService(repo);

      const result = service.listSections();

      expect(result).toEqual(sections);
      expect(repo.listSections).toHaveBeenCalled();
    });
  });

  describe('Forms', () => {
    it('when listForms is called, then it delegates to the repository', () => {
      const forms = [
        {
          form_id: 'f-1',
          collection_id: 'col-1',
          form_symbol: 'f1',
          version: 1,
          form_sections: [],
          formulas: [],
          status: 'draft' as const,
          form_organisations: [],
          translations: [],
        },
      ];
      const repo = makeRepository({ listForms: vi.fn().mockReturnValue(forms) });
      const service = new AdminService(repo);

      const result = service.listForms();

      expect(result).toEqual(forms);
      expect(repo.listForms).toHaveBeenCalled();
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
