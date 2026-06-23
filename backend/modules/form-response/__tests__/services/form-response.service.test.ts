import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AuthUser } from '../../../../src/types/auth.types.js';
import type { IFormResponseGroupRepository } from '../../repositories/form-response-group.repository.js';
import type { IFormResponseRepository } from '../../repositories/form-response.repository.js';
import type { IQuestionResponseRepository } from '../../repositories/question-response.repository.js';
import { FormResponseService } from '../../services/form-response.service.js';
import {
  FormResponseImmutabilityError,
  FormResponseSubmissionError,
} from '../../types/form-response.types.js';
import type { CreateFormResponseInput, FormResponse } from '../../types/form-response.types.js';

// ---- Fixtures ----

const patientUser: AuthUser = {
  sub: 'patient-1',
  permissions: ['form:response:read:own', 'form:response:write:own', 'form:response:submit'],
};

const hcpUser: AuthUser = {
  sub: 'hcp-1',
  organisation_id: 'org-1',
  permissions: ['form:response:read:org', 'form:response:write:delegate', 'form:response:submit'],
};

const delegateUser: AuthUser = {
  sub: 'delegate-1',
  permissions: ['form:response:read:delegate', 'form:response:write:delegate', 'form:response:submit'],
};

const adminUser: AuthUser = {
  sub: 'admin-1',
  permissions: ['form:response:admin'],
};

function makeCreateInput(overrides: Partial<CreateFormResponseInput> = {}): CreateFormResponseInput {
  return {
    form_response_group_id: 'frg-1',
    collection_id: 'coll-1',
    form_symbol: 'form-a',
    form_version: 1,
    organization_id: 'org-1',
    user_id: 'patient-1',
    filling_user_id: 'patient-1',
    ...overrides,
  };
}

function makeRepoMocks() {
  const mockList = vi.fn<(groupId?: string) => FormResponse[]>();
  const mockGet = vi.fn<(id: string) => FormResponse | undefined>();
  const mockCreate = vi.fn().mockImplementation((input: CreateFormResponseInput): FormResponse => ({
    form_response_id: 'fr-1',
    form_response_group_id: input.form_response_group_id,
    collection_id: input.collection_id,
    form_symbol: input.form_symbol,
    form_version: input.form_version,
    organization_id: input.organization_id,
    user_id: input.user_id,
    filling_user_id: input.filling_user_id,
    status: 'Draft' as const,
    version: 1,
    started_timestamp: new Date().toISOString(),
  }));
  const mockUpdate = vi.fn<(id: string, input: any) => FormResponse | undefined>();
  const mockDelete = vi.fn<(id: string) => boolean>();

  const groupRepo: IFormResponseGroupRepository = {
    list: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
    create: vi.fn().mockImplementation((input: any) => ({ form_response_group_id: 'frg-new', ...input })),
    update: vi.fn(),
    delete: vi.fn().mockReturnValue(true),
  };

  const formResponseRepo: IFormResponseRepository = {
    list: mockList,
    listByUserId: vi.fn().mockReturnValue([]),
    listByOrganizationId: vi.fn().mockReturnValue([]),
    listByFillingUserId: vi.fn().mockReturnValue([]),
    get: mockGet,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  };

  const questionRepo: IQuestionResponseRepository = {
    listByFormResponse: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
    getByFormResponseAndSymbol: vi.fn().mockReturnValue(undefined),
    create: vi.fn().mockImplementation((input: any) => ({ question_response_id: 'qr-1', ...input })),
    update: vi.fn(),
    upsert: vi.fn().mockImplementation((input: any) => ({ question_response_id: 'qr-1', ...input })),
    delete: vi.fn().mockReturnValue(true),
    deleteByFormResponse: vi.fn(),
  };

  return { groupRepo, formResponseRepo, questionRepo, mockList, mockGet, mockUpdate, mockDelete };
}

function createService(mocks: ReturnType<typeof makeRepoMocks>): FormResponseService {
  return new FormResponseService(mocks.groupRepo, mocks.formResponseRepo, mocks.questionRepo);
}

describe('FormResponseService', () => {
  let mocks: ReturnType<typeof makeRepoMocks>;
  let service: FormResponseService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = makeRepoMocks();
    service = createService(mocks);
  });

  // ================================================================
  // Form Response Groups (no permission checks — handled by controller)
  // ================================================================

  describe('createGroup', () => {
    it('creates a group and returns it', () => {
      const result = service.createGroup({});
      expect(result.form_response_group_id).toBe('frg-new');
    });
  });

  describe('listGroups', () => {
    it('returns all groups', () => {
      service.listGroups();
      expect(mocks.groupRepo.list).toHaveBeenCalledOnce();
    });
  });

  // ================================================================
  // Form Responses — Data Scoping
  // ================================================================

  describe('listResponses', () => {
    it('scopes to own user_id for patient (read:own)', () => {
      mocks.mockList.mockReturnValue([
        { form_response_id: 'fr-1', user_id: 'patient-1', organization_id: 'org-1', filling_user_id: 'patient-1' },
        { form_response_id: 'fr-2', user_id: 'other-patient', organization_id: 'org-1', filling_user_id: 'other-patient' },
      ] as any);

      const result = service.listResponses('frg-1', patientUser);
      expect(result).toHaveLength(1);
      expect(result[0].form_response_id).toBe('fr-1');
    });

    it('scopes to organization for HCP (read:org)', () => {
      mocks.mockList.mockReturnValue([
        { form_response_id: 'fr-1', user_id: 'patient-1', organization_id: 'org-1', filling_user_id: 'patient-1' },
        { form_response_id: 'fr-2', user_id: 'patient-2', organization_id: 'org-2', filling_user_id: 'patient-2' },
      ] as any);

      const result = service.listResponses('frg-1', hcpUser);
      expect(result).toHaveLength(1);
      expect(result[0].organization_id).toBe('org-1');
    });

    it('scopes to filling_user_id for delegate (read:delegate)', () => {
      mocks.mockList.mockReturnValue([
        { form_response_id: 'fr-1', user_id: 'patient-1', organization_id: 'org-1', filling_user_id: 'delegate-1' },
        { form_response_id: 'fr-2', user_id: 'patient-2', organization_id: 'org-1', filling_user_id: 'patient-2' },
      ] as any);

      const result = service.listResponses('frg-1', delegateUser);
      expect(result).toHaveLength(1);
      expect(result[0].filling_user_id).toBe('delegate-1');
    });

    it('returns all responses for admin (no scoping)', () => {
      mocks.mockList.mockReturnValue([
        { form_response_id: 'fr-1', user_id: 'patient-1' },
        { form_response_id: 'fr-2', user_id: 'patient-2' },
      ] as any);

      const result = service.listResponses('frg-1', adminUser);
      expect(result).toHaveLength(2);
    });

    it('returns empty array for user with no read permissions', () => {
      const noPermUser: AuthUser = { sub: 'none', permissions: [] };
      const result = service.listResponses('frg-1', noPermUser);
      expect(result).toHaveLength(0);
    });
  });

  // ================================================================
  // Form Responses — Creation
  // ================================================================

  describe('createResponse', () => {
    it('creates a form response with validated input', () => {
      const input = makeCreateInput();
      const result = service.createResponse(input);
      expect(result).toBeDefined();
      expect(result.status).toBe('Draft');
      expect(result.version).toBe(1);
      expect(mocks.formResponseRepo.create).toHaveBeenCalledOnce();
    });
  });

  // ================================================================
  // Form Responses — Submission Workflow
  // ================================================================

  describe('updateResponse with submit', () => {
    beforeEach(() => {
      mocks.mockGet.mockReturnValue({
        form_response_id: 'fr-1',
        user_id: 'patient-1',
        filling_user_id: 'patient-1',
        organization_id: 'org-1',
        status: 'Draft',
        version: 1,
        started_timestamp: new Date().toISOString(),
      } as any);
    });

    it('transitions Draft to Submitted and sets submitted_timestamp', () => {
      mocks.mockUpdate.mockReturnValue({
        form_response_id: 'fr-1',
        status: 'Submitted',
        version: 2,
        submitted_timestamp: new Date().toISOString(),
      } as any);

      const result = service.updateResponse('fr-1', { status: 'Submitted', version: 1 });
      expect(result).toBeDefined();
      expect(result!.status).toBe('Submitted');
      expect(result!.version).toBe(2);
    });

    it('throws FormResponseSubmissionError when response is already Submitted', () => {
      mocks.mockGet.mockReturnValue({
        form_response_id: 'fr-1',
        status: 'Submitted',
        version: 2,
      } as any);

      expect(() =>
        service.updateResponse('fr-1', { status: 'Submitted', version: 2 }),
      ).toThrow(FormResponseSubmissionError);
    });
  });

  // ================================================================
  // Form Responses — Immutability
  // ================================================================

  describe('updateResponse on a submitted response', () => {
    it('throws FormResponseImmutabilityError for non-submission changes', () => {
      mocks.mockGet.mockReturnValue({
        form_response_id: 'fr-1',
        status: 'Submitted',
        version: 2,
      } as any);

      // Trying to change filling_user_id (not submitting) on a submitted response
      expect(() =>
        service.updateResponse('fr-1', { version: 2, filling_user_id: 'other' }),
      ).toThrow(FormResponseImmutabilityError);
    });
  });

  describe('deleteResponse on a submitted response', () => {
    it('throws FormResponseImmutabilityError', () => {
      mocks.mockGet.mockReturnValue({
        form_response_id: 'fr-1',
        status: 'Submitted',
        version: 2,
      } as any);

      expect(() => service.deleteResponse('fr-1')).toThrow(FormResponseImmutabilityError);
    });
  });

  // ================================================================
  // Question Responses — Immutability via parent
  // ================================================================

  describe('createQuestionResponse on a submitted parent', () => {
    it('throws FormResponseImmutabilityError', () => {
      mocks.mockGet.mockReturnValue({
        form_response_id: 'fr-1',
        user_id: 'patient-1',
        filling_user_id: 'patient-1',
        status: 'Submitted',
        version: 2,
      } as any);

      expect(() =>
        service.createQuestionResponse(
          { form_response_id: 'fr-1', collection_id: 'coll-1', question_symbol: 'q-1', question_version: 1 },
          patientUser,
        ),
      ).toThrow(FormResponseImmutabilityError);
    });
  });

  // ================================================================
  // Non-existent resources
  // ================================================================

  describe('getResponse', () => {
    it('returns undefined for non-existent response', () => {
      const result = service.getResponse('nonexistent', patientUser);
      expect(result).toBeUndefined();
    });
  });

  describe('updateResponse', () => {
    it('returns undefined for non-existent response', () => {
      const result = service.updateResponse('nonexistent', { version: 1 });
      expect(result).toBeUndefined();
    });
  });

  describe('deleteResponse', () => {
    it('returns false for non-existent response', () => {
      const result = service.deleteResponse('nonexistent');
      expect(result).toBe(false);
    });
  });
});
