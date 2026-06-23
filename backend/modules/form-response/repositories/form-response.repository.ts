import type {
  FormResponse,
  CreateFormResponseInput,
  UpdateFormResponseInput,
} from '../types/form-response.types.js';
import { FormResponseVersionConflictError } from '../types/form-response.types.js';

export interface IFormResponseRepository {
  list(groupId?: string): FormResponse[];
  listByUserId(userId: string): FormResponse[];
  listByOrganizationId(organizationId: string): FormResponse[];
  listByFillingUserId(fillingUserId: string): FormResponse[];
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

  listByUserId(userId: string): FormResponse[] {
    return this.items.filter((r) => r.user_id === userId);
  }

  listByOrganizationId(organizationId: string): FormResponse[] {
    return this.items.filter((r) => r.organization_id === organizationId);
  }

  listByFillingUserId(fillingUserId: string): FormResponse[] {
    return this.items.filter((r) => r.filling_user_id === fillingUserId);
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
      organization_id: input.organization_id,
      user_id: input.user_id,
      filling_user_id: input.filling_user_id,
      status: 'Draft',
      version: 1,
      started_timestamp: input.started_timestamp ?? now,
    };
    this.items.push(response);
    return { ...response };
  }

  update(id: string, input: UpdateFormResponseInput): FormResponse | undefined {
    const idx = this.items.findIndex((r) => r.form_response_id === id);
    if (idx === -1) return undefined;

    const current = this.items[idx];

    // Optimistic locking: check version matches
    if (current.version !== input.version) {
      throw new FormResponseVersionConflictError(id, input.version, current.version);
    }

    const { version: _version, ...rest } = input;
    const updated: FormResponse = {
      ...current,
      ...rest,
      version: current.version + 1,
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
