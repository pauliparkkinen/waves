import type { Form } from './admin.types.js';

export type { Form };
export type CreateFormInput = Omit<Form, 'form_id'>;
export type UpdateFormInput = Partial<Omit<Form, 'form_id'>>;
