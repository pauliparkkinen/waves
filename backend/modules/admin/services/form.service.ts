import type { AuthUser } from '../../../src/types/auth.types.js';
import type { Form, CreateFormInput, UpdateFormInput } from '../types/form.types.js';
import type { IFormRepository } from '../repositories/form.repository.js';
import type { ISectionRepository } from '../repositories/section.repository.js';
import type { FormSection } from '../types/admin.types.js';
import {
  validateFormInput,
  validateFormUpdateInput,
  FormValidationError,
} from '../validators/form.validator.js';

export interface IFormService {
  listForms(user?: AuthUser): Form[];
  getForm(id: string, user?: AuthUser): Form | undefined;
  createForm(data: CreateFormInput, user?: AuthUser): Form;
  updateForm(id: string, data: UpdateFormInput, user?: AuthUser): Form | undefined;
  deleteForm(id: string, user?: AuthUser): boolean;
}

export class FormService implements IFormService {
  constructor(
    private readonly formRepository: IFormRepository,
    private readonly sectionRepository: ISectionRepository,
  ) {}

  listForms(_user?: AuthUser): Form[] {
    return this.formRepository.listForms();
  }

  getForm(id: string, user?: AuthUser): Form | undefined {
    return this.formRepository.getForm(id);
  }

  createForm(data: CreateFormInput, user?: AuthUser): Form {
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to create a form');
    }
    validateFormInput(data);
    if (data.status === 'published') {
      this.validateSectionsPublished(data.form_sections);
    }
    return this.formRepository.createForm(data);
  }

  updateForm(id: string, data: UpdateFormInput, user?: AuthUser): Form | undefined {
    const existing = this.formRepository.getForm(id);
    if (!existing) return undefined;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to update a form');
    }
    validateFormUpdateInput(data);

    const hasFunctionalChanges =
      'form_sections' in data || 'formulas' in data || 'status' in data;

    const updateData = { ...data };

    if (existing.status === 'published' && hasFunctionalChanges) {
      updateData.version = existing.version + 1;
    }

    if ('form_sections' in data) {
      const resultingStatus = data.status !== undefined ? data.status : existing.status;
      if (resultingStatus === 'published') {
        this.validateSectionsPublished(data.form_sections!);
      }
    }

    return this.formRepository.updateForm(id, updateData);
  }

  deleteForm(id: string, user?: AuthUser): boolean {
    const existing = this.formRepository.getForm(id);
    if (!existing) return false;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to delete a form');
    }
    return this.formRepository.deleteForm(id);
  }

  private validateSectionsPublished(formSections: FormSection[]): void {
    const allSections = this.sectionRepository.listSections();
    const errors: { field: string; message: string }[] = [];

    formSections.forEach((fs, i) => {
      const section = allSections.find((s) => s.section_symbol === fs.section_symbol);
      if (!section) {
        errors.push({
          field: `form_sections[${i}].section_symbol`,
          message: `section_symbol "${fs.section_symbol}" does not reference an existing section`,
        });
      } else if (section.status !== 'published') {
        errors.push({
          field: `form_sections[${i}].section_symbol`,
          message: `section "${fs.section_symbol}" is not published (status: ${section.status})`,
        });
      }
    });

    if (errors.length > 0) {
      throw new FormValidationError(errors);
    }
  }
}
