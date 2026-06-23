import type { AuthUser } from '../../../src/types/auth.types.js';
import type { FormResponseGroup, CreateFormResponseGroupInput } from '../types/form-response-group.types.js';
import type {
  FormResponse,
  CreateFormResponseInput,
  UpdateFormResponseInput,
  FormResponseAuditAction,
  FormResponseAuditRecord,
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
import { audit } from '../../../src/utils/audit.js';

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

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

function requirePermission(user: AuthUser | undefined, permission: string): void {
  if (!user) {
    throw new FormResponseAuthorizationError('Authentication required');
  }
  if (!user.permissions.includes(permission)) {
    throw new FormResponseAuthorizationError(
      `Insufficient permissions: ${permission} required`
    );
  }
}

function requireAnyPermission(user: AuthUser | undefined, permissions: string[]): void {
  if (!user) {
    throw new FormResponseAuthorizationError('Authentication required');
  }
  const hasAny = permissions.some((p) => user.permissions.includes(p));
  if (!hasAny) {
    throw new FormResponseAuthorizationError(
      `Insufficient permissions: one of [${permissions.join(', ')}] required`
    );
  }
}

// ---------------------------------------------------------------------------
// Audit logging helper
// ---------------------------------------------------------------------------

function auditResponseAction(
  action: FormResponseAuditAction,
  user: AuthUser,
  resource: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): void {
  const record: FormResponseAuditRecord = {
    action,
    sub: user.sub,
    permissions: user.permissions,
    resource,
    before,
    after,
    timestamp: new Date().toISOString(),
  };
  audit.access({
    sub: record.sub,
    resource: record.resource,
    action: record.action,
    outcome: 'allow',
    permissions: record.permissions,
    before: record.before,
    after: record.after,
    timestamp: record.timestamp,
  });
}

function auditDeniedAction(
  action: FormResponseAuditAction,
  user: AuthUser | undefined,
  resource: string,
  reason: string,
): void {
  const sub = user?.sub ?? 'unknown';
  audit.access({
    sub,
    resource,
    action,
    outcome: 'deny',
    reason,
    timestamp: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Data scoping helper
// ---------------------------------------------------------------------------

function scopeResponses(
  responses: FormResponse[],
  user: AuthUser,
): FormResponse[] {
  // Admin with form:response:admin sees all responses unfiltered
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
// Delegation authorization
// ---------------------------------------------------------------------------

function assertFillAuthorization(
  input: { user_id: string; filling_user_id: string },
  user: AuthUser,
): void {
  const { user_id, filling_user_id } = input;

  if (filling_user_id !== user.sub) {
    throw new FormResponseAuthorizationError(
      `filling_user_id (${filling_user_id}) does not match authenticated user (${user.sub})`,
    );
  }

  if (user_id === user.sub) {
    // Self-filling
    requirePermission(user, 'form:response:write:own');
  } else {
    // On-behalf-of filling
    requirePermission(user, 'form:response:write:delegate');
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

  // ---- Form Response Groups (admin only) ----

  listGroups(user?: AuthUser): FormResponseGroup[] {
    requirePermission(user, 'form:response:admin');
    return this.groupRepository.list();
  }

  getGroup(id: string, user?: AuthUser): FormResponseGroup | undefined {
    requirePermission(user, 'form:response:admin');
    return this.groupRepository.get(id);
  }

  createGroup(input: CreateFormResponseGroupInput, user?: AuthUser): FormResponseGroup {
    requirePermission(user, 'form:response:admin');
    return this.groupRepository.create(input);
  }

  deleteGroup(id: string, user?: AuthUser): boolean {
    requirePermission(user, 'form:response:admin');
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

  listResponses(groupId: string, user?: AuthUser): FormResponse[] {
    requireAnyPermission(user, [
      'form:response:read:own',
      'form:response:read:org',
      'form:response:read:delegate',
      'form:response:admin',
    ]);
    const responses = this.formResponseRepository.list(groupId);
    return scopeResponses(responses, user!);
  }

  getResponse(id: string, user?: AuthUser): FormResponse | undefined {
    requireAnyPermission(user, [
      'form:response:read:own',
      'form:response:read:org',
      'form:response:read:delegate',
      'form:response:admin',
    ]);
    const response = this.formResponseRepository.get(id);
    return scopeResponseSingle(response, user!);
  }

  createResponse(input: CreateFormResponseInput, user?: AuthUser): FormResponse {
    validateCreateFormResponseInput(input);
    assertFillAuthorization(input, user!);

    const created = this.formResponseRepository.create(input);
    auditResponseAction('create', user!, `form-response:${created.form_response_id}`, undefined, created as unknown as Record<string, unknown>);
    return created;
  }

  updateResponse(id: string, input: UpdateFormResponseInput, user?: AuthUser): FormResponse | undefined {
    const existing = this.formResponseRepository.get(id);
    if (!existing) return undefined;

    // Permission: must have write access to the form response's patient
    assertFillAuthorization(
      { user_id: existing.user_id, filling_user_id: existing.filling_user_id },
      user!,
    );

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

    const before = { ...existing } as unknown as Record<string, unknown>;
    const updated = this.formResponseRepository.update(id, input);
    if (updated) {
      auditResponseAction('update', user!, `form-response:${id}`, before, updated as unknown as Record<string, unknown>);
    }
    return updated;
  }

  deleteResponse(id: string, user?: AuthUser): boolean {
    const existing = this.formResponseRepository.get(id);
    if (!existing) return false;

    // Permission: must have write access to the form response's patient
    assertFillAuthorization(
      { user_id: existing.user_id, filling_user_id: existing.filling_user_id },
      user!,
    );

    // Immutability: cannot delete submitted responses
    assertNotSubmitted(existing);

    this.questionResponseRepository.deleteByFormResponse(id);
    const deleted = this.formResponseRepository.delete(id);
    if (deleted) {
      auditResponseAction('delete', user!, `form-response:${id}`, existing as unknown as Record<string, unknown>, undefined);
    }
    return deleted;
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

  listQuestionResponses(formResponseId: string, user?: AuthUser): QuestionResponse[] {
    requireAnyPermission(user, [
      'form:response:read:own',
      'form:response:read:org',
      'form:response:read:delegate',
    ]);
    this.assertFormResponseAccess(formResponseId, user!);
    return this.questionResponseRepository.listByFormResponse(formResponseId);
  }

  getQuestionResponse(id: string, user?: AuthUser): QuestionResponse | undefined {
    requireAnyPermission(user, [
      'form:response:read:own',
      'form:response:read:org',
      'form:response:read:delegate',
    ]);
    const qr = this.questionResponseRepository.get(id);
    if (!qr) return undefined;
    this.assertFormResponseAccess(qr.form_response_id, user!);
    return qr;
  }

  getQuestionResponseBySymbol(formResponseId: string, questionSymbol: string, user?: AuthUser): QuestionResponse | undefined {
    requireAnyPermission(user, [
      'form:response:read:own',
      'form:response:read:org',
      'form:response:read:delegate',
    ]);
    this.assertFormResponseAccess(formResponseId, user!);
    return this.questionResponseRepository.getByFormResponseAndSymbol(formResponseId, questionSymbol);
  }

  createQuestionResponse(input: CreateQuestionResponseInput, user?: AuthUser): QuestionResponse {
    validateCreateQuestionResponseInput(input);
    const parent = this.assertFormResponseAccess(input.form_response_id, user!);
    assertNotSubmitted(parent);
    return this.questionResponseRepository.create(input);
  }

  upsertQuestionResponse(input: CreateQuestionResponseInput, user?: AuthUser): QuestionResponse {
    validateCreateQuestionResponseInput(input);
    const parent = this.assertFormResponseAccess(input.form_response_id, user!);
    assertNotSubmitted(parent);
    return this.questionResponseRepository.upsert(input);
  }

  updateQuestionResponse(id: string, input: UpdateQuestionResponseInput, user?: AuthUser): QuestionResponse | undefined {
    const existing = this.questionResponseRepository.get(id);
    if (!existing) return undefined;
    const parent = this.assertFormResponseAccess(existing.form_response_id, user!);
    assertNotSubmitted(parent);
    validateUpdateQuestionResponseInput(input);
    return this.questionResponseRepository.update(id, input);
  }

  deleteQuestionResponse(id: string, user?: AuthUser): boolean {
    const existing = this.questionResponseRepository.get(id);
    if (!existing) return false;
    const parent = this.assertFormResponseAccess(existing.form_response_id, user!);
    assertNotSubmitted(parent);
    return this.questionResponseRepository.delete(id);
  }
}
