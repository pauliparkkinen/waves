import type { Section } from './admin.types.js';

export type { Section };
export type CreateSectionInput = Omit<Section, 'section_id'>;
export type UpdateSectionInput = Partial<Omit<Section, 'section_id'>>;
