import type { Question, CreateQuestionInput, UpdateQuestionInput } from '../types/question.types.js';

export interface IQuestionRepository {
  listQuestions(collectionId?: string): Question[];
  getQuestion(id: string): Question | undefined;
  createQuestion(data: CreateQuestionInput): Question;
  updateQuestion(id: string, data: UpdateQuestionInput): Question | undefined;
  deleteQuestion(id: string): boolean;
}

export class InMemoryQuestionRepository implements IQuestionRepository {
  private questions: Question[] = [];
  private nextId = 1;

  private generateId(): string {
    return `question-${this.nextId++}`;
  }

  listQuestions(collectionId?: string): Question[] {
    const items = collectionId
      ? this.questions.filter((q) => q.collection_id === collectionId)
      : this.questions;
    return items.map((q) => ({ ...q }));
  }

  getQuestion(id: string): Question | undefined {
    const q = this.questions.find((q) => q.question_id === id);
    return q ? { ...q } : undefined;
  }

  createQuestion(data: CreateQuestionInput): Question {
    const now = new Date().toISOString();
    const question: Question = {
      question_id: this.generateId(),
      ...data,
      created_at: now,
      updated_at: now,
    };
    this.questions.push(question);
    return { ...question };
  }

  updateQuestion(id: string, data: UpdateQuestionInput): Question | undefined {
    const idx = this.questions.findIndex((q) => q.question_id === id);
    if (idx === -1) return undefined;
    // Only apply known updatable fields, never overwrite identity fields
    const { question_id: _id, created_at: _created, updated_at: _updated, ...safeData } = data as Record<string, unknown>;
    this.questions[idx] = {
      ...this.questions[idx],
      ...safeData,
      updated_at: new Date().toISOString(),
    } as Question;
    return { ...this.questions[idx] };
  }

  deleteQuestion(id: string): boolean {
    const idx = this.questions.findIndex((q) => q.question_id === id);
    if (idx === -1) return false;
    this.questions.splice(idx, 1);
    return true;
  }
}
