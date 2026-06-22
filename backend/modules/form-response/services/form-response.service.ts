import type { AuthUser } from '../../../src/types/auth.types.js';
import type { FormResponseGroup, CreateFormResponseGroupInput } from '../types/form-response-group.types.js';
import type { FormResponse, CreateFormResponseInput, UpdateFormResponseInput } from '../types/form-response.types.js';
import type { QuestionResponse, CreateQuestionResponseInput, UpdateQuestionResponseInput } from '../types/question-response.types.js';
import type { IFormResponseGroupRepository } from '../repositories/form-response-group.repository.js';
import type { IFormResponseRepository } from '../repositories/form-response.repository.js';
import type { IQuestionResponseRepository } from '../repositories/question-response.repository.js';
import { validateCreateFormResponseInput, validateUpdateFormResponseInput, validateCreateQuestionResponseInput, validateUpdateQuestionResponseInput } from '../validators/form-response.validator.js';

export interface IFormResponseService {
  // Form Response Groups
  listGroups(user?: AuthUser): FormResponseGroup[];
  getGroup(id: string, user?: AuthUser): FormResponseGroup | undefined;
  createGroup(input: CreateFormResponseGroupInput, user?: AuthUser): FormResponseGroup;
  deleteGroup(id: string, user?: AuthUser): boolean;

  // Form Responses
  listResponses(groupId: string, user?: AuthUser): FormResponse[];
  getResponse(id: string, user?: AuthUser): FormResponse | undefined;
  createResponse(input: CreateFormResponseInput, user?: AuthUser): FormResponse;
  updateResponse(id: string, input: UpdateFormResponseInput, user?: AuthUser): FormResponse | undefined;
  deleteResponse(id: string, user?: AuthUser): boolean;

  // Question Responses
  listQuestionResponses(formResponseId: string, user?: AuthUser): QuestionResponse[];
  getQuestionResponse(id: string, user?: AuthUser): QuestionResponse | undefined;
  getQuestionResponseBySymbol(formResponseId: string, questionSymbol: string, user?: AuthUser): QuestionResponse | undefined;
  createQuestionResponse(input: CreateQuestionResponseInput, user?: AuthUser): QuestionResponse;
  upsertQuestionResponse(input: CreateQuestionResponseInput, user?: AuthUser): QuestionResponse;
  updateQuestionResponse(id: string, input: UpdateQuestionResponseInput, user?: AuthUser): QuestionResponse | undefined;
  deleteQuestionResponse(id: string, user?: AuthUser): boolean;
}

export class FormResponseService implements IFormResponseService {
  constructor(
    private readonly groupRepository: IFormResponseGroupRepository,
    private readonly formResponseRepository: IFormResponseRepository,
    private readonly questionResponseRepository: IQuestionResponseRepository,
  ) {}

  // ---- Form Response Groups ----

  listGroups(_user?: AuthUser): FormResponseGroup[] {
    return this.groupRepository.list();
  }

  getGroup(id: string, _user?: AuthUser): FormResponseGroup | undefined {
    return this.groupRepository.get(id);
  }

  createGroup(input: CreateFormResponseGroupInput, user?: AuthUser): FormResponseGroup {
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to create a form response group');
    }
    return this.groupRepository.create(input);
  }

  deleteGroup(id: string, user?: AuthUser): boolean {
    const existing = this.groupRepository.get(id);
    if (!existing) return false;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to delete a form response group');
    }
    // Cascade-delete all form responses and their question responses within the group
    const responses = this.formResponseRepository.list(id);
    for (const response of responses) {
      this.questionResponseRepository.deleteByFormResponse(response.form_response_id);
    }
    for (const response of responses) {
      this.formResponseRepository.delete(response.form_response_id);
    }
    return this.groupRepository.delete(id);
  }

  // ---- Form Responses ----

  listResponses(groupId: string, _user?: AuthUser): FormResponse[] {
    return this.formResponseRepository.list(groupId);
  }

  getResponse(id: string, _user?: AuthUser): FormResponse | undefined {
    return this.formResponseRepository.get(id);
  }

  createResponse(input: CreateFormResponseInput, user?: AuthUser): FormResponse {
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to create a form response');
    }
    validateCreateFormResponseInput(input);
    return this.formResponseRepository.create(input);
  }

  updateResponse(id: string, input: UpdateFormResponseInput, user?: AuthUser): FormResponse | undefined {
    const existing = this.formResponseRepository.get(id);
    if (!existing) return undefined;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to update a form response');
    }
    validateUpdateFormResponseInput(input);
    return this.formResponseRepository.update(id, input);
  }

  deleteResponse(id: string, user?: AuthUser): boolean {
    const existing = this.formResponseRepository.get(id);
    if (!existing) return false;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to delete a form response');
    }
    this.questionResponseRepository.deleteByFormResponse(id);
    return this.formResponseRepository.delete(id);
  }

  // ---- Question Responses ----

  listQuestionResponses(formResponseId: string, _user?: AuthUser): QuestionResponse[] {
    return this.questionResponseRepository.listByFormResponse(formResponseId);
  }

  getQuestionResponse(id: string, _user?: AuthUser): QuestionResponse | undefined {
    return this.questionResponseRepository.get(id);
  }

  getQuestionResponseBySymbol(formResponseId: string, questionSymbol: string, _user?: AuthUser): QuestionResponse | undefined {
    return this.questionResponseRepository.getByFormResponseAndSymbol(formResponseId, questionSymbol);
  }

  createQuestionResponse(input: CreateQuestionResponseInput, user?: AuthUser): QuestionResponse {
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to create a question response');
    }
    validateCreateQuestionResponseInput(input);
    return this.questionResponseRepository.create(input);
  }

  upsertQuestionResponse(input: CreateQuestionResponseInput, user?: AuthUser): QuestionResponse {
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to upsert a question response');
    }
    validateCreateQuestionResponseInput(input);
    return this.questionResponseRepository.upsert(input);
  }

  updateQuestionResponse(id: string, input: UpdateQuestionResponseInput, user?: AuthUser): QuestionResponse | undefined {
    const existing = this.questionResponseRepository.get(id);
    if (!existing) return undefined;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to update a question response');
    }
    validateUpdateQuestionResponseInput(input);
    return this.questionResponseRepository.update(id, input);
  }

  deleteQuestionResponse(id: string, user?: AuthUser): boolean {
    const existing = this.questionResponseRepository.get(id);
    if (!existing) return false;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to delete a question response');
    }
    return this.questionResponseRepository.delete(id);
  }
}
