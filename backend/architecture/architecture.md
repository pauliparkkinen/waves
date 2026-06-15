# Backend Architecture

## Overview

The backend is a **Hono** HTTP application running on **Node.js** with **TypeScript**.

## Stack

| Concern    | Choice                                         |
| ---------- | ---------------------------------------------- |
| Framework  | [Hono](https://hono.dev)                       |
| Runtime    | Node.js (`@hono/node-server`)                  |
| Language   | TypeScript (ESM, `NodeNext` module resolution) |
| Dev runner | `tsx watch`                                    |

## Module System

All feature code lives under `backend/modules/`. Each subdirectory is a **module**, named after the URL prefix it owns.

```
backend/
  src/
    index.ts          – starts the HTTP server
    app.ts            – creates the Hono app and triggers module loading
    module-loader.ts  – auto-discovers and mounts modules at startup
  modules/
    <module-name>/
      index.ts                            – module entry point; wires dependencies and exports the router
      controllers/
        <module-name>.controller.ts       – HTTP layer; delegates all logic to a service; should not have direct repository access; should contain role validation and input data validation.
      services/
        <module-name>.service.ts          – business logic; interface + implementation in the same file
      repositories/
        <module-name>.repository.ts       – data access; interface + implementation in the same file
      types/
        <module-name>.types.ts            – shared types and interfaces; no business logic
```

### Module loading

At startup, `module-loader.ts` scans `modules/` for subdirectories. For each one it looks for `index.ts` (development / tsx) or `index.js` (compiled output) and dynamically imports it. The default-exported `Hono` router is mounted at `/<module-name>`.

### Module entry point (`index.ts`)

Each module must have an `index.ts` that instantiates concrete implementations, wires dependencies together, and exports the composed `Hono` router as the default export:

```ts
// modules/example/index.ts
import { Hono } from 'hono';
import { createExampleRouter } from './controllers/example.controller.js';
import { ExampleService } from './services/example.service.js';
import { InMemoryExampleRepository } from './repositories/example.repository.js';

const repository = new InMemoryExampleRepository();
const service = new ExampleService(repository);

const router = new Hono();
router.route('/', createExampleRouter(service));

export default router;
```

### Controller convention

Controllers are the HTTP layer only. They must not contain business logic or data-access code.

A controller is a **factory function** that receives a service abstraction and returns a `Hono` router:

```ts
// modules/example/controllers/example.controller.ts
import { Hono } from 'hono';
import type { IExampleService } from '../services/example.service.js';

export function createExampleRouter(service: IExampleService): Hono {
  const router = new Hono();

  router.get('/', (c) => c.json(service.getStatus()));

  return router;
}
```

### Service convention

Services contain all business logic. Each service file exports both the **interface** and the **implementation** class. The implementation receives repository abstractions via constructor injection — it must not import or instantiate any database client directly.

```ts
// modules/example/services/example.service.ts
import type { IExampleRepository } from '../repositories/example.repository.js';

export interface IExampleService {
  getStatus(): { message: string };
}

export class ExampleService implements IExampleService {
  constructor(private readonly repository: IExampleRepository) {}

  getStatus() {
    return { message: 'ok' };
  }
}
```

### Repository convention

Repositories contain all data-access logic (database queries, external API calls, etc.). Each repository file exports both the **interface** and at least one **implementation** class. Controllers and services must never import database clients directly.

```ts
// modules/example/repositories/example.repository.ts
import type { ExampleRecord } from '../types/example.types.js';

export interface IExampleRepository {
  findById(id: string): ExampleRecord | undefined;
}

export class InMemoryExampleRepository implements IExampleRepository {
  findById(id: string): ExampleRecord | undefined {
    return undefined;
  }
}
```

### Types convention

The `types/` folder contains only TypeScript `type` and `interface` declarations. No classes, no functions, no business logic.

## Template Module

`modules/test/` serves as the canonical template for new modules. Copy it, rename the folder and files, and update the route handlers.

## Path Conventions

| Pattern                      | Maps to                          |
| ---------------------------- | -------------------------------- |
| `router.get('/')`            | `GET /<module-name>/`            |
| `router.get('/hello/:name')` | `GET /<module-name>/hello/:name` |

## Adding a New Module

1. Create `modules/<name>/types/<name>.types.ts` — type definitions only.
2. Create `modules/<name>/repositories/<name>.repository.ts` — interface + implementation(s).
3. Create `modules/<name>/services/<name>.service.ts` — interface + implementation; inject the repository.
4. Create `modules/<name>/controllers/<name>.controller.ts` — factory function accepting the service interface.
5. Create `modules/<name>/index.ts` — instantiate concrete classes, wire them together, export the router.
6. Restart the server — the module is picked up automatically; no registration step needed.
