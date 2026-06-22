import type {
  QuestionResponse,
  CreateQuestionResponseInput,
  UpdateQuestionResponseInput,
} from '../types/question-response.types.js';

export interface IQuestionResponseRepository {
  listByFormResponse(formResponseId: string): QuestionResponse[];
  get(id: string): QuestionResponse | undefined;
  getByFormResponseAndSymbol(
    formResponseId: string,
    questionSymbol: string,
  ): QuestionResponse | undefined;
  create(input: CreateQuestionResponseInput): QuestionResponse;
  update(id: string, input: UpdateQuestionResponseInput): QuestionResponse | undefined;
  upsert(input: CreateQuestionResponseInput): QuestionResponse;
  delete(id: string): boolean;
  deleteByFormResponse(formResponseId: string): void;
}

export class InMemoryQuestionResponseRepository implements IQuestionResponseRepository {
  private items: QuestionResponse[] = [];
  private nextId = 1;

  private generateId(): string {
    return `qr-${this.nextId++}`;
  }

  listByFormResponse(formResponseId: string): QuestionResponse[] {
    return this.items.filter((qr) => qr.form_response_id === formResponseId);
  }

  get(id: string): QuestionResponse | undefined {
    return this.items.find((qr) => qr.question_response_id === id);
  }

  getByFormResponseAndSymbol(
    formResponseId: string,
    questionSymbol: string,
  ): QuestionResponse | undefined {
    return this.items.find(
      (qr) => qr.form_response_id === formResponseId && qr.question_symbol === questionSymbol,
    );
  }

  create(input: CreateQuestionResponseInput): QuestionResponse {
    const response: QuestionResponse = {
      question_response_id: this.generateId(),
      form_response_id: input.form_response_id,
      collection_id: input.collection_id,
      question_symbol: input.question_symbol,
      question_version: input.question_version,
      response_value_text: input.response_value_text,
      response_value_number: input.response_value_number,
      response_value_boolean: input.response_value_boolean,
    };
    this.items.push(response);
    return { ...response };
  }

  update(id: string, input: UpdateQuestionResponseInput): QuestionResponse | undefined {
    const idx = this.items.findIndex((qr) => qr.question_response_id === id);
    if (idx === -1) return undefined;

    const current = this.items[idx];
    const updated: QuestionResponse = {
      ...current,
      ...input,
    };
    this.items[idx] = updated;
    return { ...updated };
  }

  upsert(input: CreateQuestionResponseInput): QuestionResponse {
    const existing = this.getByFormResponseAndSymbol(
      input.form_response_id,
      input.question_symbol,
    );
    if (existing) {
      const updated = this.update(existing.question_response_id, {
        response_value_text: input.response_value_text,
        response_value_number: input.response_value_number,
        response_value_boolean: input.response_value_boolean,
      });
      return updated!;
    }
    return this.create(input);
  }

  delete(id: string): boolean {
    const idx = this.items.findIndex((qr) => qr.question_response_id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }

  deleteByFormResponse(formResponseId: string): void {
    this.items = this.items.filter((qr) => qr.form_response_id !== formResponseId);
  }
}
