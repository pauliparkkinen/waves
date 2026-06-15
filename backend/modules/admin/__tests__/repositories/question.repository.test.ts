import { describe, it, expect } from 'vitest';

function tick(ms = 1): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
import { InMemoryQuestionRepository } from '../../repositories/question.repository.js';
import type { CreateQuestionInput } from '../../types/question.types.js';

const sampleData: CreateQuestionInput = {
  collection_id: 'col-1',
  question_symbol: 'q1',
  type: 'free-text' as const,
  version: 1,
  parameters: { max_length: 100 },
  translations: [],
};

describe('InMemoryQuestionRepository', () => {
  describe('given an empty repository', () => {
    it('when listQuestions is called, then it returns an empty array', () => {
      const repo = new InMemoryQuestionRepository();

      const result = repo.listQuestions();

      expect(result).toEqual([]);
    });

    it('when getQuestion is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryQuestionRepository();

      const result = repo.getQuestion('nonexistent');

      expect(result).toBeUndefined();
    });

    it('when createQuestion is called, then it creates and returns the question with id, created_at, updated_at', () => {
      const repo = new InMemoryQuestionRepository();

      const result = repo.createQuestion(sampleData);

      expect(result.question_id).toBeDefined();
      expect(result.question_id).toMatch(/^question-/);
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
      expect(result.collection_id).toBe('col-1');
      expect(result.question_symbol).toBe('q1');
    });

    it('when deleteQuestion is called with a non-existent id, then it returns false', () => {
      const repo = new InMemoryQuestionRepository();

      const result = repo.deleteQuestion('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('given a repository with questions', () => {
    it('when createQuestion is called with all fields, then it stores and returns them', () => {
      const repo = new InMemoryQuestionRepository();

      const result = repo.createQuestion(sampleData);

      expect(result.question_id).toBeDefined();
      expect(result.collection_id).toBe('col-1');
      expect(result.question_symbol).toBe('q1');
      expect(result.type).toBe('free-text');
      expect(result.version).toBe(1);
      expect(result.parameters).toEqual({ max_length: 100 });
      expect(result.translations).toEqual([]);
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('when listQuestions is called without collectionId filter, then it returns all questions', () => {
      const repo = new InMemoryQuestionRepository();
      repo.createQuestion(sampleData);
      repo.createQuestion({
        ...sampleData,
        collection_id: 'col-2',
        question_symbol: 'q2',
      });

      const result = repo.listQuestions();

      expect(result).toHaveLength(2);
    });

    it('when listQuestions is called with a collectionId filter, then it returns only matching questions', () => {
      const repo = new InMemoryQuestionRepository();
      repo.createQuestion(sampleData);
      repo.createQuestion({
        ...sampleData,
        collection_id: 'col-2',
        question_symbol: 'q2',
      });

      const result = repo.listQuestions('col-1');

      expect(result).toHaveLength(1);
      expect(result[0].collection_id).toBe('col-1');
    });

    it('when getQuestion is called with an existing id, then it returns the question', () => {
      const repo = new InMemoryQuestionRepository();
      const created = repo.createQuestion(sampleData);

      const result = repo.getQuestion(created.question_id);

      expect(result).toEqual(created);
    });

    it('when updateQuestion is called, then it updates the fields and changes updated_at', async () => {
      const repo = new InMemoryQuestionRepository();
      const created = repo.createQuestion(sampleData);
      const originalUpdatedAt = created.updated_at;

      await tick(2);

      const updated = repo.updateQuestion(created.question_id, {
        question_symbol: 'q1-updated',
        version: 2,
      });

      expect(updated).toBeDefined();
      expect(updated!.question_symbol).toBe('q1-updated');
      expect(updated!.version).toBe(2);
      expect(updated!.updated_at).not.toBe(originalUpdatedAt);
    });

    it('when updateQuestion is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryQuestionRepository();

      const result = repo.updateQuestion('nonexistent', {
        question_symbol: 'updated',
      });

      expect(result).toBeUndefined();
    });

    it('when deleteQuestion is called, then it removes the question and returns true', () => {
      const repo = new InMemoryQuestionRepository();
      const created = repo.createQuestion(sampleData);

      const deleted = repo.deleteQuestion(created.question_id);

      expect(deleted).toBe(true);
      expect(repo.listQuestions()).toEqual([]);
    });
  });
});
