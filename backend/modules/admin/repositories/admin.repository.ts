import type {
  Section,
  Form,
  Formula,
} from '../types/admin.types.js';

export interface IAdminRepository {
  // Sections
  listSections(): Section[];
  getSection(id: string): Section | undefined;
  createSection(data: Omit<Section, 'section_id'>): Section;
  updateSection(id: string, data: Partial<Omit<Section, 'section_id'>>): Section | undefined;
  deleteSection(id: string): boolean;

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
  private sections: Section[] = [];
  private forms: Form[] = [];
  private formulas: Formula[] = [];
  private nextId = 1;

  private generateId(): string {
    return `admin-${this.nextId++}`;
  }

  // Sections
  listSections(): Section[] {
    return [...this.sections];
  }

  getSection(id: string): Section | undefined {
    return this.sections.find((s) => s.section_id === id);
  }

  createSection(data: Omit<Section, 'section_id'>): Section {
    const section: Section = {
      section_id: this.generateId(),
      ...data,
    };
    this.sections.push(section);
    return section;
  }

  updateSection(id: string, data: Partial<Omit<Section, 'section_id'>>): Section | undefined {
    const idx = this.sections.findIndex((s) => s.section_id === id);
    if (idx === -1) return undefined;
    this.sections[idx] = { ...this.sections[idx], ...data };
    return this.sections[idx];
  }

  deleteSection(id: string): boolean {
    const idx = this.sections.findIndex((s) => s.section_id === id);
    if (idx === -1) return false;
    this.sections.splice(idx, 1);
    return true;
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
