import type {
  FormulaValue,
  CreateFormulaValueInput,
} from '../types/formula-value.types.js';

export interface IFormulaValueRepository {
  list(opts?: { collectionId?: string; entityId?: string; formulaSymbol?: string }): FormulaValue[];
  get(id: string): FormulaValue | undefined;
  create(input: CreateFormulaValueInput): FormulaValue;
  delete(id: string): boolean;
}

export class InMemoryFormulaValueRepository implements IFormulaValueRepository {
  private items: FormulaValue[] = [];
  private nextId = 1;

  private generateId(): string {
    return `fv-${this.nextId++}`;
  }

  list(opts?: {
    collectionId?: string;
    entityId?: string;
    formulaSymbol?: string;
  }): FormulaValue[] {
    let results = [...this.items];
    if (opts?.collectionId) {
      results = results.filter((fv) => fv.collection_id === opts.collectionId);
    }
    if (opts?.entityId) {
      results = results.filter((fv) => fv.entity_id === opts.entityId);
    }
    if (opts?.formulaSymbol) {
      results = results.filter((fv) => fv.formula_symbol === opts.formulaSymbol);
    }
    return results;
  }

  get(id: string): FormulaValue | undefined {
    return this.items.find((fv) => fv.formula_value_id === id);
  }

  create(input: CreateFormulaValueInput): FormulaValue {
    const value: FormulaValue = {
      formula_value_id: this.generateId(),
      collection_id: input.collection_id,
      formula_symbol: input.formula_symbol,
      formula_version: input.formula_version,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      value: input.value,
      inputs: input.inputs,
      computed_at: new Date().toISOString(),
    };
    this.items.push(value);
    return { ...value };
  }

  delete(id: string): boolean {
    const idx = this.items.findIndex((fv) => fv.formula_value_id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }
}
