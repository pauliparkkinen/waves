import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Strip the .js extension from relative imports so vite can find the .ts source file.
    // Node ESM requires .js extensions in source; vitest/vite needs to map them back to .ts.
    alias: [
      {
        find: /^(\..+)\.js$/,
        replacement: '$1',
      },
    ],
    extensions: ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs'],
  },
  test: {
    environment: 'node',
  },
});
