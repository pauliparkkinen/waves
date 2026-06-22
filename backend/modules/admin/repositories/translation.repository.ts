import type { Translation, CreateTranslationInput, UpdateTranslationInput } from '../types/translation.types.js';

export interface ITranslationRepository {
  listTranslations(collectionId?: string): Translation[];
  getTranslation(id: string): Translation | undefined;
  createTranslation(data: CreateTranslationInput): Translation;
  updateTranslation(id: string, data: UpdateTranslationInput): Translation | undefined;
  deleteTranslation(id: string): boolean;
}

export class InMemoryTranslationRepository implements ITranslationRepository {
  private translations: Translation[] = [];
  private nextId = 1;

  private generateId(): string {
    return `translation-${this.nextId++}`;
  }

  listTranslations(collectionId?: string): Translation[] {
    const items = collectionId
      ? this.translations.filter((t) => t.collection_id === collectionId)
      : this.translations;
    return items.map((t) => ({ ...t }));
  }

  getTranslation(id: string): Translation | undefined {
    const t = this.translations.find((t) => t.translation_id === id);
    return t ? { ...t } : undefined;
  }

  createTranslation(data: CreateTranslationInput): Translation {
    const translation: Translation = {
      translation_id: this.generateId(),
      version: 1,
      ...data,
    };
    this.translations.push(translation);
    return { ...translation };
  }

  updateTranslation(id: string, data: UpdateTranslationInput): Translation | undefined {
    const idx = this.translations.findIndex((t) => t.translation_id === id);
    if (idx === -1) return undefined;
    const safeData: Partial<Translation> = {};
    if (data.symbol !== undefined) safeData.symbol = data.symbol;
    if (data.locale_code !== undefined) safeData.locale_code = data.locale_code;
    if (data.value !== undefined) safeData.value = data.value;
    if (data.status !== undefined) safeData.status = data.status;
    this.translations[idx] = { ...this.translations[idx], ...safeData };
    return { ...this.translations[idx] };
  }

  deleteTranslation(id: string): boolean {
    const idx = this.translations.findIndex((t) => t.translation_id === id);
    if (idx === -1) return false;
    this.translations.splice(idx, 1);
    return true;
  }
}
