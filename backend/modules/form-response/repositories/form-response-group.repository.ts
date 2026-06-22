import type {
  FormResponseGroup,
  CreateFormResponseGroupInput,
  UpdateFormResponseGroupInput,
} from '../types/form-response-group.types.js';

export interface IFormResponseGroupRepository {
  list(): FormResponseGroup[];
  get(id: string): FormResponseGroup | undefined;
  create(input: CreateFormResponseGroupInput): FormResponseGroup;
  update(id: string, input: UpdateFormResponseGroupInput): FormResponseGroup | undefined;
  delete(id: string): boolean;
}

export class InMemoryFormResponseGroupRepository implements IFormResponseGroupRepository {
  private items: FormResponseGroup[] = [];
  private nextId = 1;

  private generateId(): string {
    return `frg-${this.nextId++}`;
  }

  list(): FormResponseGroup[] {
    return [...this.items];
  }

  get(id: string): FormResponseGroup | undefined {
    return this.items.find((g) => g.form_response_group_id === id);
  }

  create(_input: CreateFormResponseGroupInput): FormResponseGroup {
    const group: FormResponseGroup = {
      form_response_group_id: this.generateId(),
    };
    this.items.push(group);
    return { ...group };
  }

  update(id: string, input: UpdateFormResponseGroupInput): FormResponseGroup | undefined {
    const idx = this.items.findIndex((g) => g.form_response_group_id === id);
    if (idx === -1) return undefined;
    // Groups are currently immutable after creation; no fields to update.
    this.items[idx] = { ...this.items[idx], ...input };
    return { ...this.items[idx] };
  }

  delete(id: string): boolean {
    const idx = this.items.findIndex((g) => g.form_response_group_id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }
}
