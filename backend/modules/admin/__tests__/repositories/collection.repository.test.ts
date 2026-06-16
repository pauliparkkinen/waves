import { describe, it, expect } from 'vitest';
import { InMemoryCollectionRepository } from '../../repositories/collection.repository.js';

describe('InMemoryCollectionRepository', () => {
  describe('given an empty repository', () => {
    it('when listCollections is called, then it returns an empty array', () => {
      const repo = new InMemoryCollectionRepository();

      const result = repo.listCollections();

      expect(result).toEqual([]);
    });

    it('when getCollection is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryCollectionRepository();

      const result = repo.getCollection('nonexistent');

      expect(result).toBeUndefined();
    });

    it('when createCollection is called, then it creates and returns the collection', () => {
      const repo = new InMemoryCollectionRepository();
      const data = { collection_symbol: 'Test Collection', collection_permissions: [] };

      const result = repo.createCollection(data);

      expect(result.collection_id).toBeDefined();
      expect(result.collection_id).toMatch(/^collection-/);
      expect(result.collection_symbol).toBe('Test Collection');
      expect(result.collection_permissions).toEqual([]);
    });

    it('when deleteCollection is called with a non-existent id, then it returns false', () => {
      const repo = new InMemoryCollectionRepository();

      const result = repo.deleteCollection('nonexistent');

      expect(result).toBe(false);
    });

    it('when findCollectionsByOrganisation is called, then it returns an empty array', () => {
      const repo = new InMemoryCollectionRepository();

      const result = repo.findCollectionsByOrganisation('org-1');

      expect(result).toEqual([]);
    });

    it('when checkPermission is called with a non-existent collection, then it returns false', () => {
      const repo = new InMemoryCollectionRepository();

      const result = repo.checkPermission('nonexistent', 'org-1', 'read');

      expect(result).toBe(false);
    });
  });

  describe('given a repository with a collection', () => {
    it('when getCollection is called with the existing id, then it returns the collection', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({ collection_symbol: 'Test Collection', collection_permissions: [] });

      const result = repo.getCollection(created.collection_id);

      expect(result).toEqual(created);
    });

    it('when updateCollection is called, then it updates the collection', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({ collection_symbol: 'Test Collection', collection_permissions: [] });

      const updated = repo.updateCollection(created.collection_id, {
        collection_permissions: [
          { organisation_id: 'org-1', read: true, use: false, edit: false, owner: false },
        ],
      });

      expect(updated).toBeDefined();
      expect(updated!.collection_permissions).toHaveLength(1);
    });

    it('when updateCollection is called with a non-existent id, then it returns undefined', () => {
      const repo = new InMemoryCollectionRepository();

      const result = repo.updateCollection('nonexistent', { collection_symbol: 'Test Collection', collection_permissions: [] });

      expect(result).toBeUndefined();
    });

    it('when deleteCollection is called, then it removes the collection and returns true', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({ collection_symbol: 'Test Collection', collection_permissions: [] });

      const deleted = repo.deleteCollection(created.collection_id);

      expect(deleted).toBe(true);
      expect(repo.listCollections()).toEqual([]);
    });
  });

  describe('findCollectionsByOrganisation', () => {
    it('when called, then it returns collections where the org has read permission', () => {
      const repo = new InMemoryCollectionRepository();
      repo.createCollection({
        collection_symbol: 'Collection A',
        collection_permissions: [
          { organisation_id: 'org-1', read: true, use: false, edit: false, owner: false },
        ],
      });
      repo.createCollection({
        collection_symbol: 'Collection B',
        collection_permissions: [
          { organisation_id: 'org-2', read: true, use: false, edit: false, owner: false },
        ],
      });

      const result = repo.findCollectionsByOrganisation('org-1');

      expect(result).toHaveLength(1);
    });

    it('when the org has no read permission, then it returns empty', () => {
      const repo = new InMemoryCollectionRepository();
      repo.createCollection({
        collection_symbol: 'Collection C',
        collection_permissions: [
          { organisation_id: 'org-1', read: false, use: false, edit: false, owner: false },
        ],
      });

      const result = repo.findCollectionsByOrganisation('org-1');

      expect(result).toEqual([]);
    });
  });

  describe('checkPermission', () => {
    it('when org has read level, then read check returns true', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({
        collection_symbol: 'Collection D',
        collection_permissions: [
          { organisation_id: 'org-1', read: true, use: false, edit: false, owner: false },
        ],
      });

      const result = repo.checkPermission(created.collection_id, 'org-1', 'read');

      expect(result).toBe(true);
    });

    it('when org has read level, then use check returns false', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({
        collection_symbol: 'Collection E',
        collection_permissions: [
          { organisation_id: 'org-1', read: true, use: false, edit: false, owner: false },
        ],
      });

      const result = repo.checkPermission(created.collection_id, 'org-1', 'use');

      expect(result).toBe(false);
    });

    it('when org has use level, then read and use checks return true', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({
        collection_symbol: 'Collection F',
        collection_permissions: [
          { organisation_id: 'org-1', read: true, use: true, edit: false, owner: false },
        ],
      });

      expect(repo.checkPermission(created.collection_id, 'org-1', 'read')).toBe(true);
      expect(repo.checkPermission(created.collection_id, 'org-1', 'use')).toBe(true);
    });

    it('when org has owner level, then all checks return true', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({
        collection_symbol: 'Collection G',
        collection_permissions: [
          { organisation_id: 'org-1', read: true, use: true, edit: true, owner: true },
        ],
      });

      expect(repo.checkPermission(created.collection_id, 'org-1', 'read')).toBe(true);
      expect(repo.checkPermission(created.collection_id, 'org-1', 'use')).toBe(true);
      expect(repo.checkPermission(created.collection_id, 'org-1', 'edit')).toBe(true);
      expect(repo.checkPermission(created.collection_id, 'org-1', 'owner')).toBe(true);
    });

    it('when org has no permissions, then check returns false', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({
        collection_symbol: 'Collection H',
        collection_permissions: [
          { organisation_id: 'org-1', read: false, use: false, edit: false, owner: false },
        ],
      });

      const result = repo.checkPermission(created.collection_id, 'org-1', 'read');

      expect(result).toBe(false);
    });

    it('when a different org has permissions, then check returns false for the non-permitted org', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({
        collection_symbol: 'Collection I',
        collection_permissions: [
          { organisation_id: 'org-1', read: true, use: false, edit: false, owner: false },
        ],
      });

      const result = repo.checkPermission(created.collection_id, 'org-2', 'read');

      expect(result).toBe(false);
    });

    it('when org has edit level, then read and use and edit return true, owner returns false', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({
        collection_symbol: 'Collection J',
        collection_permissions: [
          { organisation_id: 'org-1', read: true, use: true, edit: true, owner: false },
        ],
      });

      expect(repo.checkPermission(created.collection_id, 'org-1', 'read')).toBe(true);
      expect(repo.checkPermission(created.collection_id, 'org-1', 'use')).toBe(true);
      expect(repo.checkPermission(created.collection_id, 'org-1', 'edit')).toBe(true);
      expect(repo.checkPermission(created.collection_id, 'org-1', 'owner')).toBe(false);
    });

    it('when org has owner only (read/use/edit false), then owner returns true, edit returns true (hierarchical)', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({
        collection_symbol: 'Collection K',
        collection_permissions: [
          { organisation_id: 'org-1', read: false, use: false, edit: false, owner: true },
        ],
      });

      expect(repo.checkPermission(created.collection_id, 'org-1', 'owner')).toBe(true);
      expect(repo.checkPermission(created.collection_id, 'org-1', 'edit')).toBe(true);
    });

    it('when collection has empty collection_permissions, then checkPermission returns false', () => {
      const repo = new InMemoryCollectionRepository();
      const created = repo.createCollection({
        collection_symbol: 'Collection L',
        collection_permissions: [],
      });

      const result = repo.checkPermission(created.collection_id, 'org-1', 'read');

      expect(result).toBe(false);
    });
  });
});
