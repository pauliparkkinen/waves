# Frontend UI Architecture

> Last updated: 2026-05-28

## Overview

The frontend is a **Next.js 15** (App Router) + **React 19** + **TypeScript** application running on port **3002**. It communicates with the backend (port 3000/3001) server-side to avoid CORS issues.

**Key stack:**
- Next.js 15 (App Router, server components by default)
- React 19
- Auth.js (next-auth v5 beta) — OIDC via Zitadel or Keycloak
- Plain CSS (no Tailwind, no CSS-in-JS)
- No testing framework (no Vitest, no Jest, no Playwright)
- No state management library (only React context via SessionProvider)

---

## Routing

### Current Routes

| Route | File | Type | Purpose |
|-------|------|------|---------|
| `/` | `src/app/page.tsx` | **Page** (Server Component) | Home/dashboard landing page. Shows auth status, backend connectivity, and quick links. |
| `/dashboard/:path*` | *(not yet created)* | Protected | No page file exists yet. Middleware protects this path but it's a placeholder. |
| `/api/auth/[...nextauth]` | `src/app/api/auth/[...nextauth]/route.ts` | **API Route** | Catch-all for Auth.js flows (sign-in, callback, sign-out, session). Delegates to `auth.ts` handlers. |

### Future Routes (planned via existing references)

A link from the home page points to `/dashboard` for authenticated users. The middleware protects `/dashboard/:path*`, but no actual page file has been created yet.

---

## Application Structure

```
frontend/
├── package.json
├── next.config.ts                  # Minimal — empty config object
├── tsconfig.json                   # Path alias @/ → ./src/
├── .env.local                      # Active env vars (gitignored)
├── .env.local.example              # Template for new developers
└── src/
    ├── app/
    │   ├── layout.tsx              # Root layout (server component)
    │   ├── page.tsx                # Home page (server component)
    │   ├── providers.tsx           # SessionProvider wrapper (client component)
    │   ├── globals.css             # Global stylesheet (171 lines)
    │   ├── api/
    │   │   └── auth/
    │   │       └── [...nextauth]/
    │   │           └── route.ts    # Auth.js API route handler
    │   └── components/
    │       ├── Nav.tsx             # Navigation bar (client component)
    │       ├── SignInButton.tsx    # Sign-in button (client component)
    │       ├── SignOutButton.tsx   # Sign-out button (client component)
    │       <!-- no display components yet -->
    ├── lib/
    │   └── api.ts                  # Backend API client (server-only)
    ├── types/
    │   └── next-auth.d.ts          # Type augmentation for next-auth
    ├── auth.ts                     # NextAuth configuration
    └── middleware.ts               # Route protection (auth as middleware)
```

---

## Component Tree

```
RootLayout (server)
├── Providers (client) — SessionProvider
│   ├── Nav (client) — useSession() for auth state
│   └── Page (server or client)
│       ├── SignInButton (client) — calls signIn(provider)
│       └── SignOutButton (client) — calls signOut()
```

---

## Components — Detailed Reference

### Nav.tsx (`src/app/components/Nav.tsx`)
- **Client component** — uses `useSession()` from `next-auth/react`
- Shows a "Home" link via `<Link href="/">`
- When authenticated, displays the user's email on the right side
- Styled via `<nav>` element CSS and `.user-info` class

### SignInButton.tsx (`src/app/components/SignInButton.tsx`)
- **Client component** — uses `signIn()` from `next-auth/react`
- Reads `NEXT_PUBLIC_AUTH_PROVIDER` env var to determine provider (defaults to `"zitadel"`)
- Renders a `<button className="btn-primary">Sign in</button>`

### SignOutButton.tsx (`src/app/components/SignOutButton.tsx`)
- **Client component** — uses `signOut()` from `next-auth/react`
- Renders a `<button className="btn-secondary">Sign out</button>`

*(no display components yet — simulation visualizer components have not been created)*

### Providers.tsx (`src/app/providers.tsx`)
- Thin wrapper: renders `<SessionProvider>{children}</SessionProvider>`
- Marked `"use client"` so it can be used in the server-side RootLayout

---

## Styling Approach

**Plain CSS** with a single global stylesheet: `src/app/globals.css` (171 lines).

- No Tailwind CSS, no CSS modules, no CSS-in-JS
- Inline styles used sparingly; prefer CSS classes
- Key CSS classes:
  - `.card` — White background, border, rounded corners (for content sections)
  - `.badge` / `.badge.error` — Pill-shaped status indicators (green/red)
  - `.btn-primary` / `.btn-secondary` — Blue/gray buttons with hover transitions
  - `.indicator-badge` — Warning/duplicate/ingestion indicator pills
  - `.value-comparison` — Monospace display of old→new values (with `.old`, `.arrow`, `.new` spans)
  - `.warning-table-link` — Blue underlined links in warning sections
  - `.error-message` — Red error box
  - `.user-info` — Small gray text (email display in nav)
- `main` element: max-width 860px, centered, with 2rem/1.5rem padding

---

## Data Flow

### Backend Communication

All backend API calls happen **server-side** via `src/lib/api.ts`:

```
Browser → Next.js Server Component → auth() to get session
                                        ↓
                                   API client (lib/api.ts)
                                        ↓
                                   Backend HTTP (configurable BACKEND_URL)
                                        ↓
                                   Response → Server-rendered HTML
```

**API Client Functions:**

| Function | Method | Endpoint | Auth | Purpose |
|----------|--------|----------|------|---------|
| `getTestStatus(accessToken?)` | GET | `{BACKEND_URL}/test` | Optional Bearer | Check backend connectivity |
| `getTestRecords(accessToken)` | GET | `{BACKEND_URL}/test/records` | Required Bearer | Fetch test records |

**Key patterns:**
- All requests use `cache: "no-store"` (no Next.js data caching)
- Access token forwarded as `Authorization: Bearer <token>`
- `BACKEND_URL` defaults to `http://localhost:3000`, overridable via env var

### Authentication Flow

```
User visits /dashboard/*
    ↓
middleware.ts → auth() checks session
    ↓ (no session)                ↓ (has session)
Redirect to sign-in              Allow access
    ↓
User signs in via /api/auth/*
    ↓
OIDC provider (Zitadel/Keycloak) → callback
    ↓
JWT callback stores access_token → token.accessToken
    ↓
Session callback copies to → session.accessToken
    ↓
Server component passes accessToken to API client
```

---

## Authentication — Detailed

### Configuration (`src/auth.ts`)

Uses **NextAuth v5** (Auth.js beta) with two OIDC providers switched via `NEXT_PUBLIC_AUTH_PROVIDER`:

| Provider | Env Vars | Default? |
|----------|----------|----------|
| Zitadel | `ZITADEL_CLIENT_ID`, `ZITADEL_ISSUER` | Yes (default) |
| Keycloak | `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ISSUER` | No |

**Callbacks:**
- `jwt`: Persists `account.access_token` → `token.accessToken`
- `session`: Copies `token.accessToken` → `session.accessToken`

**Exports:** `handlers`, `auth`, `signIn`, `signOut`

### Type Augmentation (`src/types/next-auth.d.ts`)

```typescript
declare module "next-auth" {
  interface Session { accessToken?: string; }
}
declare module "next-auth/jwt" {
  interface JWT { accessToken?: string; }
}
```

### Middleware (`src/middleware.ts`)

- Exports `auth` as middleware function
- Protects route matcher: `["/dashboard/:path*"]`
- Unauthenticated users → redirected to sign-in

---

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `AUTH_SECRET` | Yes | — | Auth.js encryption secret |
| `AUTH_URL` | Yes | — | Frontend URL (http://localhost:3002) |
| `NEXT_PUBLIC_AUTH_PROVIDER` | No | `zitadel` | Which OIDC provider to use |
| `ZITADEL_CLIENT_ID` | Conditional | — | Zitadel client ID |
| `ZITADEL_ISSUER` | Conditional | — | Zitadel issuer URL |
| `KEYCLOAK_CLIENT_ID` | Conditional | — | Keycloak client ID |
| `KEYCLOAK_CLIENT_SECRET` | Conditional | — | Keycloak client secret |
| `KEYCLOAK_ISSUER` | Conditional | — | Keycloak issuer URL |
| `BACKEND_URL` | No | `http://localhost:3000` | Backend API base URL |

---

## Configuration Files

### `package.json`
- **Scripts:** `dev` (port 3002), `build`, `start` (port 3002)
- **Dependencies:** next ^15.3.0, next-auth ^5.0.0-beta.25, react ^19.0.0, react-dom ^19.0.0
- **Dev Dependencies:** @types/node, @types/react, @types/react-dom, typescript ^5.7.0
- **Testing:** Vitest + @testing-library/react — see `vitest.config.ts` and `package.json` scripts
- **No linting or formatting scripts**

### `next.config.ts`
- Empty config object `{}`
- No image domains, rewrites, redirects, or webpack customizations

### `tsconfig.json`
- Path alias `@/*` → `./src/*`
- JSX: preserve (Next.js handles compilation)
- Strict mode enabled
- Target: ES2017

---

## Known Gaps / Incomplete Areas

1. **No `/dashboard` page exists** — middleware protects the route, home page links to it, but no page file has been created
2. **No simulation visualizer components** — types and API client function exist in `api.ts` but no UI components have been built
3. **Testing** — Vitest with `@testing-library/react` is now set up. See `vitest.config.ts` and test files in `src/app/**/__tests__/`.
4. **No CSS framework** — styling uses a single global CSS file; no Tailwind, CSS modules, or CSS-in-JS
5. **No dedicated state management** — only React context (SessionProvider) and local useState/useRef
