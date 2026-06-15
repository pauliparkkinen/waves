import { describe, it, expect } from 'vitest';
import { InMemoryTestRepository } from '../../repositories/test.repository.js';

describe('InMemoryTestRepository', () => {
  describe('findByName', () => {
    describe('given the seeded data', () => {
      it('when called with an existing name, then it returns the matching record', () => {
        const repo = new InMemoryTestRepository();

        const result = repo.findByName('World');

        expect(result).toEqual({ id: '1', name: 'World' });
      });

      it('when called with a name in different case, then it still returns the matching record', () => {
        const repo = new InMemoryTestRepository();

        const result = repo.findByName('world');

        expect(result).toEqual({ id: '1', name: 'World' });
      });

      it('when called with an unknown name, then it returns undefined', () => {
        const repo = new InMemoryTestRepository();

        const result = repo.findByName('Unknown');

        expect(result).toBeUndefined();
      });
    });
  });

  describe('listAll', () => {
    describe('given the seeded data', () => {
      it('when called, then it returns all seeded records', () => {
        const repo = new InMemoryTestRepository();

        const result = repo.listAll();

        expect(result).toEqual([
          { id: '1', name: 'World' },
          { id: '2', name: 'Waves' },
        ]);
      });
    });
  });
});
