# Planning Agent Instructions — Frontend UI

## Task ID: frontend-ui-planning-v1
## Created: 2026-05-28
## Target: Planning Agent (creates build specs)

---

## Context

This project is a **Markov-chain simulation visualizer** built as a **two-package web app**. The frontend is a **Next.js 15** (App Router) + **React 19** + **TypeScript** application.

### Current State

The frontend is at an early stage. It has:
- A root layout with auth-aware navigation (Nav, SignInButton, SignOutButton)
- A home page (`/`) showing auth status and backend connectivity
- Auth fully wired (NextAuth v5 with Zitadel/Keycloak, JWT token forwarding)
- Route protection middleware for `/dashboard/:path*`
- A server-side API client (`lib/api.ts`) with basic test endpoints and simulation types
- A server-side API client (`lib/api.ts`) with basic test endpoints
- Plain CSS styling (globals.css + extensive inline styles)
- **Vitest + @testing-library/react** — test infrastructure is set up; see `vitest.config.ts` and existing `__tests__/` directories
- **No state management** beyond React context and local useState/useRef

### Key Gaps / What's Missing

1. **No `/dashboard` page** — middleware protects it, home page links to it, but no page exists
2. **No simulation endpoint integrated** — types for `SimulationInput`/`SimulationOutput` exist in `api.ts` but no frontend page calls them yet
3. **Limited test coverage** — Vitest + @testing-library/react is set up but coverage is minimal
4. **No CSS framework** — single global CSS + inline styles (no Tailwind, no CSS modules)
5. **No state management library** — only SessionProvider context and local state

---

## Architecture Reference

### Routes (current)

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Home page — auth status, backend status, quick links |
| `/dashboard/:path*` | *(not yet created)* | Protected route, placeholder only |
| `/api/auth/[...nextauth]` | `src/app/api/auth/[...nextauth]/route.ts` | Auth.js API route handler |

### Component Tree

```
RootLayout (server)
├── Providers (client) — SessionProvider
│   ├── Nav (client)
│   └── Page (server or client)
│       ├── SignInButton (client)
│       └── SignOutButton (client)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout — wraps in Providers, renders Nav |
| `src/app/page.tsx` | Home page — server component, calls auth() and API |
| `src/app/providers.tsx` | SessionProvider wrapper (client component boundary) |
| `src/app/globals.css` | Global stylesheet (171 lines) |
| `src/app/components/Nav.tsx` | Navigation bar (client, uses useSession) |
| `src/app/components/SignInButton.tsx` | Sign-in button (client, calls signIn()) |
| `src/app/components/SignOutButton.tsx` | Sign-out button (client, calls signOut()) |
| *(no display components yet)* | Simulation visualizer components not yet created |
| `src/lib/api.ts` | Backend API client (server-only) |
| `src/auth.ts` | NextAuth v5 configuration |
| `src/middleware.ts` | Route protection for `/dashboard/:path*` |
| `src/types/next-auth.d.ts` | Auth type augmentation |

### Styling

- **Plain CSS** via `src/app/globals.css` (171 lines)
- Inline styles used sparingly; prefer CSS classes
- Key CSS classes: `.card`, `.badge`, `.btn-primary`, `.btn-secondary`, `.indicator-badge`, `.value-comparison`, `.error-message`, `.user-info`
- Main container: max-width 860px, centered
- No Tailwind, no CSS modules, no CSS-in-JS

### Auth Flow

```
User → /dashboard/* → middleware.ts checks auth → redirect to sign-in if no session
Sign-in → Zitadel/Keycloak OIDC → callback → JWT stores accessToken → session.accessToken
Server component → auth() → get session → pass accessToken to API client → Bearer header
```

### API Client Pattern

```typescript
// Server-only — no CORS concerns
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

function authHeaders(accessToken?: string): HeadersInit {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function getTestStatus(accessToken?: string): Promise<TestGreeting> {
  const res = await fetch(`${BACKEND_URL}/test`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(...);
  return res.json() as Promise<TestGreeting>;
}
```

---

## What The Planning Agent Needs To Produce

Based on the above, a build agent needs clear specifications for:

1. **`/dashboard` page(s)** — What should the dashboard show? Consider:
   - List of uploaded documents / conversion jobs
   - Navigation to document details
   - Any filters, search, pagination?

2. **Simulation visualizer** — A new client component for running simulations and displaying results. The API client already has `runSimulation()` and related types. What UI is needed?

3. **Conversions / PDF upload flow** — How does the user upload a PDF, trigger conversion, and view results?

4. **Testing** — What testing framework and patterns should be introduced? (Consider vitest like the backend, or Playwright for e2e?)

5. **Styling infrastructure** — Should we adopt Tailwind CSS, CSS modules, or continue with plain CSS + inline styles with a more structured approach?

6. **State management** — Should we introduce Zustand, React Context, or keep local state for the dashboard?

7. **Additional pages** — Beyond `/dashboard`, what other routes are needed? (e.g., settings, document detail, admin)

### Deliverable Format

Produce a structured build specification as a markdown file with:
- A unique task ID
- Clear scope boundaries (what to build and what NOT to build)
- File-by-file implementation plan
- Data flow diagrams for new features
- Type definitions for new API client functions
- Route map for new pages
- Component tree for new page hierarchies
- Testing requirements

---

## Constraints

- Must use Next.js 15 App Router conventions
- Server components by default, use `"use client"` only where needed
- All backend API calls must be server-side (via `lib/api.ts` or equivalent)
- Auth tokens must be forwarded as Bearer headers
- Follow existing code patterns (see `src/lib/api.ts` for API client pattern)
- No `.donotedit.` files should be touched
- Use the `@/*` path alias (maps to `./src/*`)
- Never implement anything — produce specifications only
