import type { AuthUser } from '../../../src/types/auth.types.js';
import type { Collection } from '../types/admin.types.js';
import type { ICollectionRepository } from '../repositories/collection.repository.js';

export interface ICollectionService {
  getStatus(): { status: string; module: string };
  listCollections(user: AuthUser): Collection[];
  getCollection(id: string, user: AuthUser): Collection | undefined;
  createCollection(data: Omit<Collection, 'collection_id'>, user: AuthUser): Collection;
  updateCollection(id: string, data: Partial<Omit<Collection, 'collection_id'>>, user: AuthUser): Collection | undefined;
  deleteCollection(id: string, user: AuthUser): boolean;
}

export class CollectionService implements ICollectionService {
  constructor(private readonly repository: ICollectionRepository) {}

  getStatus(): { status: string; module: string } {
    return { status: 'ok', module: 'admin-collections' };
  }

  listCollections(user: AuthUser): Collection[] {
    if (user.permissions.includes('admin:manage')) {
      return this.repository.listCollections();
    }
    if (user.organisation_id) {
      return this.repository.findCollectionsByOrganisation(user.organisation_id);
    }
    return [];
  }

  getCollection(id: string, user: AuthUser): Collection | undefined {
    const collection = this.repository.getCollection(id);
    if (!collection) return undefined;
    if (user.permissions.includes('admin:manage')) {
      return collection;
    }
    if (user.organisation_id) {
      const hasRead = this.repository.checkPermission(id, user.organisation_id, 'read');
      if (hasRead) return collection;
    }
    return undefined;
  }

  createCollection(data: Omit<Collection, 'collection_id'>, user: AuthUser): Collection {
    if (!user.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to create a collection');
    }
    return this.repository.createCollection(data);
  }

  updateCollection(id: string, data: Partial<Omit<Collection, 'collection_id'>>, user: AuthUser): Collection | undefined {
    const existing = this.repository.getCollection(id);
    if (!existing) return undefined;
    if (user.permissions.includes('admin:manage')) {
      return this.repository.updateCollection(id, data);
    }
    if (user.organisation_id) {
      const isOwner = this.repository.checkPermission(id, user.organisation_id, 'owner');
      if (isOwner) {
        return this.repository.updateCollection(id, data);
      }
    }
    throw new Error('Insufficient permissions: admin:manage or owner required to update a collection');
  }

  deleteCollection(id: string, user: AuthUser): boolean {
    const existing = this.repository.getCollection(id);
    if (!existing) return false;
    if (user.permissions.includes('admin:manage')) {
      return this.repository.deleteCollection(id);
    }
    if (user.organisation_id) {
      const isOwner = this.repository.checkPermission(id, user.organisation_id, 'owner');
      if (isOwner) {
        return this.repository.deleteCollection(id);
      }
    }
    throw new Error('Insufficient permissions: admin:manage or owner required to delete a collection');
  }
}
