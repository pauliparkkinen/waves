import { describe, it, expect } from 'vitest';
import {
  validateFormInput,
  validateFormUpdateInput,
  FormValidationError,
} from '../../validators/form.validator.js';

const validForm = {
  collection_id: 'col-1',
  form_symbol: 'form-1',
  version: 1,
  status: 'draft' as const,
  form_sections: [
    { section_symbol: 'sec-1', version_number: 1, order_number: 0 },
  ],
  formulas: [],
  form_organisations: [],
  translations: [],
};

describe('validateFormInput', () => {
  it('given null input, then it throws FormValidationError', () => {
    expect(() => validateFormInput(null)).toThrow(FormValidationError);
  });

  it('given missing collection_id, then it throws', () => {
    const { collection_id: _, ...data } = validForm;
    expect(() => validateFormInput(data)).toThrow(FormValidationError);
  });

  it('given missing form_symbol, then it throws', () => {
    const { form_symbol: _, ...data } = validForm;
    expect(() => validateFormInput(data)).toThrow(FormValidationError);
  });

  it('given missing version, then it throws', () => {
    const { version: _, ...data } = validForm;
    expect(() => validateFormInput(data)).toThrow(FormValidationError);
  });

  it('given version < 1, then it throws', () => {
    const data = { ...validForm, version: 0 };
    expect(() => validateFormInput(data)).toThrow(FormValidationError);
  });

  it('given invalid status, then it throws', () => {
    const data = { ...validForm, status: 'invalid-status' };
    expect(() => validateFormInput(data)).toThrow(FormValidationError);
  });

  it('given missing form_sections, then it throws', () => {
    const { form_sections: _, ...data } = validForm;
    expect(() => validateFormInput(data)).toThrow(FormValidationError);
  });

  it('given form_sections is not an array, then it throws', () => {
    const data = { ...validForm, form_sections: 'not-array' };
    expect(() => validateFormInput(data)).toThrow(FormValidationError);
  });

  it('given form_sections item missing section_symbol, then it throws', () => {
    const data = {
      ...validForm,
      form_sections: [{ version_number: 1, order_number: 0 }],
    };
    expect(() => validateFormInput(data)).toThrow(FormValidationError);
  });

  it('given form_sections item with invalid version_number, then it throws', () => {
    const data = {
      ...validForm,
      form_sections: [{ section_symbol: 'sec-1', version_number: 0, order_number: 0 }],
    };
    expect(() => validateFormInput(data)).toThrow(FormValidationError);
  });

  it('given form_sections item with invalid order_number (negative), then it throws', () => {
    const data = {
      ...validForm,
      form_sections: [{ section_symbol: 'sec-1', version_number: 1, order_number: -1 }],
    };
    expect(() => validateFormInput(data)).toThrow(FormValidationError);
  });

  it('given invalid form_organisations, then it throws', () => {
    const data = {
      ...validForm,
      form_organisations: 'not-array',
    };
    expect(() => validateFormInput(data)).toThrow(FormValidationError);
  });

  it('given fully valid input, then it does not throw', () => {
    expect(() => validateFormInput(validForm)).not.toThrow();
  });
});

describe('validateFormUpdateInput', () => {
  it('given empty object (no fields), then it does not throw', () => {
    expect(() => validateFormUpdateInput({})).not.toThrow();
  });

  it('given partial valid fields, then it does not throw', () => {
    expect(() => validateFormUpdateInput({ form_symbol: 'updated-form', version: 2 })).not.toThrow();
  });

  it('given invalid individual fields, then it throws', () => {
    expect(() => validateFormUpdateInput({ version: 0 })).toThrow(FormValidationError);
  });

  it('given invalid status in update, then it throws', () => {
    expect(() => validateFormUpdateInput({ status: 'bogus' })).toThrow(FormValidationError);
  });

  it('given invalid form_sections in update, then it throws', () => {
    const data = {
      form_sections: [{ section_symbol: 'sec-1', version_number: 0, order_number: 0 }],
    };
    expect(() => validateFormUpdateInput(data)).toThrow(FormValidationError);
  });
});
