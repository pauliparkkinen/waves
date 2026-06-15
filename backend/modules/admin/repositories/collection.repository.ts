import type { Collection } from '../types/admin.types.js';

export interface ICollectionRepository {
  listCollections(): Collection[];
  getCollection(id: string): Collection | undefined;
  createCollection(data: Omit<Collection, 'collection_id'>): Collection;
  updateCollection(id: string, data: Partial<Omit<Collection, 'collection_id'>>): Collection | undefined;
  deleteCollection(id: string): boolean;
  findCollectionsByOrganisation(orgId: string): Collection[];
  checkPermission(collectionId: string, orgId: string, requiredLevel: 'read' | 'use' | 'edit' | 'owner'): boolean;
}

export class InMemoryCollectionRepository implements ICollectionRepository {
  private collections: Collection[] = [];
  private nextId = 1;

  private generateId(): string {
    return `collection-${this.nextId++}`;
  }

  listCollections(): Collection[] {
    return [...this.collections];
  }

  getCollection(id: string): Collection | undefined {
    return this.collections.find((c) => c.collection_id === id);
  }

  createCollection(data: Omit<Collection, 'collection_id'>): Collection {
    const collection: Collection = {
      collection_id: this.generateId(),
      ...data,
    };
    this.collections.push(collection);
    return collection;
  }

  updateCollection(id: string, data: Partial<Omit<Collection, 'collection_id'>>): Collection | undefined {
    const idx = this.collections.findIndex((c) => c.collection_id === id);
    if (idx === -1) return undefined;
    this.collections[idx] = { ...this.collections[idx], ...data };
    return this.collections[idx];
  }

  deleteCollection(id: string): boolean {
    const idx = this.collections.findIndex((c) => c.collection_id === id);
    if (idx === -1) return false;
    this.collections.splice(idx, 1);
    return true;
  }

  findCollectionsByOrganisation(orgId: string): Collection[] {
    return this.collections.filter((c) =>
      c.collection_permissions.some((p) => p.organisation_id === orgId && p.read)
    );
  }

  checkPermission(collectionId: string, orgId: string, requiredLevel: 'read' | 'use' | 'edit' | 'owner'): boolean {
    const collection = this.collections.find((c) => c.collection_id === collectionId);
    if (!collection) return false;
    const perm = collection.collection_permissions.find((p) => p.organisation_id === orgId);
    if (!perm) return false;
    const levelHierarchy: Record<string, number> = { read: 0, use: 1, edit: 2, owner: 3 };
    const LEVEL_KEYS = ['read', 'use', 'edit', 'owner'] as const;
    const userLevel = LEVEL_KEYS
      .filter((key) => perm[key])
      .map((key) => levelHierarchy[key])
      .reduce((max, curr) => Math.max(max, curr), -1);
    const requiredLevelNum = levelHierarchy[requiredLevel];
    return userLevel >= requiredLevelNum;
  }
}
