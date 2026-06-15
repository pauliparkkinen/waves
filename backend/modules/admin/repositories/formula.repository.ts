import type { Formula, CreateFormulaInput, UpdateFormulaInput } from '../types/formula.types.js';

export interface IFormulaRepository {
  listFormulas(collectionId?: string): Formula[];
  getFormula(id: string): Formula | undefined;
  createFormula(data: CreateFormulaInput): Formula;
  updateFormula(id: string, data: UpdateFormulaInput): Formula | undefined;
  deleteFormula(id: string): boolean;
}

export class InMemoryFormulaRepository implements IFormulaRepository {
  private formulas: Formula[] = [];
  private nextId = 1;

  private generateId(): string {
    return `formula-${this.nextId++}`;
  }

  listFormulas(collectionId?: string): Formula[] {
    const items = collectionId
      ? this.formulas.filter((f) => f.collection_id === collectionId)
      : this.formulas;
    return items.map((f) => ({ ...f }));
  }

  getFormula(id: string): Formula | undefined {
    const f = this.formulas.find((f) => f.formula_id === id);
    return f ? { ...f } : undefined;
  }

  createFormula(data: CreateFormulaInput): Formula {
    const formula: Formula = {
      formula_id: this.generateId(),
      ...data,
    };
    this.formulas.push(formula);
    return { ...formula };
  }

  updateFormula(id: string, data: UpdateFormulaInput): Formula | undefined {
    const idx = this.formulas.findIndex((f) => f.formula_id === id);
    if (idx === -1) return undefined;
    // Strip identity fields to prevent runtime overwrite
    const { formula_id: _id, ...safeData } = data as Record<string, unknown>;
    this.formulas[idx] = { ...this.formulas[idx], ...safeData } as Formula;
    return { ...this.formulas[idx] };
  }

  deleteFormula(id: string): boolean {
    const idx = this.formulas.findIndex((f) => f.formula_id === id);
    if (idx === -1) return false;
    this.formulas.splice(idx, 1);
    return true;
  }
}
