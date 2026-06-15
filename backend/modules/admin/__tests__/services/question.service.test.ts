import { describe, it, expect, vi } from 'vitest';
import { QuestionService } from '../../services/question.service.js';
import type { IQuestionRepository } from '../../repositories/question.repository.js';
import type { Question, CreateQuestionInput, UpdateQuestionInput } from '../../types/question.types.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';
import { QuestionValidationError } from '../../validators/question.validator.js';

function makeRepository(overrides: Partial<IQuestionRepository> = {}): IQuestionRepository {
  return {
    listQuestions: vi.fn().mockReturnValue([]),
    getQuestion: vi.fn().mockReturnValue(undefined),
    createQuestion: vi.fn().mockReturnValue({
      collection_id: 'collection-1',
      question_id: 'question-1',
      question_symbol: 'q1',
      type: 'free-text' as const,
      version: 1,
      parameters: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      translations: [],
    }),
    updateQuestion: vi.fn().mockReturnValue(undefined),
    deleteQuestion: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

const adminUser: AuthUser = { sub: 'admin', permissions: ['admin:manage'] };
const orgUser: AuthUser = { sub: 'org-user', permissions: [], organisation_id: 'org-1' };

describe('QuestionService', () => {
  describe('listQuestions', () => {
    it('given admin user, when called, then it returns questions from repository', () => {
      const questions: Question[] = [
        {
          collection_id: 'c-1',
          question_id: 'q-1',
          question_symbol: 'q1',
          type: 'free-text',
          version: 1,
          parameters: {},
          created_at: '',
          updated_at: '',
          translations: [],
        },
      ];
      const repo = makeRepository({ listQuestions: vi.fn().mockReturnValue(questions) });
      const service = new QuestionService(repo);

      const result = service.listQuestions(undefined, adminUser);

      expect(result).toEqual(questions);
      expect(repo.listQuestions).toHaveBeenCalledWith(undefined);
    });

    it('given admin user with collectionId, then it passes collectionId to repository', () => {
      const questions: Question[] = [
        {
          collection_id: 'c-1',
          question_id: 'q-1',
          question_symbol: 'q1',
          type: 'free-text',
          version: 1,
          parameters: {},
          created_at: '',
          updated_at: '',
          translations: [],
        },
      ];
      const repo = makeRepository({ listQuestions: vi.fn().mockReturnValue(questions) });
      const service = new QuestionService(repo);

      const result = service.listQuestions('c-1', adminUser);

      expect(result).toEqual(questions);
      expect(repo.listQuestions).toHaveBeenCalledWith('c-1');
    });

    it('given non-admin user, then it still returns questions (no strict filtering yet)', () => {
      const questions: Question[] = [
        {
          collection_id: 'c-1',
          question_id: 'q-1',
          question_symbol: 'q1',
          type: 'free-text',
          version: 1,
          parameters: {},
          created_at: '',
          updated_at: '',
          translations: [],
        },
      ];
      const repo = makeRepository({ listQuestions: vi.fn().mockReturnValue(questions) });
      const service = new QuestionService(repo);

      const result = service.listQuestions(undefined, orgUser);

      expect(result).toEqual(questions);
      expect(repo.listQuestions).toHaveBeenCalledWith(undefined);
    });
  });

  describe('createQuestion', () => {
    it('given admin user with valid data, then it calls validator and repository and returns the created question', () => {
      const created: Question = {
        collection_id: 'collection-1',
        question_id: 'question-1',
        question_symbol: 'q1',
        type: 'free-text',
        version: 1,
        parameters: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        translations: [],
      };
      const repo = makeRepository({ createQuestion: vi.fn().mockReturnValue(created) });
      const service = new QuestionService(repo);
      const validData: CreateQuestionInput = {
        collection_id: 'collection-1',
        question_symbol: 'q1',
        type: 'free-text',
        version: 1,
        parameters: {},
        translations: [],
      };

      const result = service.createQuestion(validData, adminUser);

      expect(result).toEqual(created);
      expect(repo.createQuestion).toHaveBeenCalledWith(validData);
    });

    it('given admin user with invalid data (missing required fields), then it throws QuestionValidationError', () => {
      const repo = makeRepository();
      const service = new QuestionService(repo);
      const invalidData = { collection_id: '', question_symbol: '', type: 'invalid' as any, version: 0 };

      expect(() => service.createQuestion(invalidData as any, adminUser)).toThrow(QuestionValidationError);
    });

    it('given non-admin user, then it throws Insufficient permissions error', () => {
      const repo = makeRepository();
      const service = new QuestionService(repo);
      const data: CreateQuestionInput = {
        collection_id: 'collection-1',
        question_symbol: 'q1',
        type: 'free-text',
        version: 1,
        parameters: {},
        translations: [],
      };

      expect(() => service.createQuestion(data, orgUser)).toThrow(
        'Insufficient permissions: admin:manage required to create a question',
      );
    });
  });

  describe('getQuestion', () => {
    it('given the question exists, then it returns the question', () => {
      const question: Question = {
        collection_id: 'c-1',
        question_id: 'q-1',
        question_symbol: 'q1',
        type: 'free-text',
        version: 1,
        parameters: {},
        created_at: '',
        updated_at: '',
        translations: [],
      };
      const repo = makeRepository({ getQuestion: vi.fn().mockReturnValue(question) });
      const service = new QuestionService(repo);

      const result = service.getQuestion('q-1');

      expect(result).toEqual(question);
    });

    it('given the question does not exist, then it returns undefined', () => {
      const repo = makeRepository({ getQuestion: vi.fn().mockReturnValue(undefined) });
      const service = new QuestionService(repo);

      const result = service.getQuestion('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('updateQuestion', () => {
    it('given admin user with valid data and question exists, then it calls validator and repository and returns updated question', () => {
      const existing: Question = {
        collection_id: 'c-1',
        question_id: 'q-1',
        question_symbol: 'q1',
        type: 'free-text',
        version: 1,
        parameters: {},
        created_at: '',
        updated_at: '',
        translations: [],
      };
      const updated: Question = { ...existing, question_symbol: 'updated' };
      const repo = makeRepository({
        getQuestion: vi.fn().mockReturnValue(existing),
        updateQuestion: vi.fn().mockReturnValue(updated),
      });
      const service = new QuestionService(repo);
      const updateData: UpdateQuestionInput = { question_symbol: 'updated' };

      const result = service.updateQuestion('q-1', updateData, adminUser);

      expect(result).toEqual(updated);
      expect(repo.updateQuestion).toHaveBeenCalledWith('q-1', updateData);
    });

    it('given admin user with invalid data, then it throws QuestionValidationError', () => {
      const existing: Question = {
        collection_id: 'c-1',
        question_id: 'q-1',
        question_symbol: 'q1',
        type: 'free-text',
        version: 1,
        parameters: {},
        created_at: '',
        updated_at: '',
        translations: [],
      };
      const repo = makeRepository({
        getQuestion: vi.fn().mockReturnValue(existing),
      });
      const service = new QuestionService(repo);
      const invalidData = { type: 'invalid-type' as any };

      expect(() => service.updateQuestion('q-1', invalidData as any, adminUser)).toThrow(
        QuestionValidationError,
      );
    });

    it('given the question does not exist, then it returns undefined', () => {
      const repo = makeRepository({ getQuestion: vi.fn().mockReturnValue(undefined) });
      const service = new QuestionService(repo);

      const result = service.updateQuestion('nonexistent', {}, adminUser);

      expect(result).toBeUndefined();
    });

    it('given non-admin user, then it throws Insufficient permissions error', () => {
      const existing: Question = {
        collection_id: 'c-1',
        question_id: 'q-1',
        question_symbol: 'q1',
        type: 'free-text',
        version: 1,
        parameters: {},
        created_at: '',
        updated_at: '',
        translations: [],
      };
      const repo = makeRepository({
        getQuestion: vi.fn().mockReturnValue(existing),
      });
      const service = new QuestionService(repo);

      expect(() => service.updateQuestion('q-1', {}, orgUser)).toThrow(
        'Insufficient permissions: admin:manage required to update a question',
      );
    });
  });

  describe('deleteQuestion', () => {
    it('given admin user with existing question, then it deletes and returns true', () => {
      const existing: Question = {
        collection_id: 'c-1',
        question_id: 'q-1',
        question_symbol: 'q1',
        type: 'free-text',
        version: 1,
        parameters: {},
        created_at: '',
        updated_at: '',
        translations: [],
      };
      const repo = makeRepository({
        getQuestion: vi.fn().mockReturnValue(existing),
        deleteQuestion: vi.fn().mockReturnValue(true),
      });
      const service = new QuestionService(repo);

      const result = service.deleteQuestion('q-1', adminUser);

      expect(result).toBe(true);
      expect(repo.deleteQuestion).toHaveBeenCalledWith('q-1');
    });

    it('given the question does not exist, then it returns false', () => {
      const repo = makeRepository({ getQuestion: vi.fn().mockReturnValue(undefined) });
      const service = new QuestionService(repo);

      const result = service.deleteQuestion('nonexistent', adminUser);

      expect(result).toBe(false);
    });

    it('given non-admin user, then it throws Insufficient permissions error', () => {
      const existing: Question = {
        collection_id: 'c-1',
        question_id: 'q-1',
        question_symbol: 'q1',
        type: 'free-text',
        version: 1,
        parameters: {},
        created_at: '',
        updated_at: '',
        translations: [],
      };
      const repo = makeRepository({
        getQuestion: vi.fn().mockReturnValue(existing),
      });
      const service = new QuestionService(repo);

      expect(() => service.deleteQuestion('q-1', orgUser)).toThrow(
        'Insufficient permissions: admin:manage required to delete a question',
      );
    });
  });
});
