import { describe, it, expect, vi } from 'vitest';
import { FormService } from '../../services/form.service.js';
import type { IFormRepository } from '../../repositories/form.repository.js';
import type { ISectionRepository } from '../../repositories/section.repository.js';
import type { Form, CreateFormInput, UpdateFormInput } from '../../types/form.types.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';
import { FormValidationError } from '../../validators/form.validator.js';

function makeFormRepository(overrides: Partial<IFormRepository> = {}): IFormRepository {
  return {
    listForms: vi.fn().mockReturnValue([]),
    getForm: vi.fn().mockReturnValue(undefined),
    createForm: vi.fn().mockReturnValue({
      form_id: 'form-1',
      collection_id: 'col-1',
      form_symbol: 'form-1',
      version: 1,
      status: 'draft',
      form_sections: [],
      formulas: [],
      form_organisations: [],
      translations: [],
    }),
    updateForm: vi.fn().mockReturnValue(undefined),
    deleteForm: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

function makeSectionRepository(overrides: Partial<ISectionRepository> = {}): ISectionRepository {
  return {
    listSections: vi.fn().mockReturnValue([]),
    getSection: vi.fn().mockReturnValue(undefined),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    ...overrides,
  };
}

const adminUser: AuthUser = { sub: 'admin', permissions: ['admin:manage'] };
const orgUser: AuthUser = { sub: 'org-user', permissions: [], organisation_id: 'org-1' };

const sampleForm: Form = {
  form_id: 'form-1',
  collection_id: 'col-1',
  form_symbol: 'form-1',
  version: 1,
  status: 'draft',
  form_sections: [
    { section_symbol: 'sec-1', version_number: 1, order_number: 0 },
  ],
  formulas: [],
  form_organisations: [],
  translations: [],
};

const publishedSection = {
  section_id: 'section-1',
  section_symbol: 'sec-1',
  version: 1,
  status: 'published' as const,
  condition_formula_id: undefined,
  section_questions: [],
  translations: [],
};

const draftSection = {
  section_id: 'section-2',
  section_symbol: 'sec-2',
  version: 1,
  status: 'draft' as const,
  condition_formula_id: undefined,
  section_questions: [],
  translations: [],
};

describe('FormService', () => {
  describe('listForms', () => {
    it('given admin user, when called, then it returns forms from repository', () => {
      const forms: Form[] = [sampleForm];
      const formRepo = makeFormRepository({ listForms: vi.fn().mockReturnValue(forms) });
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);

      const result = service.listForms(adminUser);

      expect(result).toEqual(forms);
      expect(formRepo.listForms).toHaveBeenCalled();
    });

    it('given non-admin user, then it still returns forms', () => {
      const forms: Form[] = [sampleForm];
      const formRepo = makeFormRepository({ listForms: vi.fn().mockReturnValue(forms) });
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);

      const result = service.listForms(orgUser);

      expect(result).toEqual(forms);
    });
  });

  describe('getForm', () => {
    it('given the form exists, then it returns the form', () => {
      const formRepo = makeFormRepository({ getForm: vi.fn().mockReturnValue(sampleForm) });
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);

      const result = service.getForm('form-1');

      expect(result).toEqual(sampleForm);
    });

    it('given the form does not exist, then it returns undefined', () => {
      const formRepo = makeFormRepository({ getForm: vi.fn().mockReturnValue(undefined) });
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);

      const result = service.getForm('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('createForm', () => {
    it('given admin user with valid data, then it validates and calls repository', () => {
      const formRepo = makeFormRepository({ createForm: vi.fn().mockReturnValue(sampleForm) });
      const sectionRepo = makeSectionRepository({
        listSections: vi.fn().mockReturnValue([publishedSection]),
      });
      const service = new FormService(formRepo, sectionRepo);
      const validData: CreateFormInput = {
        collection_id: 'col-1',
        form_symbol: 'form-1',
        version: 1,
        status: 'draft',
        form_sections: [
          { section_symbol: 'sec-1', version_number: 1, order_number: 0 },
        ],
        formulas: [],
        form_organisations: [],
        translations: [],
      };

      const result = service.createForm(validData, adminUser);

      expect(result).toEqual(sampleForm);
      expect(formRepo.createForm).toHaveBeenCalledWith(validData);
    });

    it('given non-admin user, then it throws Insufficient permissions error', () => {
      const formRepo = makeFormRepository();
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);
      const data: CreateFormInput = {
        collection_id: 'col-1',
        form_symbol: 'form-1',
        version: 1,
        status: 'draft',
        form_sections: [],
        formulas: [],
        form_organisations: [],
        translations: [],
      };

      expect(() => service.createForm(data, orgUser)).toThrow(
        'Insufficient permissions: admin:manage required to create a form',
      );
    });

    it('given published form with non-published sections, then it throws FormValidationError', () => {
      const formRepo = makeFormRepository();
      const sectionRepo = makeSectionRepository({
        listSections: vi.fn().mockReturnValue([draftSection]),
      });
      const service = new FormService(formRepo, sectionRepo);
      const data: CreateFormInput = {
        collection_id: 'col-1',
        form_symbol: 'form-1',
        version: 1,
        status: 'published',
        form_sections: [
          { section_symbol: 'sec-2', version_number: 1, order_number: 0 },
        ],
        formulas: [],
        form_organisations: [],
        translations: [],
      };

      expect(() => service.createForm(data, adminUser)).toThrow(FormValidationError);
    });
  });

  describe('updateForm', () => {
    it('given admin user with valid data and form exists, then it validates and returns updated form', () => {
      const updated = { ...sampleForm, form_symbol: 'updated-form' };
      const formRepo = makeFormRepository({
        getForm: vi.fn().mockReturnValue(sampleForm),
        updateForm: vi.fn().mockReturnValue(updated),
      });
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);
      const updateData: UpdateFormInput = { form_symbol: 'updated-form' };

      const result = service.updateForm('form-1', updateData, adminUser);

      expect(result).toEqual(updated);
      expect(formRepo.updateForm).toHaveBeenCalledWith('form-1', updateData);
    });

    it('given non-existent form, then it returns undefined', () => {
      const formRepo = makeFormRepository({ getForm: vi.fn().mockReturnValue(undefined) });
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);

      const result = service.updateForm('nonexistent', {}, adminUser);

      expect(result).toBeUndefined();
    });

    it('given non-admin user, then it throws Insufficient permissions error', () => {
      const formRepo = makeFormRepository({
        getForm: vi.fn().mockReturnValue(sampleForm),
      });
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);

      expect(() => service.updateForm('form-1', {}, orgUser)).toThrow(
        'Insufficient permissions: admin:manage required to update a form',
      );
    });

    it('given published form with functional changes, then it increments version', () => {
      const publishedForm: Form = {
        ...sampleForm,
        status: 'published',
        version: 2,
      };
      const newFormSections = [
        { section_symbol: 'sec-1', version_number: 2, order_number: 0 },
      ];
      const updateData: UpdateFormInput = { form_sections: newFormSections };
      const updatedForm: Form = {
        ...publishedForm,
        ...updateData,
        version: 3,
      };
      const formRepo = makeFormRepository({
        getForm: vi.fn().mockReturnValue(publishedForm),
        updateForm: vi.fn().mockReturnValue(updatedForm),
      });
      const sectionRepo = makeSectionRepository({
        listSections: vi.fn().mockReturnValue([publishedSection]),
      });
      const service = new FormService(formRepo, sectionRepo);

      const result = service.updateForm('form-1', updateData, adminUser);

      expect(result).toBeDefined();
      expect(result!.version).toBe(3);
      expect(formRepo.updateForm).toHaveBeenCalledWith('form-1', {
        form_sections: newFormSections,
        version: 3,
      });
    });

    it('given draft form update, then it does not change version', () => {
      const formRepo = makeFormRepository({
        getForm: vi.fn().mockReturnValue(sampleForm),
        updateForm: vi.fn().mockReturnValue({ ...sampleForm, form_symbol: 'updated-form' }),
      });
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);

      const result = service.updateForm('form-1', { form_symbol: 'updated-form' }, adminUser);

      expect(result).toBeDefined();
      expect(formRepo.updateForm).toHaveBeenCalledWith('form-1', { form_symbol: 'updated-form' });
    });
  });

  describe('deleteForm', () => {
    it('given admin user with existing form, then it deletes and returns true', () => {
      const formRepo = makeFormRepository({
        getForm: vi.fn().mockReturnValue(sampleForm),
        deleteForm: vi.fn().mockReturnValue(true),
      });
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);

      const result = service.deleteForm('form-1', adminUser);

      expect(result).toBe(true);
      expect(formRepo.deleteForm).toHaveBeenCalledWith('form-1');
    });

    it('given the form does not exist, then it returns false', () => {
      const formRepo = makeFormRepository({ getForm: vi.fn().mockReturnValue(undefined) });
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);

      const result = service.deleteForm('nonexistent', adminUser);

      expect(result).toBe(false);
    });

    it('given non-admin user, then it throws Insufficient permissions error', () => {
      const formRepo = makeFormRepository({
        getForm: vi.fn().mockReturnValue(sampleForm),
      });
      const sectionRepo = makeSectionRepository();
      const service = new FormService(formRepo, sectionRepo);

      expect(() => service.deleteForm('form-1', orgUser)).toThrow(
        'Insufficient permissions: admin:manage required to delete a form',
      );
    });
  });
});
