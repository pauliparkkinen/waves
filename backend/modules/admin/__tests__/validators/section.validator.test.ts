import { describe, it, expect } from 'vitest';
import {
  validateSectionInput,
  validateSectionUpdateInput,
  SectionValidationError,
} from '../../validators/section.validator.js';

const validSection = {
  section_symbol: 'sec-1',
  version: 1,
  status: 'draft' as const,
  condition_formula_id: undefined,
  section_questions: [
    { question_symbol: 'q1', version_number: 1, order_number: 0, required: true },
  ],
  translations: [],
};

describe('validateSectionInput', () => {
  describe('required fields', () => {
    it('given null input, then it throws SectionValidationError', () => {
      expect(() => validateSectionInput(null)).toThrow(SectionValidationError);
    });

    it('given missing section_symbol, then it throws with section_symbol error', () => {
      const { section_symbol: _, ...data } = validSection;
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });

    it('given missing version, then it throws with version error', () => {
      const { version: _, ...data } = validSection;
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });

    it('given missing status, then it throws with status error', () => {
      const { status: _, ...data } = validSection;
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });

    it('given invalid status value, then it throws with status error', () => {
      const data = { ...validSection, status: 'invalid-status' };
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });

    it('given version < 1, then it throws with version error', () => {
      const data = { ...validSection, version: 0 };
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });
  });

  describe('section_questions validation', () => {
    it('given missing section_questions, then it throws', () => {
      const { section_questions: _, ...data } = validSection;
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });

    it('given section_questions is not an array, then it throws', () => {
      const data = { ...validSection, section_questions: 'not-array' };
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });

    it('given section_questions item missing question_symbol, then it throws', () => {
      const data = {
        ...validSection,
        section_questions: [
          { version_number: 1, order_number: 0, required: true },
        ],
      };
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });

    it('given section_questions item with invalid version_number, then it throws', () => {
      const data = {
        ...validSection,
        section_questions: [
          { question_symbol: 'q1', version_number: 0, order_number: 0, required: true },
        ],
      };
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });

    it('given section_questions item with invalid order_number (negative), then it throws', () => {
      const data = {
        ...validSection,
        section_questions: [
          { question_symbol: 'q1', version_number: 1, order_number: -1, required: true },
        ],
      };
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });

    it('given section_questions item with missing required (not boolean), then it throws', () => {
      const data = {
        ...validSection,
        section_questions: [
          { question_symbol: 'q1', version_number: 1, order_number: 0, required: 'yes' },
        ],
      };
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });
  });

  describe('translations validation', () => {
    it('given valid translations, then it does not throw', () => {
      const data = {
        ...validSection,
        translations: [{ translation_symbol: 'ts-1', symbol: 'sym-1' }],
      };
      expect(() => validateSectionInput(data)).not.toThrow();
    });

    it('given invalid translations entries, then it throws', () => {
      const data = {
        ...validSection,
        translations: [{ not_valid: true }],
      };
      expect(() => validateSectionInput(data)).toThrow(SectionValidationError);
    });
  });

  describe('valid creation', () => {
    it('given fully valid input, then it does not throw', () => {
      expect(() => validateSectionInput(validSection)).not.toThrow();
    });
  });
});

describe('validateSectionUpdateInput', () => {
  describe('partial updates', () => {
    it('given empty object (no fields), then it does not throw', () => {
      expect(() => validateSectionUpdateInput({})).not.toThrow();
    });

    it('given only section_symbol, then it validates just that field', () => {
      expect(() => validateSectionUpdateInput({ section_symbol: '' })).toThrow(SectionValidationError);
    });

    it('given invalid status, then it throws', () => {
      expect(() => validateSectionUpdateInput({ status: 'bogus' })).toThrow(SectionValidationError);
    });

    it('given invalid version, then it throws', () => {
      expect(() => validateSectionUpdateInput({ version: 0 })).toThrow(SectionValidationError);
    });

    it('given invalid section_questions in update, then it throws', () => {
      const data = {
        section_questions: [{ question_symbol: 'q1', version_number: 0, order_number: 0, required: true }],
      };
      expect(() => validateSectionUpdateInput(data)).toThrow(SectionValidationError);
    });

    it('given invalid translations in update, then it throws', () => {
      const data = { translations: [{ bad: 'entry' }] };
      expect(() => validateSectionUpdateInput(data)).toThrow(SectionValidationError);
    });

    it('given valid partial update, then it does not throw', () => {
      const data = { section_symbol: 'updated-sec', version: 2 };
      expect(() => validateSectionUpdateInput(data)).not.toThrow();
    });
  });
});
