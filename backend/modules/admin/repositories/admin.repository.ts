import type { Formula } from '../types/admin.types.js';

export interface IAdminRepository {
  // Formulas
  listFormulas(): Formula[];
  getFormula(id: string): Formula | undefined;
  createFormula(data: Omit<Formula, 'formula_id'>): Formula;
  updateFormula(id: string, data: Partial<Omit<Formula, 'formula_id'>>): Formula | undefined;
  deleteFormula(id: string): boolean;
}

export class InMemoryAdminRepository implements IAdminRepository {
  private formulas: Formula[] = [];
  private nextId = 1;

  private generateId(): string {
    return `admin-${this.nextId++}`;
  }

  // Formulas
  listFormulas(): Formula[] {
    return [...this.formulas];
  }

  getFormula(id: string): Formula | undefined {
    return this.formulas.find((f) => f.formula_id === id);
  }

  createFormula(data: Omit<Formula, 'formula_id'>): Formula {
    const formula: Formula = {
      formula_id: this.generateId(),
      ...data,
    };
    this.formulas.push(formula);
    return formula;
  }

  updateFormula(id: string, data: Partial<Omit<Formula, 'formula_id'>>): Formula | undefined {
    const idx = this.formulas.findIndex((f) => f.formula_id === id);
    if (idx === -1) return undefined;
    this.formulas[idx] = { ...this.formulas[idx], ...data };
    return this.formulas[idx];
  }

  deleteFormula(id: string): boolean {
    const idx = this.formulas.findIndex((f) => f.formula_id === id);
    if (idx === -1) return false;
    this.formulas.splice(idx, 1);
    return true;
  }
}
