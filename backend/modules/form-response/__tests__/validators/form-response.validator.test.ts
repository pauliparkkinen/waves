import { describe, it, expect } from 'vitest';
import {
  validateCreateFormResponseInput,
  validateUpdateFormResponseInput,
  validateCreateQuestionResponseInput,
  FormResponseValidationError,
} from '../../validators/form-response.validator.js';

describe('validateCreateFormResponseInput', () => {
  describe('given valid input', () => {
    it('does not throw', () => {
      const input = {
        form_response_group_id: 'frg-1',
        collection_id: 'coll-1',
        form_symbol: 'form-a',
        form_version: 1,
        organization_id: 'org-1',
        user_id: 'user-1',
        filling_user_id: 'user-1',
      };
      expect(() => validateCreateFormResponseInput(input)).not.toThrow();
    });

    it('accepts optional started_timestamp', () => {
      const input = {
        form_response_group_id: 'frg-1',
        collection_id: 'coll-1',
        form_symbol: 'form-a',
        form_version: 1,
        organization_id: 'org-1',
        user_id: 'user-1',
        filling_user_id: 'user-1',
        started_timestamp: '2026-01-01T00:00:00.000Z',
      };
      expect(() => validateCreateFormResponseInput(input)).not.toThrow();
    });
  });

  describe('given missing organization_id', () => {
    it('throws FormResponseValidationError', () => {
      const input = {
        form_response_group_id: 'frg-1',
        collection_id: 'coll-1',
        form_symbol: 'form-a',
        form_version: 1,
        user_id: 'user-1',
        filling_user_id: 'user-1',
      };
      expect(() => validateCreateFormResponseInput(input)).toThrow(FormResponseValidationError);
    });
  });

  describe('given a non-object', () => {
    it('throws FormResponseValidationError', () => {
      expect(() => validateCreateFormResponseInput(null)).toThrow(FormResponseValidationError);
      expect(() => validateCreateFormResponseInput('string')).toThrow(FormResponseValidationError);
    });
  });

  describe('given missing required fields', () => {
    it('collects all errors', () => {
      try {
        validateCreateFormResponseInput({});
      } catch (e) {
        if (e instanceof FormResponseValidationError) {
          const fields = e.errors.map((err) => err.field);
          expect(fields).toContain('form_response_group_id');
          expect(fields).toContain('collection_id');
          expect(fields).toContain('form_symbol');
          expect(fields).toContain('form_version');
          expect(fields).toContain('organization_id');
          expect(fields).toContain('user_id');
          expect(fields).toContain('filling_user_id');
        } else {
          throw e;
        }
      }
    });
  });
});

describe('validateUpdateFormResponseInput', () => {
  describe('given valid input with version', () => {
    it('does not throw', () => {
      expect(() => validateUpdateFormResponseInput({ version: 1 })).not.toThrow();
    });

    it('accepts optional status as Submitted', () => {
      expect(() =>
        validateUpdateFormResponseInput({ version: 1, status: 'Submitted' }),
      ).not.toThrow();
    });
  });

  describe('given missing version', () => {
    it('throws FormResponseValidationError', () => {
      expect(() => validateUpdateFormResponseInput({})).toThrow(FormResponseValidationError);
    });
  });

  describe('given invalid status value', () => {
    it('throws FormResponseValidationError', () => {
      expect(() =>
        validateUpdateFormResponseInput({ version: 1, status: 'Invalid' }),
      ).toThrow(FormResponseValidationError);
    });
  });

  describe('given a status transition back to Draft', () => {
    it('throws FormResponseValidationError', () => {
      expect(() =>
        validateUpdateFormResponseInput({ version: 1, status: 'Draft' }),
      ).toThrow(FormResponseValidationError);
    });
  });

  describe('given a non-object', () => {
    it('throws FormResponseValidationError', () => {
      expect(() => validateUpdateFormResponseInput(null)).toThrow(FormResponseValidationError);
    });
  });
});

describe('validateCreateQuestionResponseInput', () => {
  describe('given valid input', () => {
    it('does not throw', () => {
      const input = {
        form_response_id: 'fr-1',
        collection_id: 'coll-1',
        question_symbol: 'q-1',
        question_version: 1,
      };
      expect(() => validateCreateQuestionResponseInput(input)).not.toThrow();
    });

    it('accepts optional response values', () => {
      const input = {
        form_response_id: 'fr-1',
        collection_id: 'coll-1',
        question_symbol: 'q-1',
        question_version: 1,
        response_value_text: 'answer',
      };
      expect(() => validateCreateQuestionResponseInput(input)).not.toThrow();
    });
  });

  describe('given missing required fields', () => {
    it('throws FormResponseValidationError', () => {
      expect(() => validateCreateQuestionResponseInput({})).toThrow(FormResponseValidationError);
    });
  });
});
