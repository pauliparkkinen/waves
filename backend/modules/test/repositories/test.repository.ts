import type { TestRecord } from '../types/test.types.js';

export interface ITestRepository {
  findByName(name: string): TestRecord | undefined;
  listAll(): TestRecord[];
}

export class InMemoryTestRepository implements ITestRepository {
  private readonly records: TestRecord[] = [
    { id: '1', name: 'World' },
    { id: '2', name: 'Waves' },
  ];

  findByName(name: string): TestRecord | undefined {
    return this.records.find((r) => r.name.toLowerCase() === name.toLowerCase());
  }

  listAll(): TestRecord[] {
    return this.records;
  }
}
