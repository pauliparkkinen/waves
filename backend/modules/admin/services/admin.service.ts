import type { Section, Form, Formula } from '../types/admin.types.js';
import type { IAdminRepository } from '../repositories/admin.repository.js';

export interface IAdminService {
  getStatus(): { status: string; module: string };

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

export class AdminService implements IAdminService {
  constructor(private readonly repository: IAdminRepository) {}

  getStatus(): { status: string; module: string } {
    return { status: 'ok', module: 'admin' };
  }

  listSections(): Section[] {
    return this.repository.listSections();
  }

  getSection(id: string): Section | undefined {
    return this.repository.getSection(id);
  }

  createSection(data: Omit<Section, 'section_id'>): Section {
    return this.repository.createSection(data);
  }

  updateSection(id: string, data: Partial<Omit<Section, 'section_id'>>): Section | undefined {
    return this.repository.updateSection(id, data);
  }

  deleteSection(id: string): boolean {
    return this.repository.deleteSection(id);
  }

  listForms(): Form[] {
    return this.repository.listForms();
  }

  getForm(id: string): Form | undefined {
    return this.repository.getForm(id);
  }

  createForm(data: Omit<Form, 'form_id'>): Form {
    return this.repository.createForm(data);
  }

  updateForm(id: string, data: Partial<Omit<Form, 'form_id'>>): Form | undefined {
    return this.repository.updateForm(id, data);
  }

  deleteForm(id: string): boolean {
    return this.repository.deleteForm(id);
  }

  listFormulas(): Formula[] {
    return this.repository.listFormulas();
  }

  getFormula(id: string): Formula | undefined {
    return this.repository.getFormula(id);
  }

  createFormula(data: Omit<Formula, 'formula_id'>): Formula {
    return this.repository.createFormula(data);
  }

  updateFormula(id: string, data: Partial<Omit<Formula, 'formula_id'>>): Formula | undefined {
    return this.repository.updateFormula(id, data);
  }

  deleteFormula(id: string): boolean {
    return this.repository.deleteFormula(id);
  }
}
