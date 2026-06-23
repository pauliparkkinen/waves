/**
 * src/utils/auth.ts
 *
 * Authentication and authorisation utilities.
 *
 * PROVIDER-SPECIFIC NOTE
 * Provider-specific claim extraction is isolated in `extractPermissions`.
 * Both Zitadel and Keycloak role formats are supported out of the box.
 * To add another OIDC provider, only that function needs to change.
 *
 * USAGE
 * 1. Set the AUTH_JWKS_URI environment variable to the provider's JWKS endpoint.
 *    Zitadel example: https://<domain>/oauth/v2/keys
 * 2. Pass createJwtMiddleware() to app.use() in app.ts (done automatically).
 * 3. In controllers, wrap handlers with requirePermissions([...]).
 */

import { readFileSync } from 'node:fs';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { HTTPException } from 'hono/http-exception';
import type { MiddlewareHandler } from 'hono';
import type { AuthUser } from '../types/auth.types.js';
import { audit } from './audit.js';

const roleToPermissions: Record<string, string[]> = JSON.parse(
  readFileSync(new URL('../permissions.json', import.meta.url), 'utf-8')
);

// ---------------------------------------------------------------------------
// Zitadel-specific claim extraction
// All provider-specific logic is confined to this function.
// ---------------------------------------------------------------------------

/**
 * Zitadel encodes project roles as:
 *   "urn:zitadel:iam:org:project:<projectId>:roles": { "role-name": { ... } }
 *
 * Keycloak encodes roles as:
 *   realm_access.roles: ["role-name", ...]          (realm-level roles)
 *   resource_access.<clientId>.roles: ["role-name", ...]  (client-level roles)
 *
 * Standard OAuth2 scopes arrive as a space-separated `scope` string.
 * All sources are collected into a flat permissions array.
 */
function extractPermissions(payload: JWTPayload & Record<string, unknown>): string[] {
  const permissions: string[] = [];

  // Standard OAuth2 scope claim
  if (typeof payload.scope === 'string') {
    permissions.push(...payload.scope.split(' ').filter(Boolean));
  }

  const roles: string[] = [];

  // Zitadel project role claims
  for (const [key, value] of Object.entries(payload)) {
    if (
      key.endsWith(':roles') &&
      key.startsWith('urn:zitadel:') &&
      typeof value === 'object' &&
      value !== null
    ) {
      roles.push(...Object.keys(value as Record<string, unknown>));
    }
  }

  // Keycloak realm-level roles
  const realmAccess = payload['realm_access'];
  if (typeof realmAccess === 'object' && realmAccess !== null && 'roles' in realmAccess) {
    const realmRoles = (realmAccess as Record<string, unknown>)['roles'];
    if (Array.isArray(realmRoles)) {
      roles.push(...realmRoles.filter((r): r is string => typeof r === 'string'));
    }
  }

  // Keycloak client-level roles
  const resourceAccess = payload['resource_access'];
  if (typeof resourceAccess === 'object' && resourceAccess !== null) {
    for (const client of Object.values(resourceAccess as Record<string, unknown>)) {
      if (typeof client === 'object' && client !== null && 'roles' in client) {
        const clientRoles = (client as Record<string, unknown>)['roles'];
        if (Array.isArray(clientRoles)) {
          roles.push(...clientRoles.filter((r): r is string => typeof r === 'string'));
        }
      }
    }
  }

  for (const role of roles) {
    const perms = roleToPermissions[role];
    if (perms) {
      permissions.push(...perms);
    } else {
      // Role name has no mapping — treat it as a direct permission.
      permissions.push(role);
    }
  }

  return [...new Set(permissions)];
}

// ---------------------------------------------------------------------------
// Middleware factories
// ---------------------------------------------------------------------------

/**
 * Creates a Hono middleware that validates a Bearer JWT against the given
 * JWKS URI. When a valid token is present it populates `c.get('user')`.
 *
 * This middleware is non-blocking for unauthenticated requests — routes that
 * require authentication must additionally use `requirePermissions`.
 *
 * @param jwksUri - The JWKS endpoint URL of the OIDC provider.
 */
export function createJwtMiddleware(jwksUri: string): MiddlewareHandler {
  const JWKS = createRemoteJWKSet(new URL(jwksUri));

  return async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const { payload } = await jwtVerify(token, JWKS);
        const user: AuthUser = {
          sub: typeof payload.sub === 'string' ? payload.sub : '',
          email: typeof payload.email === 'string' ? payload.email : undefined,
          organisation_id: typeof payload.organisation_id === 'string'
            ? payload.organisation_id
            : typeof payload.org_id === 'string'
              ? payload.org_id
              : typeof payload['https://waves/org_id'] === 'string'
                ? payload['https://waves/org_id']
                : undefined,
          permissions: extractPermissions(payload as JWTPayload & Record<string, unknown>),
        };
        c.set('user', user);
        audit.authSuccess({ sub: user.sub });
      } catch (e) {
        const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
        audit.authFailure({ reason: 'Invalid or expired token', error: e instanceof Error ? e.message : String(e), ip });
        throw new HTTPException(401, { message: 'Invalid or expired token' });
      }
    }

    await next();
  };
}

/**
 * Returns a Hono middleware that enforces authentication and specific
 * permissions on a route (ALL required permissions must be present).
 *
 * Responds with:
 * - 401 when no authenticated user is present on the context.
 * - 403 when the user lacks one or more of the required permissions.
 *
 * Must be used downstream of the JWT middleware created by createJwtMiddleware.
 *
 * @example
 * router.get('/records', requirePermissions(['records:read', 'records:write']), handler)
 */
export function requirePermissions(required: string[]): MiddlewareHandler {
  return async (context, next) => {
    const user = context.get('user');

    if (!user) {
      const ip = context.req.header('x-forwarded-for') ?? context.req.header('x-real-ip');
      audit.authFailure({ reason: 'Authentication required', ip });
      throw new HTTPException(401, { message: 'Authentication required' });
    }

    const missing = required.filter((p) => !user.permissions.includes(p));
    if (missing.length > 0) {
      audit.authDenied({
        reason: 'Insufficient permissions',
        sub: user.sub,
        permissions: missing,
      });
      throw new HTTPException(403, { message: `Insufficient permissions: ${missing.join(', ')}` });
    }

    await next();
  };
}

/**
 * Returns a Hono middleware that enforces authentication and requires
 * **at least one** of the listed permissions to be present (OR semantics).
 *
 * Responds with:
 * - 401 when no authenticated user is present on the context.
 * - 403 when the user has none of the required permissions.
 *
 * Must be used downstream of the JWT middleware created by createJwtMiddleware.
 *
 * @example
 * router.get('/responses', requireAnyPermission([
 *   'form:response:read:own',
 *   'form:response:read:org',
 * ]), handler)
 */
export function requireAnyPermission(required: string[]): MiddlewareHandler {
  return async (context, next) => {
    const user = context.get('user');

    if (!user) {
      const ip = context.req.header('x-forwarded-for') ?? context.req.header('x-real-ip');
      audit.authFailure({ reason: 'Authentication required', ip });
      throw new HTTPException(401, { message: 'Authentication required' });
    }

    const hasAny = required.some((p) => user.permissions.includes(p));
    if (!hasAny) {
      audit.authDenied({
        reason: 'Insufficient permissions',
        sub: user.sub,
        permissions: required,
      });
      throw new HTTPException(403, { message: 'Insufficient permissions' });
    }

    await next();
  };
}
