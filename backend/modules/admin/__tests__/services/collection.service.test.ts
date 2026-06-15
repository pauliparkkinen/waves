import { describe, it, expect, vi } from 'vitest';
import { CollectionService } from '../../services/collection.service.js';
import type { ICollectionRepository } from '../../repositories/collection.repository.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';

function makeRepository(overrides: Partial<ICollectionRepository> = {}): ICollectionRepository {
  return {
    listCollections: vi.fn().mockReturnValue([]),
    getCollection: vi.fn().mockReturnValue(undefined),
    createCollection: vi
      .fn()
      .mockReturnValue({ collection_id: 'collection-1', collection_symbol: 'Test Collection', collection_permissions: [] }),
    updateCollection: vi.fn().mockReturnValue(undefined),
    deleteCollection: vi.fn().mockReturnValue(false),
    findCollectionsByOrganisation: vi.fn().mockReturnValue([]),
    checkPermission: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

const adminUser: AuthUser = { sub: 'admin', permissions: ['admin:manage'] };
const orgUser: AuthUser = { sub: 'org-user', permissions: [], organisation_id: 'org-1' };
const noOrgUser: AuthUser = { sub: 'no-org', permissions: [] };

describe('CollectionService', () => {
  describe('getStatus', () => {
    it('when called, then it returns status ok for the admin-collections module', () => {
      const service = new CollectionService(makeRepository());

      const result = service.getStatus();

      expect(result).toEqual({ status: 'ok', module: 'admin-collections' });
    });
  });

  describe('listCollections', () => {
    it('when user has admin:manage, then it returns all collections', () => {
      const collections = [{ collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] }];
      const repo = makeRepository({ listCollections: vi.fn().mockReturnValue(collections) });
      const service = new CollectionService(repo);

      const result = service.listCollections(adminUser);

      expect(result).toEqual(collections);
      expect(repo.listCollections).toHaveBeenCalled();
    });

    it('when user has organisation_id, then it filters by org', () => {
      const collections = [{ collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] }];
      const repo = makeRepository({
        findCollectionsByOrganisation: vi.fn().mockReturnValue(collections),
      });
      const service = new CollectionService(repo);

      const result = service.listCollections(orgUser);

      expect(result).toEqual(collections);
      expect(repo.findCollectionsByOrganisation).toHaveBeenCalledWith('org-1');
    });

    it('when user has no org and no admin:manage, then it returns empty', () => {
      const service = new CollectionService(makeRepository());

      const result = service.listCollections(noOrgUser);

      expect(result).toEqual([]);
    });
  });

  describe('getCollection', () => {
    it('when user has admin:manage, then it returns the collection', () => {
      const collection = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const repo = makeRepository({ getCollection: vi.fn().mockReturnValue(collection) });
      const service = new CollectionService(repo);

      const result = service.getCollection('c-1', adminUser);

      expect(result).toEqual(collection);
    });

    it('when user has org with read permission, then it returns the collection', () => {
      const collection = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const repo = makeRepository({
        getCollection: vi.fn().mockReturnValue(collection),
        checkPermission: vi.fn().mockReturnValue(true),
      });
      const service = new CollectionService(repo);

      const result = service.getCollection('c-1', orgUser);

      expect(result).toEqual(collection);
      expect(repo.checkPermission).toHaveBeenCalledWith('c-1', 'org-1', 'read');
    });

    it('when user has org without read permission, then it returns undefined', () => {
      const collection = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const repo = makeRepository({
        getCollection: vi.fn().mockReturnValue(collection),
        checkPermission: vi.fn().mockReturnValue(false),
      });
      const service = new CollectionService(repo);

      const result = service.getCollection('c-1', orgUser);

      expect(result).toBeUndefined();
    });

    it('when the collection does not exist, then it returns undefined', () => {
      const repo = makeRepository({ getCollection: vi.fn().mockReturnValue(undefined) });
      const service = new CollectionService(repo);

      const result = service.getCollection('nonexistent', adminUser);

      expect(result).toBeUndefined();
    });
  });

  describe('createCollection', () => {
    it('when user has admin:manage, then it creates and returns the collection', () => {
      const created = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const repo = makeRepository({ createCollection: vi.fn().mockReturnValue(created) });
      const service = new CollectionService(repo);
      const data = { collection_symbol: 'Test Collection', collection_permissions: [] };

      const result = service.createCollection(data, adminUser);

      expect(result).toEqual(created);
      expect(repo.createCollection).toHaveBeenCalledWith(data);
    });

    it('when user does not have admin:manage, then it throws', () => {
      const service = new CollectionService(makeRepository());

      expect(() => service.createCollection({ collection_symbol: 'Test Collection', collection_permissions: [] }, orgUser)).toThrow(
        'Insufficient permissions'
      );
    });
  });

  describe('updateCollection', () => {
    it('when user has admin:manage, then it updates and returns the collection', () => {
      const existing = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const updated = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const repo = makeRepository({
        getCollection: vi.fn().mockReturnValue(existing),
        updateCollection: vi.fn().mockReturnValue(updated),
      });
      const service = new CollectionService(repo);

      const result = service.updateCollection('c-1', {}, adminUser);

      expect(result).toEqual(updated);
      expect(repo.updateCollection).toHaveBeenCalledWith('c-1', {});
    });

    it('when user is an owner, then it updates and returns the collection', () => {
      const existing = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const updated = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const repo = makeRepository({
        getCollection: vi.fn().mockReturnValue(existing),
        checkPermission: vi.fn().mockReturnValue(true),
        updateCollection: vi.fn().mockReturnValue(updated),
      });
      const service = new CollectionService(repo);

      const result = service.updateCollection('c-1', {}, orgUser);

      expect(result).toEqual(updated);
      expect(repo.checkPermission).toHaveBeenCalledWith('c-1', 'org-1', 'owner');
    });

    it('when user is not an owner, then it throws', () => {
      const existing = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const repo = makeRepository({
        getCollection: vi.fn().mockReturnValue(existing),
        checkPermission: vi.fn().mockReturnValue(false),
      });
      const service = new CollectionService(repo);

      expect(() => service.updateCollection('c-1', {}, orgUser)).toThrow(
        'Insufficient permissions'
      );
    });

    it('when the collection does not exist, then it returns undefined', () => {
      const repo = makeRepository({ getCollection: vi.fn().mockReturnValue(undefined) });
      const service = new CollectionService(repo);

      const result = service.updateCollection('nonexistent', {}, adminUser);

      expect(result).toBeUndefined();
    });
  });

  describe('deleteCollection', () => {
    it('when user has admin:manage, then it deletes and returns true', () => {
      const existing = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const repo = makeRepository({
        getCollection: vi.fn().mockReturnValue(existing),
        deleteCollection: vi.fn().mockReturnValue(true),
      });
      const service = new CollectionService(repo);

      const result = service.deleteCollection('c-1', adminUser);

      expect(result).toBe(true);
      expect(repo.deleteCollection).toHaveBeenCalledWith('c-1');
    });

    it('when user is an owner, then it deletes and returns true', () => {
      const existing = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const repo = makeRepository({
        getCollection: vi.fn().mockReturnValue(existing),
        checkPermission: vi.fn().mockReturnValue(true),
        deleteCollection: vi.fn().mockReturnValue(true),
      });
      const service = new CollectionService(repo);

      const result = service.deleteCollection('c-1', orgUser);

      expect(result).toBe(true);
      expect(repo.checkPermission).toHaveBeenCalledWith('c-1', 'org-1', 'owner');
    });

    it('when user is not an owner, then it throws', () => {
      const existing = { collection_id: 'c-1', collection_symbol: 'Test Collection', collection_permissions: [] };
      const repo = makeRepository({
        getCollection: vi.fn().mockReturnValue(existing),
        checkPermission: vi.fn().mockReturnValue(false),
      });
      const service = new CollectionService(repo);

      expect(() => service.deleteCollection('c-1', orgUser)).toThrow(
        'Insufficient permissions'
      );
    });

    it('when the collection does not exist, then it returns false', () => {
      const repo = makeRepository({ getCollection: vi.fn().mockReturnValue(undefined) });
      const service = new CollectionService(repo);

      const result = service.deleteCollection('nonexistent', adminUser);

      expect(result).toBe(false);
    });
  });
});
