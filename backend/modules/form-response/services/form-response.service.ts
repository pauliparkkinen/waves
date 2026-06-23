import type { AuthUser } from '../../../src/types/auth.types.js';
import type { FormResponseGroup, CreateFormResponseGroupInput } from '../types/form-response-group.types.js';
import type {
  FormResponse,
  CreateFormResponseInput,
  UpdateFormResponseInput,
} from '../types/form-response.types.js';
import {
  FormResponseImmutabilityError,
  FormResponseSubmissionError,
  FormResponseAuthorizationError,
} from '../types/form-response.types.js';
import type { QuestionResponse, CreateQuestionResponseInput, UpdateQuestionResponseInput } from '../types/question-response.types.js';
import type { IFormResponseGroupRepository } from '../repositories/form-response-group.repository.js';
import type { IFormResponseRepository } from '../repositories/form-response.repository.js';
import type { IQuestionResponseRepository } from '../repositories/question-response.repository.js';
import { validateCreateFormResponseInput, validateUpdateFormResponseInput, validateCreateQuestionResponseInput, validateUpdateQuestionResponseInput } from '../validators/form-response.validator.js';

export interface IFormResponseService {
  // Form Response Groups
  listGroups(): FormResponseGroup[];
  getGroup(id: string): FormResponseGroup | undefined;
  createGroup(input: CreateFormResponseGroupInput): FormResponseGroup;
  deleteGroup(id: string): boolean;

  // Form Responses
  listResponses(groupId: string, user: AuthUser): FormResponse[];
  getResponse(id: string, user: AuthUser): FormResponse | undefined;
  createResponse(input: CreateFormResponseInput): FormResponse;
  updateResponse(id: string, input: UpdateFormResponseInput): FormResponse | undefined;
  deleteResponse(id: string): boolean;

  // Question Responses
  listQuestionResponses(formResponseId: string, user: AuthUser): QuestionResponse[];
  getQuestionResponse(id: string, user: AuthUser): QuestionResponse | undefined;
  getQuestionResponseBySymbol(formResponseId: string, questionSymbol: string, user: AuthUser): QuestionResponse | undefined;
  createQuestionResponse(input: CreateQuestionResponseInput, user: AuthUser): QuestionResponse;
  upsertQuestionResponse(input: CreateQuestionResponseInput, user: AuthUser): QuestionResponse;
  updateQuestionResponse(id: string, input: UpdateQuestionResponseInput, user: AuthUser): QuestionResponse | undefined;
  deleteQuestionResponse(id: string, user: AuthUser): boolean;
}

// ---------------------------------------------------------------------------
// Data scoping helper
// ---------------------------------------------------------------------------

function scopeResponses(
  responses: FormResponse[],
  user: AuthUser,
): FormResponse[] {
  if (user.permissions.includes('form:response:admin')) {
    return [...responses];
  }
  if (user.permissions.includes('form:response:read:org')) {
    return responses.filter((r) => r.organization_id === user.organisation_id);
  }
  if (user.permissions.includes('form:response:read:delegate')) {
    return responses.filter((r) => r.filling_user_id === user.sub);
  }
  if (user.permissions.includes('form:response:read:own')) {
    return responses.filter((r) => r.user_id === user.sub);
  }
  return [];
}

function scopeResponseSingle(
  response: FormResponse | undefined,
  user: AuthUser,
): FormResponse | undefined {
  if (!response) return undefined;
  const scoped = scopeResponses([response], user);
  return scoped.length > 0 ? scoped[0] : undefined;
}

// ---------------------------------------------------------------------------
// Immutability check
// ---------------------------------------------------------------------------

function assertNotSubmitted(response: FormResponse): void {
  if (response.status === 'Submitted') {
    throw new FormResponseImmutabilityError(response.form_response_id);
  }
}

// ---------------------------------------------------------------------------
// Service implementation
// ---------------------------------------------------------------------------

export class FormResponseService implements IFormResponseService {
  constructor(
    private readonly groupRepository: IFormResponseGroupRepository,
    private readonly formResponseRepository: IFormResponseRepository,
    private readonly questionResponseRepository: IQuestionResponseRepository,
  ) {}

  // ---- Form Response Groups ----

  listGroups(): FormResponseGroup[] {
    return this.groupRepository.list();
  }

  getGroup(id: string): FormResponseGroup | undefined {
    return this.groupRepository.get(id);
  }

  createGroup(input: CreateFormResponseGroupInput): FormResponseGroup {
    return this.groupRepository.create(input);
  }

  deleteGroup(id: string): boolean {
    const existing = this.groupRepository.get(id);
    if (!existing) return false;
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

  listResponses(groupId: string, user: AuthUser): FormResponse[] {
    const responses = this.formResponseRepository.list(groupId);
    return scopeResponses(responses, user);
  }

  getResponse(id: string, user: AuthUser): FormResponse | undefined {
    const response = this.formResponseRepository.get(id);
    return scopeResponseSingle(response, user);
  }

  createResponse(input: CreateFormResponseInput): FormResponse {
    validateCreateFormResponseInput(input);
    return this.formResponseRepository.create(input);
  }

  updateResponse(id: string, input: UpdateFormResponseInput): FormResponse | undefined {
    const existing = this.formResponseRepository.get(id);
    if (!existing) return undefined;

    // Handle submission transition before immutability check
    if (input.status === 'Submitted') {
      if (existing.status === 'Submitted') {
        throw new FormResponseSubmissionError(
          `Cannot submit form response ${id}: already submitted`,
        );
      }
      if (existing.status !== 'Draft') {
        throw new FormResponseSubmissionError(
          `Cannot submit form response ${id}: current status is ${existing.status}`,
        );
      }
      input.submitted_timestamp = new Date().toISOString();
    } else {
      // Non-submission modifications: enforce immutability
      assertNotSubmitted(existing);
    }

    validateUpdateFormResponseInput(input);
    return this.formResponseRepository.update(id, input);
  }

  deleteResponse(id: string): boolean {
    const existing = this.formResponseRepository.get(id);
    if (!existing) return false;

    // Immutability: cannot delete submitted responses
    assertNotSubmitted(existing);

    this.questionResponseRepository.deleteByFormResponse(id);
    return this.formResponseRepository.delete(id);
  }

  // ---- Question Responses ----

  private assertFormResponseAccess(formResponseId: string, user: AuthUser): FormResponse {
    const parent = this.formResponseRepository.get(formResponseId);
    if (!parent) {
      throw new Error(`Form response ${formResponseId} not found`);
    }
    // Check the user can access the parent response
    const scoped = scopeResponseSingle(parent, user);
    if (!scoped) {
      throw new FormResponseAuthorizationError(
        `Access denied to form response ${formResponseId}`,
      );
    }
    return scoped;
  }

  listQuestionResponses(formResponseId: string, user: AuthUser): QuestionResponse[] {
    this.assertFormResponseAccess(formResponseId, user);
    return this.questionResponseRepository.listByFormResponse(formResponseId);
  }

  getQuestionResponse(id: string, user: AuthUser): QuestionResponse | undefined {
    const qr = this.questionResponseRepository.get(id);
    if (!qr) return undefined;
    this.assertFormResponseAccess(qr.form_response_id, user);
    return qr;
  }

  getQuestionResponseBySymbol(formResponseId: string, questionSymbol: string, user: AuthUser): QuestionResponse | undefined {
    this.assertFormResponseAccess(formResponseId, user);
    return this.questionResponseRepository.getByFormResponseAndSymbol(formResponseId, questionSymbol);
  }

  createQuestionResponse(input: CreateQuestionResponseInput, user: AuthUser): QuestionResponse {
    validateCreateQuestionResponseInput(input);
    const parent = this.assertFormResponseAccess(input.form_response_id, user);
    assertNotSubmitted(parent);
    return this.questionResponseRepository.create(input);
  }

  upsertQuestionResponse(input: CreateQuestionResponseInput, user: AuthUser): QuestionResponse {
    validateCreateQuestionResponseInput(input);
    const parent = this.assertFormResponseAccess(input.form_response_id, user);
    assertNotSubmitted(parent);
    return this.questionResponseRepository.upsert(input);
  }

  updateQuestionResponse(id: string, input: UpdateQuestionResponseInput, user: AuthUser): QuestionResponse | undefined {
    const existing = this.questionResponseRepository.get(id);
    if (!existing) return undefined;
    const parent = this.assertFormResponseAccess(existing.form_response_id, user);
    assertNotSubmitted(parent);
    validateUpdateQuestionResponseInput(input);
    return this.questionResponseRepository.update(id, input);
  }

  deleteQuestionResponse(id: string, user: AuthUser): boolean {
    const existing = this.questionResponseRepository.get(id);
    if (!existing) return false;
    const parent = this.assertFormResponseAccess(existing.form_response_id, user);
    assertNotSubmitted(parent);
    return this.questionResponseRepository.delete(id);
  }
}
