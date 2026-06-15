import type { Formula } from '../types/admin.types.js';
import type { IAdminRepository } from '../repositories/admin.repository.js';

export interface IAdminService {
  getStatus(): { status: string; module: string };

  // Formulas
  listFormulas(): Formula[];
  getFormula(id: string): Formula | undefined;
  createFormula(data: Omit<Formula, 'formula_id'>): Formula;
  updateFormula(id: string, data: Partial<Omit<Formula, 'formula_id'>>): Formula | undefined;
  deleteFormula(id: string): boolean;
}

export class AdminService implements IAdminService {
  constructor(private readonly repository: IAdminRepository) {}

  getStatus(): { status: string; module: string } {
    return { status: 'ok', module: 'admin' };
  }

  listFormulas(): Formula[] {
    return this.repository.listFormulas();
  }

  getFormula(id: string): Formula | undefined {
    return this.repository.getFormula(id);
  }

  createFormula(data: Omit<Formula, 'formula_id'>): Formula {
    return this.repository.createFormula(data);
  }

  updateFormula(id: string, data: Partial<Omit<Formula, 'formula_id'>>): Formula | undefined {
    return this.repository.updateFormula(id, data);
  }

  deleteFormula(id: string): boolean {
    return this.repository.deleteFormula(id);
  }
}
