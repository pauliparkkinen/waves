import type { AuthUser } from '../../../src/types/auth.types.js';
import type { Section, CreateSectionInput, UpdateSectionInput } from '../types/section.types.js';
import type { ISectionRepository } from '../repositories/section.repository.js';
import type { IQuestionRepository } from '../repositories/question.repository.js';
import {
  validateSectionInput,
  validateSectionUpdateInput,
  SectionValidationError,
} from '../validators/section.validator.js';

export interface ISectionService {
  listSections(user?: AuthUser): Section[];
  getSection(id: string, user?: AuthUser): Section | undefined;
  createSection(data: CreateSectionInput, user?: AuthUser): Section;
  updateSection(id: string, data: UpdateSectionInput, user?: AuthUser): Section | undefined;
  deleteSection(id: string, user?: AuthUser): boolean;
}

export class SectionService implements ISectionService {
  constructor(
    private readonly sectionRepository: ISectionRepository,
    private readonly questionRepository: IQuestionRepository,
  ) {}

  listSections(_user?: AuthUser): Section[] {
    return this.sectionRepository.listSections();
  }

  getSection(id: string, user?: AuthUser): Section | undefined {
    return this.sectionRepository.getSection(id);
  }

  createSection(data: CreateSectionInput, user?: AuthUser): Section {
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to create a section');
    }
    validateSectionInput(data);
    this.validateQuestionReferences(data.section_questions);
    return this.sectionRepository.createSection(data);
  }

  updateSection(id: string, data: UpdateSectionInput, user?: AuthUser): Section | undefined {
    const existing = this.sectionRepository.getSection(id);
    if (!existing) return undefined;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to update a section');
    }
    validateSectionUpdateInput(data);
    if (data.section_questions) {
      this.validateQuestionReferences(data.section_questions);
    }
    return this.sectionRepository.updateSection(id, data);
  }

  deleteSection(id: string, user?: AuthUser): boolean {
    const existing = this.sectionRepository.getSection(id);
    if (!existing) return false;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to delete a section');
    }
    return this.sectionRepository.deleteSection(id);
  }

  private validateQuestionReferences(sectionQuestions: { question_symbol: string }[]): void {
    const allQuestions = this.questionRepository.listQuestions();
    const existingSymbols = new Set(allQuestions.map((q) => q.question_symbol));
    const errors: { field: string; message: string }[] = [];

    sectionQuestions.forEach((sq, i) => {
      if (!existingSymbols.has(sq.question_symbol)) {
        errors.push({
          field: `section_questions[${i}].question_symbol`,
          message: `question_symbol "${sq.question_symbol}" does not reference an existing question`,
        });
      }
    });

    if (errors.length > 0) {
      throw new SectionValidationError(errors);
    }
  }
}
