/**
 * Shared API client utilities.
 * All API modules import BACKEND_URL and authHeaders from here.
 */

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export function authHeaders(accessToken?: string): HeadersInit {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}
