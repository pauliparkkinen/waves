import type { AuthUser } from '../../../src/types/auth.types.js';
import type { Collection, CollectionPermission } from '../types/admin.types.js';
import type { ICollectionRepository } from '../repositories/collection.repository.js';

export interface ICollectionService {
  getStatus(): { status: string; module: string };
  listCollections(user: AuthUser): Collection[];
  getCollection(id: string, user: AuthUser): Collection | undefined;
  createCollection(data: Omit<Collection, 'collection_id'>, user: AuthUser): Collection;
  updateCollection(id: string, data: Partial<Omit<Collection, 'collection_id'>>, user: AuthUser): Collection | undefined;
  deleteCollection(id: string, user: AuthUser): boolean;
}

function validateSingleOwner(permissions: CollectionPermission[]): void {
  const owners = permissions.filter((p) => p.owner);
  if (owners.length !== 1) {
    throw new Error(
      `A collection must have exactly one organisation with owner rights (found ${owners.length})`
    );
  }
}

/**
 * Ensures the creating user's organisation is present with full owner rights.
 */
function ensureUserOrgOwns(
  permissions: CollectionPermission[],
  userOrgId: string | undefined
): CollectionPermission[] {
  if (!userOrgId) return permissions;

  const existing = permissions.find((p) => p.organisation_id === userOrgId);
  if (existing) {
    return permissions.map((p) =>
      p.organisation_id === userOrgId
        ? { ...p, read: true, use: true, edit: true, owner: true }
        : p
    );
  }

  return [
    ...permissions,
    {
      organisation_id: userOrgId,
      read: true,
      use: true,
      edit: true,
      owner: true,
    },
  ];
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

    // Auto-assign the user's organisation as owner with all permissions
    const permissions = ensureUserOrgOwns(data.collection_permissions ?? [], user.organisation_id);

    // Validate exactly one owner
    validateSingleOwner(permissions);

    return this.repository.createCollection({ ...data, collection_permissions: permissions });
  }

  updateCollection(id: string, data: Partial<Omit<Collection, 'collection_id'>>, user: AuthUser): Collection | undefined {
    const existing = this.repository.getCollection(id);
    if (!existing) return undefined;
    if (user.permissions.includes('admin:manage') || 
        (user.organisation_id && this.repository.checkPermission(id, user.organisation_id, 'owner'))) {
      // Validate single owner when permissions are being updated
      if (data.collection_permissions) {
        validateSingleOwner(data.collection_permissions);
      }
      return this.repository.updateCollection(id, data);
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
