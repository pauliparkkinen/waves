import { describe, it, expect, vi } from 'vitest';
import { SectionService } from '../../services/section.service.js';
import type { ISectionRepository } from '../../repositories/section.repository.js';
import type { IQuestionRepository } from '../../repositories/question.repository.js';
import type { Section, CreateSectionInput, UpdateSectionInput } from '../../types/section.types.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';
import { SectionValidationError } from '../../validators/section.validator.js';

function makeSectionRepository(overrides: Partial<ISectionRepository> = {}): ISectionRepository {
  return {
    listSections: vi.fn().mockReturnValue([]),
    getSection: vi.fn().mockReturnValue(undefined),
    createSection: vi.fn().mockReturnValue({
      section_id: 'section-1',
      section_symbol: 'sec-1',
      collection_id: 'col-1',
      version: 1,
      status: 'draft',
      condition_formula_id: undefined,
      section_questions: [],
      translations: [],
    }),
    updateSection: vi.fn().mockReturnValue(undefined),
    deleteSection: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

function makeQuestionRepository(overrides: Partial<IQuestionRepository> = {}): IQuestionRepository {
  return {
    listQuestions: vi.fn().mockReturnValue([]),
    getQuestion: vi.fn().mockReturnValue(undefined),
    createQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    ...overrides,
  };
}

const adminUser: AuthUser = { sub: 'admin', permissions: ['admin:manage'] };
const orgUser: AuthUser = { sub: 'org-user', permissions: [], organisation_id: 'org-1' };

const sampleSection: Section = {
  section_id: 'section-1',
  section_symbol: 'sec-1',
  collection_id: 'col-1',
  version: 1,
  status: 'draft',
  condition_formula_id: undefined,
  section_questions: [
    { question_symbol: 'q1', version_number: 1, order_number: 0, required: true },
  ],
  translations: [],
};

describe('SectionService', () => {
  describe('listSections', () => {
    it('given admin user, when called, then it returns sections from repository', () => {
      const sections: Section[] = [sampleSection];
      const sectionRepo = makeSectionRepository({ listSections: vi.fn().mockReturnValue(sections) });
      const questionRepo = makeQuestionRepository();
      const service = new SectionService(sectionRepo, questionRepo);

      const result = service.listSections(adminUser);

      expect(result).toEqual(sections);
      expect(sectionRepo.listSections).toHaveBeenCalled();
    });

    it('given non-admin user, then it still returns sections (no strict filtering)', () => {
      const sections: Section[] = [sampleSection];
      const sectionRepo = makeSectionRepository({ listSections: vi.fn().mockReturnValue(sections) });
      const questionRepo = makeQuestionRepository();
      const service = new SectionService(sectionRepo, questionRepo);

      const result = service.listSections(orgUser);

      expect(result).toEqual(sections);
    });
  });

  describe('getSection', () => {
    it('given the section exists, then it returns the section', () => {
      const sectionRepo = makeSectionRepository({ getSection: vi.fn().mockReturnValue(sampleSection) });
      const questionRepo = makeQuestionRepository();
      const service = new SectionService(sectionRepo, questionRepo);

      const result = service.getSection('section-1');

      expect(result).toEqual(sampleSection);
    });

    it('given the section does not exist, then it returns undefined', () => {
      const sectionRepo = makeSectionRepository({ getSection: vi.fn().mockReturnValue(undefined) });
      const questionRepo = makeQuestionRepository();
      const service = new SectionService(sectionRepo, questionRepo);

      const result = service.getSection('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('createSection', () => {
    it('given admin user with valid data, then it validates question refs and calls repository', () => {
      const sectionRepo = makeSectionRepository({ createSection: vi.fn().mockReturnValue(sampleSection) });
      const questionRepo = makeQuestionRepository({
        listQuestions: vi.fn().mockReturnValue([
          { question_symbol: 'q1', collection_id: 'col-1', type: 'free-text', version: 1, parameters: {}, created_at: '', updated_at: '', translations: [] },
        ]),
      });
      const service = new SectionService(sectionRepo, questionRepo);
      const validData: CreateSectionInput = {
        section_symbol: 'sec-1',
        collection_id: 'col-1',
        version: 1,
        status: 'draft',
        section_questions: [
          { question_symbol: 'q1', version_number: 1, order_number: 0, required: true },
        ],
        translations: [],
      };

      const result = service.createSection(validData, adminUser);

      expect(result).toEqual(sampleSection);
      expect(sectionRepo.createSection).toHaveBeenCalledWith(validData);
    });

    it('given admin user with invalid question references, then it throws SectionValidationError', () => {
      const sectionRepo = makeSectionRepository();
      const questionRepo = makeQuestionRepository({
        listQuestions: vi.fn().mockReturnValue([]),
      });
      const service = new SectionService(sectionRepo, questionRepo);
      const data: CreateSectionInput = {
        section_symbol: 'sec-1',
        collection_id: 'col-1',
        version: 1,
        status: 'draft',
        section_questions: [
          { question_symbol: 'nonexistent-q', version_number: 1, order_number: 0, required: true },
        ],
        translations: [],
      };

      expect(() => service.createSection(data, adminUser)).toThrow(SectionValidationError);
    });

    it('given non-admin user, then it throws Insufficient permissions error', () => {
      const sectionRepo = makeSectionRepository();
      const questionRepo = makeQuestionRepository();
      const service = new SectionService(sectionRepo, questionRepo);
      const data: CreateSectionInput = {
        section_symbol: 'sec-1',
        collection_id: 'col-1',
        version: 1,
        status: 'draft',
        section_questions: [
          { question_symbol: 'q1', version_number: 1, order_number: 0, required: true },
        ],
        translations: [],
      };

      expect(() => service.createSection(data, orgUser)).toThrow(
        'Insufficient permissions: admin:manage required to create a section',
      );
    });
  });

  describe('updateSection', () => {
    it('given admin user with valid data and section exists, then it validates and returns updated section', () => {
      const updated = { ...sampleSection, section_symbol: 'updated-sec' };
      const sectionRepo = makeSectionRepository({
        getSection: vi.fn().mockReturnValue(sampleSection),
        updateSection: vi.fn().mockReturnValue(updated),
      });
      const questionRepo = makeQuestionRepository();
      const service = new SectionService(sectionRepo, questionRepo);
      const updateData: UpdateSectionInput = { section_symbol: 'updated-sec' };

      const result = service.updateSection('section-1', updateData, adminUser);

      expect(result).toEqual(updated);
      expect(sectionRepo.updateSection).toHaveBeenCalledWith('section-1', updateData);
    });

    it('given admin user with section_questions in update, then it validates question references', () => {
      const sectionRepo = makeSectionRepository({
        getSection: vi.fn().mockReturnValue(sampleSection),
        updateSection: vi.fn().mockReturnValue(sampleSection),
      });
      const questionRepo = makeQuestionRepository({
        listQuestions: vi.fn().mockReturnValue([
          { question_symbol: 'q1', collection_id: 'col-1', type: 'free-text', version: 1, parameters: {}, created_at: '', updated_at: '', translations: [] },
        ]),
      });
      const service = new SectionService(sectionRepo, questionRepo);
      const updateData: UpdateSectionInput = {
        section_questions: [
          { question_symbol: 'q1', version_number: 1, order_number: 0, required: true },
        ],
      };

      const result = service.updateSection('section-1', updateData, adminUser);

      expect(result).toEqual(sampleSection);
      expect(questionRepo.listQuestions).toHaveBeenCalled();
    });

    it('given admin user with invalid question references in update, then it throws SectionValidationError', () => {
      const sectionRepo = makeSectionRepository({
        getSection: vi.fn().mockReturnValue(sampleSection),
      });
      const questionRepo = makeQuestionRepository({
        listQuestions: vi.fn().mockReturnValue([]),
      });
      const service = new SectionService(sectionRepo, questionRepo);
      const updateData: UpdateSectionInput = {
        section_questions: [
          { question_symbol: 'nonexistent-q', version_number: 1, order_number: 0, required: true },
        ],
      };

      expect(() => service.updateSection('section-1', updateData, adminUser)).toThrow(SectionValidationError);
    });

    it('given the section does not exist, then it returns undefined', () => {
      const sectionRepo = makeSectionRepository({ getSection: vi.fn().mockReturnValue(undefined) });
      const questionRepo = makeQuestionRepository();
      const service = new SectionService(sectionRepo, questionRepo);

      const result = service.updateSection('nonexistent', {}, adminUser);

      expect(result).toBeUndefined();
    });

    it('given non-admin user, then it throws Insufficient permissions error', () => {
      const sectionRepo = makeSectionRepository({
        getSection: vi.fn().mockReturnValue(sampleSection),
      });
      const questionRepo = makeQuestionRepository();
      const service = new SectionService(sectionRepo, questionRepo);

      expect(() => service.updateSection('section-1', {}, orgUser)).toThrow(
        'Insufficient permissions: admin:manage required to update a section',
      );
    });
  });

  describe('deleteSection', () => {
    it('given admin user with existing section, then it deletes and returns true', () => {
      const sectionRepo = makeSectionRepository({
        getSection: vi.fn().mockReturnValue(sampleSection),
        deleteSection: vi.fn().mockReturnValue(true),
      });
      const questionRepo = makeQuestionRepository();
      const service = new SectionService(sectionRepo, questionRepo);

      const result = service.deleteSection('section-1', adminUser);

      expect(result).toBe(true);
      expect(sectionRepo.deleteSection).toHaveBeenCalledWith('section-1');
    });

    it('given the section does not exist, then it returns false', () => {
      const sectionRepo = makeSectionRepository({ getSection: vi.fn().mockReturnValue(undefined) });
      const questionRepo = makeQuestionRepository();
      const service = new SectionService(sectionRepo, questionRepo);

      const result = service.deleteSection('nonexistent', adminUser);

      expect(result).toBe(false);
    });

    it('given non-admin user, then it throws Insufficient permissions error', () => {
      const sectionRepo = makeSectionRepository({
        getSection: vi.fn().mockReturnValue(sampleSection),
      });
      const questionRepo = makeQuestionRepository();
      const service = new SectionService(sectionRepo, questionRepo);

      expect(() => service.deleteSection('section-1', orgUser)).toThrow(
        'Insufficient permissions: admin:manage required to delete a section',
      );
    });
  });
});
