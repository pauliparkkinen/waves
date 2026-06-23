import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { AuthUser } from '../../../../src/types/auth.types.js';
import type { IFormResponseGroupRepository } from '../../repositories/form-response-group.repository.js';
import type { IFormResponseRepository } from '../../repositories/form-response.repository.js';
import type { IQuestionResponseRepository } from '../../repositories/question-response.repository.js';
import { FormResponseService } from '../../services/form-response.service.js';
import {
  FormResponseAuthorizationError,
  FormResponseImmutabilityError,
  FormResponseSubmissionError,
} from '../../types/form-response.types.js';
import type { CreateFormResponseInput, FormResponse } from '../../types/form-response.types.js';

// Mock the audit module — use vi.hoisted to ensure the variable is available when vi.mock factory runs
const mockAudit = vi.hoisted(() => ({
  authSuccess: vi.fn(),
  authFailure: vi.fn(),
  authDenied: vi.fn(),
  access: vi.fn(),
}));
vi.mock('../../../../src/utils/audit.js', () => ({ audit: mockAudit }));

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
  permissions: ['form:response:admin', 'admin:manage'],
};

const noPermUser: AuthUser = {
  sub: 'no-perm',
  permissions: [],
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
  // Use separate mock functions so we can access .mockReturnValue() directly
  const mockGroupList = vi.fn().mockReturnValue([]) as Mock & IFormResponseGroupRepository['list'];
  const mockGroupGet = vi.fn().mockReturnValue(undefined) as Mock & IFormResponseGroupRepository['get'];
  const mockGroupCreate = vi.fn().mockImplementation((input: any) => ({ form_response_group_id: 'frg-new', ...input }));
  const mockGroupDelete = vi.fn().mockReturnValue(true);

  const mockList = vi.fn().mockReturnValue([]) as Mock & IFormResponseRepository['list'];
  const mockListByUserId = vi.fn().mockReturnValue([]) as Mock & IFormResponseRepository['listByUserId'];
  const mockListByOrg = vi.fn().mockReturnValue([]) as Mock & IFormResponseRepository['listByOrganizationId'];
  const mockListByFiller = vi.fn().mockReturnValue([]) as Mock & IFormResponseRepository['listByFillingUserId'];
  const mockGet = vi.fn().mockReturnValue(undefined) as Mock & IFormResponseRepository['get'];
  const mockCreate = vi.fn().mockImplementation((input): ReturnType<IFormResponseRepository['create']> => ({
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
  const mockUpdate = vi.fn<(id: string, input: any) => ReturnType<IFormResponseRepository['update']>>().mockImplementation(
    (id: string, input: any) => {
      if (id === 'nonexistent') return undefined;
      return {
        form_response_id: id,
        form_response_group_id: 'frg-1',
        collection_id: 'coll-1',
        form_symbol: 'form-a',
        form_version: 1,
        organization_id: 'org-1',
        user_id: 'patient-1',
        filling_user_id: 'patient-1',
        status: input.status ?? 'Draft',
        version: 2,
        started_timestamp: new Date().toISOString(),
        submitted_timestamp: input.submitted_timestamp,
      } as FormResponse;
    },
  );
  const mockDelete = vi.fn().mockReturnValue(true);

  const groupRepo: IFormResponseGroupRepository = {
    list: mockGroupList,
    get: mockGroupGet,
    create: mockGroupCreate,
    update: vi.fn(),
    delete: mockGroupDelete,
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
    create: vi.fn().mockImplementation((input) => ({ question_response_id: 'qr-1', ...input })),
    update: vi.fn().mockImplementation((id, input) => {
      if (id === 'nonexistent') return undefined;
      return { question_response_id: id, form_response_id: 'fr-1', collection_id: 'coll-1', question_symbol: 'q-1', question_version: 1, ...input };
    }),
    upsert: vi.fn().mockImplementation((input) => ({ question_response_id: 'qr-1', ...input })),
    delete: vi.fn().mockReturnValue(true),
    deleteByFormResponse: vi.fn(),
  };

  return {
    groupRepo,
    formResponseRepo,
    questionRepo,
    // Expose mock functions for direct access
    mockList,
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
  // Form Response Groups (admin only)
  // ================================================================

  describe('createGroup', () => {
    describe('given an admin user', () => {
      it('creates a group and returns it', () => {
        const result = service.createGroup({}, adminUser);
        expect(result.form_response_group_id).toBe('frg-new');
        expect(mocks.groupRepo.create).toHaveBeenCalledOnce();
      });
    });

    describe('given a non-admin user', () => {
      it('throws FormResponseAuthorizationError', () => {
        expect(() => service.createGroup({}, patientUser)).toThrow(FormResponseAuthorizationError);
        expect(() => service.createGroup({}, noPermUser)).toThrow(FormResponseAuthorizationError);
      });
    });

    describe('given no user', () => {
      it('throws FormResponseAuthorizationError', () => {
        expect(() => service.createGroup({}, undefined)).toThrow(FormResponseAuthorizationError);
      });
    });
  });

  describe('listGroups', () => {
    describe('given an admin user', () => {
      it('returns all groups', () => {
        service.listGroups(adminUser);
        expect(mocks.groupRepo.list).toHaveBeenCalledOnce();
      });
    });

    describe('given a non-admin user', () => {
      it('throws FormResponseAuthorizationError', () => {
        expect(() => service.listGroups(patientUser)).toThrow(FormResponseAuthorizationError);
      });
    });
  });

  // ================================================================
  // Form Responses — Data Scoping
  // ================================================================

  describe('listResponses', () => {
    describe('given a patient user (read:own)', () => {
      it('scopes responses to their own user_id', () => {
        mocks.mockList.mockReturnValue([
          { form_response_id: 'fr-1', user_id: 'patient-1', organization_id: 'org-1', filling_user_id: 'patient-1' },
          { form_response_id: 'fr-2', user_id: 'other-patient', organization_id: 'org-1', filling_user_id: 'other-patient' },
        ] as any);

        const result = service.listResponses('frg-1', patientUser);
        expect(result).toHaveLength(1);
        expect(result[0].form_response_id).toBe('fr-1');
      });

      it('returns empty array when no own responses exist', () => {
        const result = service.listResponses('frg-1', patientUser);
        expect(result).toHaveLength(0);
      });
    });

    describe('given an HCP user (read:org)', () => {
      it('scopes responses to their organization', () => {
        mocks.mockList.mockReturnValue([
          { form_response_id: 'fr-1', user_id: 'patient-1', organization_id: 'org-1', filling_user_id: 'patient-1' },
          { form_response_id: 'fr-2', user_id: 'patient-2', organization_id: 'org-2', filling_user_id: 'patient-2' },
        ] as any);

        const result = service.listResponses('frg-1', hcpUser);
        expect(result).toHaveLength(1);
        expect(result[0].organization_id).toBe('org-1');
      });
    });

    describe('given a delegate user (read:delegate)', () => {
      it('scopes responses to their filling_user_id', () => {
        mocks.mockList.mockReturnValue([
          { form_response_id: 'fr-1', user_id: 'patient-1', organization_id: 'org-1', filling_user_id: 'delegate-1' },
          { form_response_id: 'fr-2', user_id: 'patient-2', organization_id: 'org-1', filling_user_id: 'patient-2' },
        ] as any);

        const result = service.listResponses('frg-1', delegateUser);
        expect(result).toHaveLength(1);
        expect(result[0].filling_user_id).toBe('delegate-1');
      });
    });

    describe('given an admin user', () => {
      it('returns all responses without scoping', () => {
        mocks.mockList.mockReturnValue([
          { form_response_id: 'fr-1', user_id: 'patient-1' },
          { form_response_id: 'fr-2', user_id: 'patient-2' },
        ] as any);

        const result = service.listResponses('frg-1', adminUser);
        expect(result).toHaveLength(2);
      });
    });

    describe('given a user with no read permissions', () => {
      it('throws FormResponseAuthorizationError', () => {
        expect(() => service.listResponses('frg-1', noPermUser)).toThrow(FormResponseAuthorizationError);
      });
    });
  });

  // ================================================================
  // Form Responses — Delegation Authorization
  // ================================================================

  describe('createResponse', () => {
    describe('given a patient filling own form', () => {
      it('succeeds with write:own permission', () => {
        const input = makeCreateInput({ user_id: 'patient-1', filling_user_id: 'patient-1' });
        const result = service.createResponse(input, patientUser);
        expect(result).toBeDefined();
        expect(mocks.formResponseRepo.create).toHaveBeenCalledOnce();
      });
    });

    describe('given an HCP filling on behalf of a patient', () => {
      it('succeeds with write:delegate permission', () => {
        const input = makeCreateInput({ user_id: 'patient-1', filling_user_id: 'hcp-1' });
        const result = service.createResponse(input, hcpUser);
        expect(result).toBeDefined();
        expect(mocks.formResponseRepo.create).toHaveBeenCalledOnce();
      });
    });

    describe('given a delegate filling on behalf of a patient', () => {
      it('succeeds with write:delegate permission', () => {
        const input = makeCreateInput({ user_id: 'patient-1', filling_user_id: 'delegate-1' });
        const result = service.createResponse(input, delegateUser);
        expect(result).toBeDefined();
        expect(mocks.formResponseRepo.create).toHaveBeenCalledOnce();
      });
    });

    describe('given a user trying to fill as someone else', () => {
      it('throws FormResponseAuthorizationError when filling_user_id does not match auth user', () => {
        const input = makeCreateInput({ user_id: 'patient-1', filling_user_id: 'other-user' });
        expect(() => service.createResponse(input, patientUser)).toThrow(FormResponseAuthorizationError);
      });
    });

    describe('given a patient trying to fill on behalf of another', () => {
      it('throws FormResponseAuthorizationError when patient lacks delegate permission', () => {
        const input = makeCreateInput({ user_id: 'other-patient', filling_user_id: 'patient-1' });
        expect(() => service.createResponse(input, patientUser)).toThrow(FormResponseAuthorizationError);
      });
    });

    describe('given a user with no permissions', () => {
      it('throws FormResponseAuthorizationError', () => {
        const input = makeCreateInput({ user_id: 'no-perm', filling_user_id: 'no-perm' });
        expect(() => service.createResponse(input, noPermUser)).toThrow(FormResponseAuthorizationError);
      });
    });
  });

  // ================================================================
  // Form Responses — Submission Workflow
  // ================================================================

  describe('updateResponse with submit', () => {
    beforeEach(() => {
      mocks.mockGet.mockReturnValue({
        form_response_id: 'fr-1',
        form_response_group_id: 'frg-1',
        collection_id: 'coll-1',
        form_symbol: 'form-a',
        form_version: 1,
        organization_id: 'org-1',
        user_id: 'patient-1',
        filling_user_id: 'patient-1',
        status: 'Draft',
        version: 1,
        started_timestamp: new Date().toISOString(),
      } as any);
    });

    describe('given a patient submitting their own draft', () => {
      it('transitions to Submitted and sets submitted_timestamp', () => {
        const result = service.updateResponse('fr-1', { status: 'Submitted', version: 1 }, patientUser);
        expect(result).toBeDefined();
        expect(result!.status).toBe('Submitted');
        expect(result!.version).toBe(2);
        expect(result!.submitted_timestamp).toBeTruthy();
      });
    });

    describe('given an HCP submitting a response they filled', () => {
      it('transitions to Submitted', () => {
        mocks.mockGet.mockReturnValue({
          form_response_id: 'fr-1',
          form_response_group_id: 'frg-1',
          collection_id: 'coll-1',
          form_symbol: 'form-a',
          form_version: 1,
          organization_id: 'org-1',
          user_id: 'patient-1',
          filling_user_id: 'hcp-1',
          status: 'Draft',
          version: 1,
          started_timestamp: new Date().toISOString(),
        } as any);

        const result = service.updateResponse('fr-1', { status: 'Submitted', version: 1 }, hcpUser);
        expect(result).toBeDefined();
        expect(result!.status).toBe('Submitted');
      });
    });

    describe('given a non-Draft response', () => {
      it('throws FormResponseSubmissionError', () => {
        mocks.mockGet.mockReturnValue({
          form_response_id: 'fr-1',
          user_id: 'patient-1',
          filling_user_id: 'patient-1',
          status: 'Submitted',
          version: 1,
        } as any);

        expect(() =>
          service.updateResponse('fr-1', { status: 'Submitted', version: 1 }, patientUser),
        ).toThrow(FormResponseSubmissionError);
      });
    });
  });

  // ================================================================
  // Form Responses — Immutability
  // ================================================================

  describe('updateResponse on a submitted response', () => {
    beforeEach(() => {
      mocks.mockGet.mockReturnValue({
        form_response_id: 'fr-1',
        form_response_group_id: 'frg-1',
        collection_id: 'coll-1',
        form_symbol: 'form-a',
        form_version: 1,
        organization_id: 'org-1',
        user_id: 'patient-1',
        filling_user_id: 'patient-1',
        status: 'Submitted',
        version: 2,
        started_timestamp: new Date().toISOString(),
        submitted_timestamp: new Date().toISOString(),
      } as any);
    });

    it('throws FormResponseImmutabilityError', () => {
      expect(() =>
        service.updateResponse('fr-1', { status: 'Draft', version: 2 }, patientUser),
      ).toThrow(FormResponseImmutabilityError);
    });
  });

  describe('deleteResponse on a submitted response', () => {
    beforeEach(() => {
      mocks.mockGet.mockReturnValue({
        form_response_id: 'fr-1',
        form_response_group_id: 'frg-1',
        collection_id: 'coll-1',
        form_symbol: 'form-a',
        form_version: 1,
        organization_id: 'org-1',
        user_id: 'patient-1',
        filling_user_id: 'patient-1',
        status: 'Submitted',
        version: 2,
        started_timestamp: new Date().toISOString(),
        submitted_timestamp: new Date().toISOString(),
      } as any);
    });

    it('throws FormResponseImmutabilityError', () => {
      expect(() => service.deleteResponse('fr-1', patientUser)).toThrow(FormResponseImmutabilityError);
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
  // Audit Logging
  // ================================================================

  describe('audit logging on mutations', () => {
    it('logs create action', () => {
      const input = makeCreateInput({ user_id: 'patient-1', filling_user_id: 'patient-1' });
      service.createResponse(input, patientUser);
      expect(mockAudit.access).toHaveBeenCalledOnce();
      const call = mockAudit.access.mock.calls[0][0];
      expect(call.action).toBe('create');
      expect(call.outcome).toBe('allow');
      expect(call.sub).toBe('patient-1');
    });

    it('logs update action', () => {
      mocks.mockGet.mockReturnValue({
        form_response_id: 'fr-1',
        user_id: 'patient-1',
        filling_user_id: 'patient-1',
        status: 'Draft',
        version: 1,
      } as any);

      service.updateResponse('fr-1', { version: 1 }, patientUser);
      expect(mockAudit.access).toHaveBeenCalledOnce();
      const call = mockAudit.access.mock.calls[0][0];
      expect(call.action).toBe('update');
    });

    it('logs delete action', () => {
      mocks.mockGet.mockReturnValue({
        form_response_id: 'fr-1',
        user_id: 'patient-1',
        filling_user_id: 'patient-1',
        status: 'Draft',
        version: 1,
      } as any);

      service.deleteResponse('fr-1', patientUser);
      expect(mockAudit.access).toHaveBeenCalledOnce();
      const call = mockAudit.access.mock.calls[0][0];
      expect(call.action).toBe('delete');
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
      const result = service.updateResponse('nonexistent', { version: 1 }, patientUser);
      expect(result).toBeUndefined();
    });
  });

  describe('deleteResponse', () => {
    it('returns false for non-existent response', () => {
      mocks.mockGet.mockReturnValue(undefined);
      const result = service.deleteResponse('nonexistent', patientUser);
      expect(result).toBe(false);
    });
  });
});
