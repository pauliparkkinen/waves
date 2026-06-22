import { describe, it, expect, vi } from 'vitest';
import { TranslationService } from '../../services/translation.service.js';
import type { ITranslationRepository } from '../../repositories/translation.repository.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';

// ---- Helpers ----

const adminUser: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
const nonAdminUser: AuthUser = { sub: 'u-2', permissions: ['read'] };

const validData = {
  collection_id: 'col-1',
  symbol: 'greeting',
  locale_code: 'en',
  value: 'Hello',
  status: 'draft' as const,
};

const existingTranslation = {
  translation_id: 'translation-1',
  ...validData,
  version: 1,
};

function makeTranslationRepo(
  overrides: Partial<ITranslationRepository> = {},
): ITranslationRepository {
  return {
    listTranslations: vi.fn().mockReturnValue([existingTranslation]),
    getTranslation: vi.fn().mockImplementation((id: string) =>
      id === 'translation-1' ? { ...existingTranslation } : undefined,
    ),
    createTranslation: vi.fn().mockImplementation((data) => ({
      translation_id: 'translation-new',
      version: 1,
      ...data,
    })),
    updateTranslation: vi.fn().mockImplementation((id, data) =>
      id === 'translation-1' ? { ...existingTranslation, ...data } : undefined,
    ),
    deleteTranslation: vi.fn().mockImplementation((id: string) => id === 'translation-1'),
    ...overrides,
  };
}

function createService(repo?: ITranslationRepository): TranslationService {
  return new TranslationService(repo ?? makeTranslationRepo());
}

// ---- Tests ----

describe('TranslationService', () => {
  describe('listTranslations', () => {
    describe('given a service with translations', () => {
      it('when called without collection filter, then it returns all translations', () => {
        const service = createService();

        const result = service.listTranslations();

        expect(result).toHaveLength(1);
        expect(result[0].symbol).toBe('greeting');
      });

      it('when called with a collection id, then it passes the filter to the repository', () => {
        const repo = makeTranslationRepo();
        const service = createService(repo);

        service.listTranslations('col-1');

        expect(repo.listTranslations).toHaveBeenCalledWith('col-1');
      });
    });
  });

  describe('getTranslation', () => {
    describe('given an existing translation', () => {
      it('when called with its id, then it returns the translation', () => {
        const service = createService();

        const result = service.getTranslation('translation-1');

        expect(result).toBeDefined();
        expect(result!.translation_id).toBe('translation-1');
      });
    });

    describe('given a non-existent translation', () => {
      it('when called, then it returns undefined', () => {
        const service = createService();

        const result = service.getTranslation('nonexistent');

        expect(result).toBeUndefined();
      });
    });
  });

  describe('createTranslation', () => {
    describe('given an admin user', () => {
      it('when valid data is provided, then it creates the translation', () => {
        const service = createService();

        const result = service.createTranslation(validData, adminUser);

        expect(result.translation_id).toBe('translation-new');
        expect(result.symbol).toBe('greeting');
      });

      it('when invalid data is provided, then it throws a TranslationValidationError', () => {
        const service = createService();
        const invalidData = { collection_id: '' } as never;

        expect(() => service.createTranslation(invalidData, adminUser)).toThrow(
          'Translation validation failed',
        );
      });
    });

    describe('given a non-admin user', () => {
      it('when called, then it throws a permission error', () => {
        const service = createService();

        expect(() => service.createTranslation(validData, nonAdminUser)).toThrow(
          'Insufficient permissions',
        );
      });
    });
  });

  describe('updateTranslation', () => {
    describe('given an admin user', () => {
      it('when the translation exists, then it updates and returns it', () => {
        const service = createService();

        const result = service.updateTranslation(
          'translation-1',
          { symbol: 'updated' },
          adminUser,
        );

        expect(result).toBeDefined();
        expect(result!.symbol).toBe('updated');
      });

      it('when the translation does not exist, then it returns undefined', () => {
        const service = createService();

        const result = service.updateTranslation('nonexistent', { symbol: 'updated' }, adminUser);

        expect(result).toBeUndefined();
      });
    });

    describe('given a non-admin user', () => {
      it('when called, then it throws a permission error', () => {
        const service = createService();

        expect(() =>
          service.updateTranslation('translation-1', { symbol: 'updated' }, nonAdminUser),
        ).toThrow('Insufficient permissions');
      });
    });
  });

  describe('deleteTranslation', () => {
    describe('given an admin user', () => {
      it('when the translation exists, then it deletes and returns true', () => {
        const service = createService();

        const result = service.deleteTranslation('translation-1', adminUser);

        expect(result).toBe(true);
      });

      it('when the translation does not exist, then it returns false', () => {
        const service = createService();

        const result = service.deleteTranslation('nonexistent', adminUser);

        expect(result).toBe(false);
      });
    });

    describe('given a non-admin user', () => {
      it('when called, then it throws a permission error', () => {
        const service = createService();

        expect(() => service.deleteTranslation('translation-1', nonAdminUser)).toThrow(
          'Insufficient permissions',
        );
      });
    });
  });
});
