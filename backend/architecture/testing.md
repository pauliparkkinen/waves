# Testing

## Framework

Unit tests use **[Vitest](https://vitest.dev)**, which supports native ESM and TypeScript without a separate compilation step.

## Running tests

```sh
pnpm test          # single run
pnpm test:watch    # watch mode
```

## Test format — Given-When-Then

All tests follow the **Given-When-Then** structure expressed through nested `describe`/`it` blocks:

```ts
describe('unit under test', () => {
  describe('given <precondition>', () => {
    it('when <action>, then <expected outcome>', async () => {
      // ...
    });
  });
});
```

This makes intent explicit without free-form prose and keeps tests self-documenting.

## Coverage

| File                   | Test file                             |
| ---------------------- | ------------------------------------- |
| `src/module-loader.ts` | `src/__tests__/module-loader.test.ts` |
| `src/app.ts`           | `src/__tests__/app.test.ts`           |
| `src/index.ts`         | `src/__tests__/index.test.ts`         |

## Mocking strategy

- **`node:fs`** is mocked at the module level via `vi.mock('node:fs')` so that file system calls in `module-loader.ts` are fully controlled in tests.
- **Dynamic import** in `loadModules` is injectable via the optional `importer` parameter, avoiding the need to mock `import()` directly.
- **`module-loader.ts`** is loaded with a dynamic `await import()` inside `createApp` (not a static top-level import). This lets vitest intercept it via `vi.mock` at runtime without vite needing to statically resolve and compile the file during test collection.
- **`@hono/node-server`** and **`app.ts`** are mocked in `index.test.ts` to prevent an actual HTTP server from starting during tests.
- **`module-loader.ts`** and **`config.ts`** are mocked in `app.test.ts` to isolate `createApp` from the file system.

## `vitest.config.ts` — `.js` → `.ts` resolution

Static imports in TypeScript ESM source files use `.js` extensions (required by Node.js ESM). Vitest/vite cannot resolve these directly. The config uses a regex alias to strip `.js` from relative imports, then `resolve.extensions` tries `.ts` first:

```ts
resolve: {
  alias: [{ find: /^(\..+)\.js$/, replacement: '$1' }],
  extensions: ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs'],
}
```

## `index.ts` guard

`src/index.ts` calls `main()` only when it is the Node.js entry point:

```ts
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
```

This prevents the server from starting when the module is imported by Vitest.
