import type {
  Form,
  Formula,
} from '../types/admin.types.js';

export interface IAdminRepository {
  // Forms
  listForms(): Form[];
  getForm(id: string): Form | undefined;
  createForm(data: Omit<Form, 'form_id'>): Form;
  updateForm(id: string, data: Partial<Omit<Form, 'form_id'>>): Form | undefined;
  deleteForm(id: string): boolean;

  // Formulas
  listFormulas(): Formula[];
  getFormula(id: string): Formula | undefined;
  createFormula(data: Omit<Formula, 'formula_id'>): Formula;
  updateFormula(id: string, data: Partial<Omit<Formula, 'formula_id'>>): Formula | undefined;
  deleteFormula(id: string): boolean;
}

export class InMemoryAdminRepository implements IAdminRepository {
  private forms: Form[] = [];
  private formulas: Formula[] = [];
  private nextId = 1;

  private generateId(): string {
    return `admin-${this.nextId++}`;
  }

  // Forms
  listForms(): Form[] {
    return [...this.forms];
  }

  getForm(id: string): Form | undefined {
    return this.forms.find((f) => f.form_id === id);
  }

  createForm(data: Omit<Form, 'form_id'>): Form {
    const form: Form = {
      form_id: this.generateId(),
      ...data,
    };
    this.forms.push(form);
    return form;
  }

  updateForm(id: string, data: Partial<Omit<Form, 'form_id'>>): Form | undefined {
    const idx = this.forms.findIndex((f) => f.form_id === id);
    if (idx === -1) return undefined;
    this.forms[idx] = { ...this.forms[idx], ...data };
    return this.forms[idx];
  }

  deleteForm(id: string): boolean {
    const idx = this.forms.findIndex((f) => f.form_id === id);
    if (idx === -1) return false;
    this.forms.splice(idx, 1);
    return true;
  }

  // Formulas
  listFormulas(): Formula[] {
    return [...this.formulas];
  }

  getFormula(id: string): Formula | undefined {
    return this.formulas.find((f) => f.formula_id === id);
  }

  createFormula(data: Omit<Formula, 'formula_id'>): Formula {
    const formula: Formula = {
      formula_id: this.generateId(),
      ...data,
    };
    this.formulas.push(formula);
    return formula;
  }

  updateFormula(id: string, data: Partial<Omit<Formula, 'formula_id'>>): Formula | undefined {
    const idx = this.formulas.findIndex((f) => f.formula_id === id);
    if (idx === -1) return undefined;
    this.formulas[idx] = { ...this.formulas[idx], ...data };
    return this.formulas[idx];
  }

  deleteFormula(id: string): boolean {
    const idx = this.formulas.findIndex((f) => f.formula_id === id);
    if (idx === -1) return false;
    this.formulas.splice(idx, 1);
    return true;
  }
}
