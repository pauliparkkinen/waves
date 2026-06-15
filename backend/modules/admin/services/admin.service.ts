import type { Collection, Question, Section, Form, Formula } from '../types/admin.types.js';
import type { IAdminRepository } from '../repositories/admin.repository.js';

export interface IAdminService {
  getStatus(): { status: string; module: string };

  // Collections
  listCollections(): Collection[];
  getCollection(id: string): Collection | undefined;
  createCollection(data: Omit<Collection, 'collection_id'>): Collection;
  updateCollection(
    id: string,
    data: Partial<Omit<Collection, 'collection_id'>>
  ): Collection | undefined;
  deleteCollection(id: string): boolean;

  // Questions
  listQuestions(collectionId?: string): Question[];
  getQuestion(id: string): Question | undefined;
  createQuestion(data: Omit<Question, 'question_id' | 'created_at' | 'updated_at'>): Question;
  updateQuestion(
    id: string,
    data: Partial<Omit<Question, 'question_id' | 'created_at' | 'updated_at'>>
  ): Question | undefined;
  deleteQuestion(id: string): boolean;

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

  listCollections(): Collection[] {
    return this.repository.listCollections();
  }

  getCollection(id: string): Collection | undefined {
    return this.repository.getCollection(id);
  }

  createCollection(data: Omit<Collection, 'collection_id'>): Collection {
    return this.repository.createCollection(data);
  }

  updateCollection(
    id: string,
    data: Partial<Omit<Collection, 'collection_id'>>
  ): Collection | undefined {
    return this.repository.updateCollection(id, data);
  }

  deleteCollection(id: string): boolean {
    return this.repository.deleteCollection(id);
  }

  listQuestions(collectionId?: string): Question[] {
    return this.repository.listQuestions(collectionId);
  }

  getQuestion(id: string): Question | undefined {
    return this.repository.getQuestion(id);
  }

  createQuestion(data: Omit<Question, 'question_id' | 'created_at' | 'updated_at'>): Question {
    return this.repository.createQuestion(data);
  }

  updateQuestion(
    id: string,
    data: Partial<Omit<Question, 'question_id' | 'created_at' | 'updated_at'>>
  ): Question | undefined {
    return this.repository.updateQuestion(id, data);
  }

  deleteQuestion(id: string): boolean {
    return this.repository.deleteQuestion(id);
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
