import type {
  FormResponse,
  CreateFormResponseInput,
  UpdateFormResponseInput,
} from '../types/form-response.types.js';

export interface IFormResponseRepository {
  list(groupId?: string): FormResponse[];
  get(id: string): FormResponse | undefined;
  create(input: CreateFormResponseInput): FormResponse;
  update(id: string, input: UpdateFormResponseInput): FormResponse | undefined;
  delete(id: string): boolean;
}

export class InMemoryFormResponseRepository implements IFormResponseRepository {
  private items: FormResponse[] = [];
  private nextId = 1;

  private generateId(): string {
    return `fr-${this.nextId++}`;
  }

  list(groupId?: string): FormResponse[] {
    let results = [...this.items];
    if (groupId) {
      results = results.filter((r) => r.form_response_group_id === groupId);
    }
    return results;
  }

  get(id: string): FormResponse | undefined {
    return this.items.find((r) => r.form_response_id === id);
  }

  create(input: CreateFormResponseInput): FormResponse {
    const now = new Date().toISOString();
    const response: FormResponse = {
      form_response_id: this.generateId(),
      form_response_group_id: input.form_response_group_id,
      collection_id: input.collection_id,
      form_symbol: input.form_symbol,
      form_version: input.form_version,
      user_id: input.user_id,
      filling_user_id: input.filling_user_id,
      status: 'Draft',
      started_timestamp: input.started_timestamp ?? now,
    };
    this.items.push(response);
    return { ...response };
  }

  update(id: string, input: UpdateFormResponseInput): FormResponse | undefined {
    const idx = this.items.findIndex((r) => r.form_response_id === id);
    if (idx === -1) return undefined;

    const current = this.items[idx];
    const updated: FormResponse = {
      ...current,
      ...input,
    };
    this.items[idx] = updated;
    return { ...updated };
  }

  delete(id: string): boolean {
    const idx = this.items.findIndex((r) => r.form_response_id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }
}
