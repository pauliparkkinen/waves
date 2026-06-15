import type { AuthUser } from '../../../src/types/auth.types.js';
import type { Question, CreateQuestionInput, UpdateQuestionInput } from '../types/question.types.js';
import type { IQuestionRepository } from '../repositories/question.repository.js';
import { validateQuestionInput, validateQuestionUpdateInput } from '../validators/question.validator.js';

export interface IQuestionService {
  listQuestions(collectionId?: string, user?: AuthUser): Question[];
  getQuestion(id: string, user?: AuthUser): Question | undefined;
  createQuestion(data: CreateQuestionInput, user?: AuthUser): Question;
  updateQuestion(id: string, data: UpdateQuestionInput, user?: AuthUser): Question | undefined;
  deleteQuestion(id: string, user?: AuthUser): boolean;
}

export class QuestionService implements IQuestionService {
  constructor(private readonly repository: IQuestionRepository) {}

  listQuestions(collectionId?: string, _user?: AuthUser): Question[] {
    return this.repository.listQuestions(collectionId);
  }

  getQuestion(id: string, user?: AuthUser): Question | undefined {
    return this.repository.getQuestion(id);
  }

  createQuestion(data: CreateQuestionInput, user?: AuthUser): Question {
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to create a question');
    }
    validateQuestionInput(data);
    return this.repository.createQuestion(data);
  }

  updateQuestion(id: string, data: UpdateQuestionInput, user?: AuthUser): Question | undefined {
    const existing = this.repository.getQuestion(id);
    if (!existing) return undefined;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to update a question');
    }
    validateQuestionUpdateInput(data);
    return this.repository.updateQuestion(id, data);
  }

  deleteQuestion(id: string, user?: AuthUser): boolean {
    const existing = this.repository.getQuestion(id);
    if (!existing) return false;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to delete a question');
    }
    return this.repository.deleteQuestion(id);
  }
}
