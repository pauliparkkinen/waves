import { describe, it, expect, vi } from 'vitest';
import { TestService } from '../../services/test.service.js';
import type { ITestRepository } from '../../repositories/test.repository.js';

function makeRepository(overrides: Partial<ITestRepository> = {}): ITestRepository {
  return {
    findByName: vi.fn().mockReturnValue(undefined),
    listAll: vi.fn().mockReturnValue([]),
    ...overrides,
  };
}

describe('TestService', () => {
  describe('getStatus', () => {
    describe('given a TestService instance', () => {
      it('when called, then it returns a message indicating the module is working', () => {
        const service = new TestService(makeRepository());

        const result = service.getStatus();

        expect(result).toEqual({ message: 'Test module is working' });
      });
    });
  });

  describe('greet', () => {
    describe('given a name that exists in the repository', () => {
      it('when called, then it returns a greeting using the stored record name', () => {
        const repo = makeRepository({
          findByName: vi.fn().mockReturnValue({ id: '1', name: 'World' }),
        });
        const service = new TestService(repo);

        const result = service.greet('world');

        expect(result).toEqual({ message: 'Hello, World!' });
        expect(repo.findByName).toHaveBeenCalledWith('world');
      });
    });

    describe('given a name that does not exist in the repository', () => {
      it('when called, then it returns a greeting using the provided name as fallback', () => {
        const repo = makeRepository({ findByName: vi.fn().mockReturnValue(undefined) });
        const service = new TestService(repo);

        const result = service.greet('Stranger');

        expect(result).toEqual({ message: 'Hello, Stranger!' });
      });
    });
  });

  describe('listRecords', () => {
    describe('given a repository with records', () => {
      it('when called, then it returns all records from the repository', () => {
        const records = [
          { id: '1', name: 'World' },
          { id: '2', name: 'Waves' },
        ];
        const repo = makeRepository({ listAll: vi.fn().mockReturnValue(records) });
        const service = new TestService(repo);

        const result = service.listRecords();

        expect(result).toEqual(records);
        expect(repo.listAll).toHaveBeenCalled();
      });
    });

    describe('given a repository with no records', () => {
      it('when called, then it returns an empty array', () => {
        const service = new TestService(makeRepository());

        const result = service.listRecords();

        expect(result).toEqual([]);
      });
    });
  });
});
