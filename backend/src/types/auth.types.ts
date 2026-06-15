/**
 * Represents the authenticated user extracted from a verified JWT.
 * This type is provider-agnostic — provider-specific claims are mapped
 * to this shape in src/utils/auth.ts.
 */
export type AuthUser = {
  /** Subject identifier (user ID) */
  sub: string;
  /** Email address, if present in the token */
  email?: string;
  /** Organisation ID, if present in the token */
  organisation_id?: string;
  /** Flat list of permissions/scopes granted to the user */
  permissions: string[];
};

/**
 * Augments Hono's ContextVariableMap so that `c.get('user')` and
 * `c.set('user', ...)` are typed everywhere without needing per-router
 * generic parameters.
 */
declare module 'hono' {
  interface ContextVariableMap {
    user?: AuthUser;
  }
}
