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
// Access-scope helpers (determine which DB field to filter on)
// ---------------------------------------------------------------------------

/**
 * Returns true when the user is permitted to access the given response
 * based on their permission set. Used for single-record access checks.
 */
function canAccessResponse(response: FormResponse, user: AuthUser): boolean {
  if (user.permissions.includes('form:response:admin')) return true;
  if (user.permissions.includes('form:response:read:org') && response.organization_id === user.organisation_id) return true;
  if (user.permissions.includes('form:response:read:delegate') && response.filling_user_id === user.sub) return true;
  if (user.permissions.includes('form:response:read:own') && response.user_id === user.sub) return true;
  return false;
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
    // Route to the most efficient repository query based on the user's permissions.
    // Each branch applies both the role-based scope and the groupId filter at the
    // data layer, avoiding in-memory filtering of the full dataset.
    if (user.permissions.includes('form:response:admin')) {
      return this.formResponseRepository.list(groupId);
    }
    if (user.permissions.includes('form:response:read:org')) {
      return this.formResponseRepository.listByOrganizationId(user.organisation_id ?? '', groupId);
    }
    if (user.permissions.includes('form:response:read:delegate')) {
      return this.formResponseRepository.listByFillingUserId(user.sub, groupId);
    }
    if (user.permissions.includes('form:response:read:own')) {
      return this.formResponseRepository.listByUserId(user.sub, groupId);
    }
    return [];
  }

  getResponse(id: string, user: AuthUser): FormResponse | undefined {
    const response = this.formResponseRepository.get(id);
    if (!response) return undefined;
    // Check access against a single record without loading all responses
    if (!canAccessResponse(response, user)) return undefined;
    return response;
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
    if (!canAccessResponse(parent, user)) {
      throw new FormResponseAuthorizationError(
        `Access denied to form response ${formResponseId}`,
      );
    }
    return parent;
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
