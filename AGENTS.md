# Agent Guide — waves

This file is the entry point for AI agents working in this repository.

## Project Overview

Two-package web app: **backend** (Node.js/Hono/TypeScript) + **frontend** (Next.js 15/React 19/TypeScript).
The app extracts tables from PDFs and converts numeric values using configurable rules.

## Developer Commands

### Backend (`backend/`)

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server with `tsx watch` (default port 3000, override with `PORT=`) |
| `pnpm start` | Run once via `tsx` |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm test` | Run Vitest tests once |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm format` / `pnpm format:check` | Prettier |
| `npx tsx run_converter.mts <pdf-path> [--json]` | End-to-end PDF extraction → numeric conversion |

### Frontend (`frontend/`)

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Next.js dev server on port **3002** |
| `pnpm build` | Production build |
| `pnpm start` | Start production server on port **3002** |

### Pre-commit

`simple-git-hooks` + `lint-staged` run `prettier --write` on staged `*.{ts,js,json,md}` files.
Hooks are configured in `backend/package.json` — run `npx simple-git-hooks` from `backend/` to install.

## Architecture

### Backend Module System

- Each subdirectory under `backend/modules/` is a **module**, auto-mounted at `/<module-name>` by `module-loader.ts`.
- No registration step needed — just create the folder and restart.
- `waves.config.json` controls which modules are active (`"*"` = all, or an array of names).

Module structure (copy `modules/test/` as template):

```
modules/<name>/
  index.ts                          – wire deps, export Hono router as default
  controllers/<name>.controller.ts  – HTTP layer only; factory function receiving service interface
  services/<name>.service.ts        – business logic; exports interface + implementation
  repositories/<name>.repository.ts – data access; exports interface + implementation
  types/<name>.types.ts             – types only, no logic
```

### Key Backend Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Entry point; has `main()` guard so it doesn't start server when imported by tests |
| `src/app.ts` | Creates Hono app, loads config, mounts modules |
| `src/module-loader.ts` | Scans `modules/` and dynamically imports each `index.ts` |
| `src/config.ts` | Reads `waves.config.json` |

### Auth

- **Backend**: JWT middleware activated when `AUTH_JWKS_URI` env var is set; falls back to mock auth otherwise.
- **Frontend**: NextAuth v5 (beta) with Zitadel or Keycloak. Set `NEXT_PUBLIC_AUTH_PROVIDER` to switch.
- Frontend middleware protects `/dashboard/:path*`.

### ESM `.js` Extension Quirk

Source files use `.js` extensions in imports (required by Node.js ESM). The `vitest.config.ts` alias strips `.js` from relative imports so Vitest resolves to `.ts` files. **Always use `.js` extensions in import paths**, even for `.ts` files.

## Testing

- Framework: **Vitest** (node environment).
- Format: **Given-When-Then** via nested `describe`/`it` blocks.
- `fs`, dynamic imports, and `@hono/node-server` are mocked — see `backend/architecture/testing.md` for details.
- Core tests: `src/__tests__/module-loader.test.ts`, `app.test.ts`, `index.test.ts`.
- Each module has its own `__tests__/` directory.

## Environment

### Backend
- `.env` exists with `CLIENT_ID`.
- `AUTH_JWKS_URI` — enables real JWT auth (omit for mock).
- `PORT` — override default 3000.

### Frontend
- Copy `.env.local.example` → `.env.local` and fill in values.
- `AUTH_SECRET` — generate with `openssl rand -base64 32`.
- `BACKEND_URL` — points to backend (default `http://localhost:3001`).

## Code Style

- Prettier: single quotes, semicolons, print width 100, trailing commas (es5).
- Controllers must not contain business logic or direct data access.
- Services/repositories export both interface and implementation in the same file.
- Constructor injection only — no direct instantiation of dependencies inside classes.

## Architecture Docs

- [`backend/architecture/architecture.md`](backend/architecture/architecture.md) — full module system, conventions, how to add a module.
- [`backend/architecture/testing.md`](backend/architecture/testing.md) — test format, mocking strategy, vitest config quirks.

## Rules

- Never edit files containing `.donotedit.` in the file name.
- Always plan and review UI changes against accessibility requirements REQ-13 - REQ-17.
- Always ensure that UI is mobile friendly while being usable on a PC. The approach should be mobile-first.

# Documentation
The documentation (i.e., tasks, requirements, features, risks, threats mitigations, etc) should be kept up to date with the 'process_guard' software which can be found in the command line. For further information on  how  the process_guard works, see ../process_guard_application. The documentation folder should not be touched manually.

