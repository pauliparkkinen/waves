import type { PublishStatus } from './admin.types.js';

export type Translation = {
  translation_id: string;
  collection_id: string;
  symbol: string;
  locale_code: string;
  value: string;
  version: number;
  status: PublishStatus;
};

export type CreateTranslationInput = {
  collection_id: string;
  symbol: string;
  locale_code: string;
  value: string;
  status: PublishStatus;
};

export type UpdateTranslationInput = Partial<{
  collection_id: string;
  symbol: string;
  locale_code: string;
  value: string;
  status: PublishStatus;
}>;
