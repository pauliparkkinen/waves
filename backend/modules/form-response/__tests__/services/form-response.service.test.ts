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

const noPermUser: AuthUser = {
  sub: 'none',
  permissions: [],
};

function makeRepoMocks() {
  // Scoped query mocks — each returns the full fixture set so the service
  // delegates to the correct repository method; the test then verifies
  // which method was called with which arguments.
  const mockList = vi.fn<(groupId?: string) => FormResponse[]>();
  const mockListByUserId = vi.fn<(userId: string, groupId?: string) => FormResponse[]>();
  const mockListByOrg = vi.fn<(orgId: string, groupId?: string) => FormResponse[]>();
  const mockListByFiller = vi.fn<(fillerId: string, groupId?: string) => FormResponse[]>();
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
    listByUserId: mockListByUserId,
    listByOrganizationId: mockListByOrg,
    listByFillingUserId: mockListByFiller,
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

  return {
    groupRepo,
    formResponseRepo,
    questionRepo,
    mockList,
    mockListByUserId,
    mockListByOrg,
    mockListByFiller,
    mockGet,
    mockUpdate,
    mockDelete,
  };
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
  // Form Responses — Data Scoping via query routing
  // ================================================================

  describe('listResponses', () => {
    it('routes to listByUserId for patient (read:own)', () => {
      service.listResponses('grp-1', patientUser);
      expect(mocks.mockListByUserId).toHaveBeenCalledWith('patient-1', 'grp-1');
      expect(mocks.mockList).not.toHaveBeenCalled();
    });

    it('routes to listByOrganizationId for HCP (read:org)', () => {
      service.listResponses('grp-1', hcpUser);
      expect(mocks.mockListByOrg).toHaveBeenCalledWith('org-1', 'grp-1');
    });

    it('routes to listByFillingUserId for delegate (read:delegate)', () => {
      service.listResponses('grp-1', delegateUser);
      expect(mocks.mockListByFiller).toHaveBeenCalledWith('delegate-1', 'grp-1');
    });

    it('routes to list (unscoped) for admin', () => {
      service.listResponses('grp-1', adminUser);
      expect(mocks.mockList).toHaveBeenCalledWith('grp-1');
    });

    it('returns empty for user with no read permissions', () => {
      const result = service.listResponses('grp-1', noPermUser);
      expect(result).toEqual([]);
      expect(mocks.mockList).not.toHaveBeenCalled();
      expect(mocks.mockListByUserId).not.toHaveBeenCalled();
    });

    it('returns data from the routed repository method', () => {
      const expected = [
        { form_response_id: 'fr-1', user_id: 'patient-1' },
      ] as any;
      mocks.mockListByUserId.mockReturnValue(expected);

      const result = service.listResponses('grp-1', patientUser);
      expect(result).toEqual(expected);
    });
  });

  describe('getResponse', () => {
    it('returns the response when user has access (read:own)', () => {
      const response = { form_response_id: 'fr-1', user_id: 'patient-1', organization_id: 'org-1', filling_user_id: 'patient-1' } as any;
      mocks.mockGet.mockReturnValue(response);

      const result = service.getResponse('fr-1', patientUser);
      expect(result).toEqual(response);
    });

    it('returns undefined when user lacks access (different patient)', () => {
      const response = { form_response_id: 'fr-1', user_id: 'other-patient', organization_id: 'org-1', filling_user_id: 'other-patient' } as any;
      mocks.mockGet.mockReturnValue(response);

      const result = service.getResponse('fr-1', patientUser);
      expect(result).toBeUndefined();
    });

    it('returns response for HCP when org matches', () => {
      const response = { form_response_id: 'fr-1', user_id: 'patient-1', organization_id: 'org-1', filling_user_id: 'hcp-1' } as any;
      mocks.mockGet.mockReturnValue(response);

      const result = service.getResponse('fr-1', hcpUser);
      expect(result).toEqual(response);
    });

    it('returns undefined for HCP when org does not match', () => {
      const response = { form_response_id: 'fr-1', user_id: 'patient-1', organization_id: 'org-2', filling_user_id: 'hcp-1' } as any;
      mocks.mockGet.mockReturnValue(response);

      const result = service.getResponse('fr-1', hcpUser);
      expect(result).toBeUndefined();
    });

    it('returns response for delegate when they filled it', () => {
      const response = { form_response_id: 'fr-1', user_id: 'patient-1', organization_id: 'org-1', filling_user_id: 'delegate-1' } as any;
      mocks.mockGet.mockReturnValue(response);

      const result = service.getResponse('fr-1', delegateUser);
      expect(result).toEqual(response);
    });

    it('returns undefined for delegate when another user filled it', () => {
      const response = { form_response_id: 'fr-1', user_id: 'patient-1', organization_id: 'org-1', filling_user_id: 'other-delegate' } as any;
      mocks.mockGet.mockReturnValue(response);

      const result = service.getResponse('fr-1', delegateUser);
      expect(result).toBeUndefined();
    });

    it('returns response for admin regardless of ownership', () => {
      const response = { form_response_id: 'fr-1', user_id: 'anyone', organization_id: 'any-org', filling_user_id: 'anyone' } as any;
      mocks.mockGet.mockReturnValue(response);

      const result = service.getResponse('fr-1', adminUser);
      expect(result).toEqual(response);
    });

    it('returns undefined when response does not exist', () => {
      const result = service.getResponse('nonexistent', patientUser);
      expect(result).toBeUndefined();
    });
  });

  // ================================================================
  // Form Responses — Creation
  // ================================================================

  describe('createResponse', () => {
    it('creates a form response with validated input', () => {
      const input: CreateFormResponseInput = {
        form_response_group_id: 'frg-1',
        collection_id: 'coll-1',
        form_symbol: 'form-a',
        form_version: 1,
        organization_id: 'org-1',
        user_id: 'patient-1',
        filling_user_id: 'patient-1',
      };
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

    it('transitions Draft to Submitted', () => {
      mocks.mockUpdate.mockReturnValue({
        form_response_id: 'fr-1',
        status: 'Submitted',
        version: 2,
        submitted_timestamp: new Date().toISOString(),
      } as any);

      const result = service.updateResponse('fr-1', { status: 'Submitted', version: 1 });
      expect(result).toBeDefined();
      expect(result!.status).toBe('Submitted');
    });

    it('throws FormResponseSubmissionError when already Submitted', () => {
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
