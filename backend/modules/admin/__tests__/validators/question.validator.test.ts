import { describe, it, expect } from 'vitest';
import { validateQuestionInput, validateQuestionUpdateInput, QuestionValidationError } from '../../validators/question.validator.js';

const validFreeText = {
  collection_id: 'col-1',
  question_symbol: 'q1',
  type: 'free-text',
  version: 1,
  parameters: { max_length: 100, placeholder: 'Enter text', multiline: false },
  translations: [],
};

const validRange = {
  collection_id: 'col-1',
  question_symbol: 'q1',
  type: 'range',
  version: 1,
  parameters: { min: 0, max: 100, step: 5, min_label: 'Low', max_label: 'High' },
  translations: [],
};

const validOptionsQuestion = {
  collection_id: 'col-1',
  question_symbol: 'q1',
  type: 'select',
  version: 1,
  parameters: {
    options: [
      { label: 'A', value: 'a', order_index: 0 },
      { label: 'B', value: 'b', order_index: 1 },
    ],
  },
  translations: [],
};

describe('validateQuestionInput', () => {
  describe('required fields', () => {
    it('given null input, then it throws QuestionValidationError', () => {
      expect(() => validateQuestionInput(null)).toThrow(QuestionValidationError);
    });

    it('given missing collection_id, then it throws with collection_id error', () => {
      const { collection_id: _, ...data } = validFreeText;
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given missing question_symbol, then it throws with question_symbol error', () => {
      const { question_symbol: _, ...data } = validFreeText;
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given missing type, then it throws with type error', () => {
      const { type: _, ...data } = validFreeText;
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given missing version, then it throws with version error', () => {
      const { version: _, ...data } = validFreeText;
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given invalid type value, then it throws with type error', () => {
      const data = { ...validFreeText, type: 'invalid-type' };
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given version < 1, then it throws with version error', () => {
      const data = { ...validFreeText, version: 0 };
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });
  });

  describe('valid creation for each type', () => {
    it('given free-text type with valid free-text parameters, then it does not throw', () => {
      expect(() => validateQuestionInput(validFreeText)).not.toThrow();
    });

    it('given range type with valid range parameters, then it does not throw', () => {
      expect(() => validateQuestionInput(validRange)).not.toThrow();
    });

    it('given select type with 2+ options, then it does not throw', () => {
      expect(() => validateQuestionInput(validOptionsQuestion)).not.toThrow();
    });

    it('given multiselect type with 2+ options, then it does not throw', () => {
      const data = { ...validOptionsQuestion, type: 'multiselect' as const };
      expect(() => validateQuestionInput(data)).not.toThrow();
    });

    it('given radio type with 2+ options, then it does not throw', () => {
      const data = { ...validOptionsQuestion, type: 'radio' as const };
      expect(() => validateQuestionInput(data)).not.toThrow();
    });
  });

  describe('missing parameters for types that require them', () => {
    it('given range type without parameters, then it throws', () => {
      const { parameters: _, ...data } = validRange;
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given select type without parameters, then it throws', () => {
      const { parameters: _, ...data } = validOptionsQuestion;
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given free-text type without parameters, then it does not throw', () => {
      const { parameters: _, ...data } = validFreeText;
      expect(() => validateQuestionInput(data)).not.toThrow();
    });
  });

  describe('type-specific parameter validation', () => {
    it('given free-text with negative max_length, then it throws with parameters.max_length error', () => {
      const data = {
        ...validFreeText,
        parameters: { ...validFreeText.parameters, max_length: -1 },
      };
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given range with min > max, then it throws with parameters.min error', () => {
      const data = {
        ...validRange,
        parameters: { ...validRange.parameters, min: 100, max: 0 },
      };
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given range with step: NaN, then it throws', () => {
      const data = {
        ...validRange,
        parameters: { ...validRange.parameters, step: NaN },
      };
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given range with step: 0, then it throws', () => {
      const data = {
        ...validRange,
        parameters: { ...validRange.parameters, step: 0 },
      };
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given select with fewer than 2 options, then it throws with parameters.options error', () => {
      const data = {
        ...validOptionsQuestion,
        parameters: {
          options: [{ label: 'A', value: 'a', order_index: 0 }],
        },
      };
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given radio with fewer than 2 options, then it throws', () => {
      const data = {
        ...validOptionsQuestion,
        type: 'radio' as const,
        parameters: {
          options: [{ label: 'A', value: 'a', order_index: 0 }],
        },
      };
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given multiselect with min_select > max_select, then it throws with parameters.min_select error', () => {
      const data = {
        ...validOptionsQuestion,
        type: 'multiselect' as const,
        parameters: {
          options: [
            { label: 'A', value: 'a', order_index: 0 },
            { label: 'B', value: 'b', order_index: 1 },
          ],
          min_select: 3,
          max_select: 1,
        },
      };
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });

    it('given invalid translations entries, then it throws', () => {
      const data = {
        ...validFreeText,
        translations: [{ not_valid: true }],
      };
      expect(() => validateQuestionInput(data)).toThrow(QuestionValidationError);
    });
  });
});

describe('validateQuestionUpdateInput', () => {
  describe('partial updates', () => {
    it('given empty object (no fields), then it does not throw (empty update is allowed)', () => {
      expect(() => validateQuestionUpdateInput({})).not.toThrow();
    });

    it('given only question_symbol, then it validates just that field', () => {
      expect(() => validateQuestionUpdateInput({ question_symbol: '' })).toThrow(QuestionValidationError);
    });

    it('given only type change without parameters, then it does not validate parameters', () => {
      expect(() => validateQuestionUpdateInput({ type: 'free-text' })).not.toThrow();
    });

    it('given type AND parameters both present, then it validates parameters', () => {
      const data = { type: 'free-text', parameters: { max_length: -1 } };
      expect(() => validateQuestionUpdateInput(data)).toThrow(QuestionValidationError);
    });

    it('given range type AND parameters both present with min > max, then it throws', () => {
      const data = { type: 'range', parameters: { min: 10, max: 5 } };
      expect(() => validateQuestionUpdateInput(data)).toThrow(QuestionValidationError);
    });

    it('given invalid translations in update, then it throws', () => {
      const data = { translations: [{ bad: 'entry' }] };
      expect(() => validateQuestionUpdateInput(data)).toThrow(QuestionValidationError);
    });
  });
});
