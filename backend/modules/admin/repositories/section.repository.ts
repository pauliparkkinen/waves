import type { Section, CreateSectionInput, UpdateSectionInput } from '../types/section.types.js';

export interface ISectionRepository {
  listSections(): Section[];
  getSection(id: string): Section | undefined;
  createSection(data: CreateSectionInput): Section;
  updateSection(id: string, data: UpdateSectionInput): Section | undefined;
  deleteSection(id: string): boolean;
}

export class InMemorySectionRepository implements ISectionRepository {
  private sections: Section[] = [];
  private nextId = 1;

  private generateId(): string {
    return `section-${this.nextId++}`;
  }

  listSections(): Section[] {
    return this.sections.map((s) => ({ ...s }));
  }

  getSection(id: string): Section | undefined {
    const s = this.sections.find((s) => s.section_id === id);
    return s ? { ...s } : undefined;
  }

  createSection(data: CreateSectionInput): Section {
    const section: Section = {
      section_id: this.generateId(),
      ...data,
    };
    this.sections.push(section);
    return { ...section };
  }

  updateSection(id: string, data: UpdateSectionInput): Section | undefined {
    const idx = this.sections.findIndex((s) => s.section_id === id);
    if (idx === -1) return undefined;
    const { section_id: _id, ...safeData } = data as Record<string, unknown>;
    this.sections[idx] = {
      ...this.sections[idx],
      ...safeData,
    } as Section;
    return { ...this.sections[idx] };
  }

  deleteSection(id: string): boolean {
    const idx = this.sections.findIndex((s) => s.section_id === id);
    if (idx === -1) return false;
    this.sections.splice(idx, 1);
    return true;
  }
}
