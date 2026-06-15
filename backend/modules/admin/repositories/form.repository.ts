import type { Form, CreateFormInput, UpdateFormInput } from '../types/form.types.js';

export interface IFormRepository {
  listForms(): Form[];
  getForm(id: string): Form | undefined;
  createForm(data: CreateFormInput): Form;
  updateForm(id: string, data: UpdateFormInput): Form | undefined;
  deleteForm(id: string): boolean;
}

export class InMemoryFormRepository implements IFormRepository {
  private forms: Form[] = [];
  private nextId = 1;

  private generateId(): string {
    return `form-${this.nextId++}`;
  }

  listForms(): Form[] {
    return this.forms.map((f) => ({ ...f }));
  }

  getForm(id: string): Form | undefined {
    const f = this.forms.find((f) => f.form_id === id);
    return f ? { ...f } : undefined;
  }

  createForm(data: CreateFormInput): Form {
    const form: Form = {
      form_id: this.generateId(),
      ...data,
    };
    this.forms.push(form);
    return { ...form };
  }

  updateForm(id: string, data: UpdateFormInput): Form | undefined {
    const idx = this.forms.findIndex((f) => f.form_id === id);
    if (idx === -1) return undefined;
    const { form_id: _id, ...safeData } = data as Record<string, unknown>;
    this.forms[idx] = {
      ...this.forms[idx],
      ...safeData,
    } as Form;
    return { ...this.forms[idx] };
  }

  deleteForm(id: string): boolean {
    const idx = this.forms.findIndex((f) => f.form_id === id);
    if (idx === -1) return false;
    this.forms.splice(idx, 1);
    return true;
  }
}
