import type { AuthUser } from '../../../src/types/auth.types.js';
import type { Translation, CreateTranslationInput, UpdateTranslationInput } from '../types/translation.types.js';
import type { ITranslationRepository } from '../repositories/translation.repository.js';
import {
  validateTranslationInput,
  validateTranslationUpdateInput,
} from '../validators/translation.validator.js';

export interface ITranslationService {
  listTranslations(collectionId?: string, user?: AuthUser): Translation[];
  getTranslation(id: string, user?: AuthUser): Translation | undefined;
  createTranslation(data: CreateTranslationInput, user?: AuthUser): Translation;
  updateTranslation(id: string, data: UpdateTranslationInput, user?: AuthUser): Translation | undefined;
  deleteTranslation(id: string, user?: AuthUser): boolean;
}

export class TranslationService implements ITranslationService {
  constructor(
    private readonly translationRepository: ITranslationRepository,
  ) {}

  listTranslations(collectionId?: string, _user?: AuthUser): Translation[] {
    return this.translationRepository.listTranslations(collectionId);
  }

  getTranslation(id: string, _user?: AuthUser): Translation | undefined {
    return this.translationRepository.getTranslation(id);
  }

  createTranslation(data: CreateTranslationInput, user?: AuthUser): Translation {
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to create a translation');
    }
    validateTranslationInput(data);
    return this.translationRepository.createTranslation(data);
  }

  updateTranslation(id: string, data: UpdateTranslationInput, user?: AuthUser): Translation | undefined {
    const existing = this.translationRepository.getTranslation(id);
    if (!existing) return undefined;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to update a translation');
    }
    if (data.collection_id && data.collection_id !== existing.collection_id) {
      throw new Error('collection_id mismatch');
    }
    validateTranslationUpdateInput(data);
    return this.translationRepository.updateTranslation(id, data);
  }

  deleteTranslation(id: string, user?: AuthUser): boolean {
    const existing = this.translationRepository.getTranslation(id);
    if (!existing) return false;
    if (!user?.permissions.includes('admin:manage')) {
      throw new Error('Insufficient permissions: admin:manage required to delete a translation');
    }
    return this.translationRepository.deleteTranslation(id);
  }
}
