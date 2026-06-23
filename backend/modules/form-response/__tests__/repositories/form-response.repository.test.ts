import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryFormResponseRepository } from '../../repositories/form-response.repository.js';
import { FormResponseVersionConflictError } from '../../types/form-response.types.js';
import type { CreateFormResponseInput } from '../../types/form-response.types.js';

function makeInput(overrides: Partial<CreateFormResponseInput> = {}): CreateFormResponseInput {
  return {
    form_response_group_id: 'frg-1',
    collection_id: 'coll-1',
    form_symbol: 'form-a',
    form_version: 1,
    organization_id: 'org-1',
    user_id: 'user-1',
    filling_user_id: 'user-1',
    ...overrides,
  };
}

describe('InMemoryFormResponseRepository', () => {
  let repo: InMemoryFormResponseRepository;

  beforeEach(() => {
    repo = new InMemoryFormResponseRepository();
  });

  describe('create', () => {
    it('should create a form response with version 1 and Draft status', () => {
      const result = repo.create(makeInput());

      expect(result.version).toBe(1);
      expect(result.status).toBe('Draft');
      expect(result.organization_id).toBe('org-1');
      expect(result.form_response_id).toBeTruthy();
    });
  });

  describe('update with optimistic locking', () => {
    it('should update and increment version when version matches', () => {
      const created = repo.create(makeInput());
      const updated = repo.update(created.form_response_id, { version: 1 });

      expect(updated).toBeDefined();
      expect(updated!.version).toBe(2);
      expect(updated!.status).toBe('Draft');
    });

    it('should throw FormResponseVersionConflictError when version does not match', () => {
      const created = repo.create(makeInput());

      expect(() => repo.update(created.form_response_id, { version: 99 })).toThrow(
        FormResponseVersionConflictError,
      );
    });

    it('should return undefined for non-existent id', () => {
      expect(repo.update('nonexistent', { version: 1 })).toBeUndefined();
    });

    it('should allow chained updates with correct versions', () => {
      const created = repo.create(makeInput());

      const v1 = repo.update(created.form_response_id, { version: 1 });
      expect(v1!.version).toBe(2);

      const v2 = repo.update(created.form_response_id, { version: 2 });
      expect(v2!.version).toBe(3);
    });
  });

  describe('listByUserId', () => {
    it('should return responses for a specific user', () => {
      repo.create(makeInput({ user_id: 'user-1', filling_user_id: 'user-1' }));
      repo.create(makeInput({ user_id: 'user-1', filling_user_id: 'user-2' }));
      repo.create(makeInput({ user_id: 'user-2', filling_user_id: 'user-2' }));

      const results = repo.listByUserId('user-1');
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.user_id === 'user-1')).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const results = repo.listByUserId('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('listByOrganizationId', () => {
    it('should return responses for a specific organization', () => {
      repo.create(makeInput({ organization_id: 'org-1' }));
      repo.create(makeInput({ organization_id: 'org-1' }));
      repo.create(makeInput({ organization_id: 'org-2' }));

      const results = repo.listByOrganizationId('org-1');
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.organization_id === 'org-1')).toBe(true);
    });

    it('should filter by groupId when provided', () => {
      repo.create(makeInput({ organization_id: 'org-1', form_response_group_id: 'grp-a' }));
      repo.create(makeInput({ organization_id: 'org-1', form_response_group_id: 'grp-b' }));
      repo.create(makeInput({ organization_id: 'org-1', form_response_group_id: 'grp-a' }));

      const results = repo.listByOrganizationId('org-1', 'grp-a');
      expect(results).toHaveLength(2);
    });
  });

  describe('listByFillingUserId', () => {
    it('should return responses filled by a specific user', () => {
      repo.create(makeInput({ user_id: 'user-1', filling_user_id: 'user-1' }));
      repo.create(makeInput({ user_id: 'user-2', filling_user_id: 'user-1' }));
      repo.create(makeInput({ user_id: 'user-3', filling_user_id: 'user-3' }));

      const results = repo.listByFillingUserId('user-1');
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.filling_user_id === 'user-1')).toBe(true);
    });

    it('should filter by groupId when provided', () => {
      repo.create(makeInput({ filling_user_id: 'user-1', form_response_group_id: 'grp-a' }));
      repo.create(makeInput({ filling_user_id: 'user-1', form_response_group_id: 'grp-b' }));
      repo.create(makeInput({ filling_user_id: 'user-1', form_response_group_id: 'grp-a' }));

      const results = repo.listByFillingUserId('user-1', 'grp-a');
      expect(results).toHaveLength(2);
    });
  });

  describe('listByUserId', () => {
    it('should return responses for a specific user', () => {
      repo.create(makeInput({ user_id: 'user-1' }));
      repo.create(makeInput({ user_id: 'user-1' }));
      repo.create(makeInput({ user_id: 'user-2' }));

      const results = repo.listByUserId('user-1');
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.user_id === 'user-1')).toBe(true);
    });

    it('should filter by groupId when provided', () => {
      repo.create(makeInput({ user_id: 'user-1', form_response_group_id: 'grp-a' }));
      repo.create(makeInput({ user_id: 'user-1', form_response_group_id: 'grp-b' }));
      repo.create(makeInput({ user_id: 'user-1', form_response_group_id: 'grp-a' }));

      const results = repo.listByUserId('user-1', 'grp-a');
      expect(results).toHaveLength(2);
    });
  });

  describe('list', () => {
    it('should filter by group id when provided', () => {
      repo.create(makeInput({ form_response_group_id: 'grp-1' }));
      repo.create(makeInput({ form_response_group_id: 'grp-1' }));
      repo.create(makeInput({ form_response_group_id: 'grp-2' }));

      const results = repo.list('grp-1');
      expect(results).toHaveLength(2);
    });

    it('should return all when no group id provided', () => {
      repo.create(makeInput());
      repo.create(makeInput());

      const results = repo.list();
      expect(results).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should remove an existing response', () => {
      const created = repo.create(makeInput());
      expect(repo.delete(created.form_response_id)).toBe(true);
      expect(repo.get(created.form_response_id)).toBeUndefined();
    });

    it('should return false for non-existent response', () => {
      expect(repo.delete('nonexistent')).toBe(false);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent', () => {
      expect(repo.get('nonexistent')).toBeUndefined();
    });

    it('should return the created response', () => {
      const created = repo.create(makeInput());
      const fetched = repo.get(created.form_response_id);
      expect(fetched).toEqual(created);
    });
  });
});
