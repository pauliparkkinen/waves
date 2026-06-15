import type { TestGreeting, TestRecord } from '../types/test.types.js';
import type { ITestRepository } from '../repositories/test.repository.js';

export interface ITestService {
  getStatus(): TestGreeting;
  greet(name: string): TestGreeting;
  listRecords(): TestRecord[];
}

export class TestService implements ITestService {
  constructor(private readonly repository: ITestRepository) {}

  getStatus(): TestGreeting {
    return { message: 'Test module is working' };
  }

  greet(name: string): TestGreeting {
    const record = this.repository.findByName(name);
    return { message: `Hello, ${record?.name ?? name}!` };
  }

  listRecords(): TestRecord[] {
    return this.repository.listAll();
  }
}
