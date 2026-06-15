import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { ITestService } from '../../services/test.service.js';
import { createTestRouter } from '../../controllers/test.controller.js';

function makeService(overrides: Partial<ITestService> = {}): ITestService {
  return {
    getStatus: vi.fn().mockReturnValue({ message: 'Test module is working' }),
    greet: vi.fn().mockReturnValue({ message: 'Hello, Test!' }),
    listRecords: vi.fn().mockReturnValue([]),
    ...overrides,
  };
}

describe('createTestRouter', () => {
  describe('GET /', () => {
    describe('given a mounted test router', () => {
      it('when the request is made, then it returns 200 with the service status', async () => {
        const service = makeService({
          getStatus: vi.fn().mockReturnValue({ message: 'Test module is working' }),
        });
        const app = new Hono().route('/', createTestRouter(service));

        const res = await app.request('http://localhost/');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ message: 'Test module is working' });
        expect(service.getStatus).toHaveBeenCalled();
      });
    });
  });

  describe('GET /hello/:name', () => {
    describe('given a name that the service resolves to a greeting', () => {
      it('when the request is made, then it returns 200 with the greeting from the service', async () => {
        const service = makeService({
          greet: vi.fn().mockReturnValue({ message: 'Hello, World!' }),
        });
        const app = new Hono().route('/', createTestRouter(service));

        const res = await app.request('http://localhost/hello/World');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ message: 'Hello, World!' });
        expect(service.greet).toHaveBeenCalledWith('World');
      });
    });

    describe('given a name that is not in the data', () => {
      it('when the request is made, then it returns 200 with a fallback greeting', async () => {
        const service = makeService({
          greet: vi.fn().mockReturnValue({ message: 'Hello, Unknown!' }),
        });
        const app = new Hono().route('/', createTestRouter(service));

        const res = await app.request('http://localhost/hello/Unknown');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ message: 'Hello, Unknown!' });
      });
    });
  });
});
