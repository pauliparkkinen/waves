/**
 * Test module API — mirrors backend modules/test/ endpoints.
 * For server-side use only. Client components should use /api/* proxy routes.
 */

import { BACKEND_URL, authHeaders } from "./client";

// ── Types ────────────────────────────────────────────────────────────────────

export type TestGreeting = {
  message: string;
};

export type TestRecord = {
  id: string;
  name: string;
};

// ── Functions ────────────────────────────────────────────────────────────────

export async function getTestStatus(
  accessToken?: string
): Promise<TestGreeting> {
  const res = await fetch(`${BACKEND_URL}/test`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Backend /test returned ${res.status}`);
  return res.json() as Promise<TestGreeting>;
}

export async function getTestRecords(
  accessToken: string
): Promise<TestRecord[]> {
  const res = await fetch(`${BACKEND_URL}/test/records`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Backend /test/records returned ${res.status}`);
  return res.json() as Promise<TestRecord[]>;
}
