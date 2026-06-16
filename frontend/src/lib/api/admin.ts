/**
 * Admin module API — mirrors backend modules/admin/ endpoints.
 * For server-side use only. Client components should use /api/admin/* proxy routes.
 */

import { BACKEND_URL, authHeaders } from "./client";

// ── Types ────────────────────────────────────────────────────────────────────

export type PublishStatus = "draft" | "published";

export type TranslationRef = {
  translation_symbol: string;
  symbol: string;
};

export type CollectionPermission = {
  organisation_id: string;
  read: boolean;
  use: boolean;
  edit: boolean;
  owner: boolean;
};

export type AdminCollection = {
  collection_id: string;
  collection_symbol: string;
  collection_permissions: CollectionPermission[];
};

export type FormSection = {
  section_symbol: string;
  version_number: number;
  order_number: number;
};

export type FormOrganisation = {
  organisation_id: string;
  read: boolean;
  use: boolean;
  edit: boolean;
  owner: boolean;
};

export type AdminForm = {
  collection_id: string;
  form_id: string;
  form_symbol: string;
  version: number;
  form_sections: FormSection[];
  formulas: string[];
  status: PublishStatus;
  form_organisations: FormOrganisation[];
  translations: TranslationRef[];
};

export type SectionQuestion = {
  question_symbol: string;
  version_number: number;
  order_number: number;
  required: boolean;
};

export type AdminSection = {
  section_id: string;
  section_symbol: string;
  collection_id: string;
  condition_formula_id?: string;
  version: number;
  status: PublishStatus;
  section_questions: SectionQuestion[];
  translations: TranslationRef[];
};

export type QuestionType =
  | "multiselect"
  | "select"
  | "radio"
  | "free-text"
  | "range";

export type QuestionParameters = Record<string, unknown>;

export type AdminQuestion = {
  collection_id: string;
  question_id: string;
  question_symbol: string;
  condition_formula_id?: string;
  type: QuestionType;
  version: number;
  parameters: QuestionParameters;
  created_at: string;
  updated_at: string;
  translations: TranslationRef[];
};

// ── Collections ──────────────────────────────────────────────────────────────

export async function listCollections(
  accessToken?: string
): Promise<AdminCollection[]> {
  const res = await fetch(`${BACKEND_URL}/admin/collections`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Backend /admin/collections returned ${res.status}`);
  return res.json() as Promise<AdminCollection[]>;
}

export async function getCollection(
  id: string,
  accessToken?: string
): Promise<AdminCollection | null> {
  const res = await fetch(`${BACKEND_URL}/admin/collections/${id}`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Backend /admin/collections/${id} returned ${res.status}`);
  return res.json() as Promise<AdminCollection>;
}

export async function createCollection(
  data: Omit<AdminCollection, "collection_id">,
  accessToken?: string
): Promise<AdminCollection> {
  const res = await fetch(`${BACKEND_URL}/admin/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Backend POST /admin/collections returned ${res.status}`);
  return res.json() as Promise<AdminCollection>;
}

export async function updateCollection(
  id: string,
  data: Partial<Omit<AdminCollection, "collection_id">>,
  accessToken?: string
): Promise<AdminCollection | null> {
  const res = await fetch(`${BACKEND_URL}/admin/collections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Backend PUT /admin/collections/${id} returned ${res.status}`);
  return res.json() as Promise<AdminCollection>;
}

export async function deleteCollection(
  id: string,
  accessToken?: string
): Promise<boolean> {
  const res = await fetch(`${BACKEND_URL}/admin/collections/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (res.status === 404) return false;
  if (!res.ok)
    throw new Error(
      `Backend DELETE /admin/collections/${id} returned ${res.status}`
    );
  return true;
}

// ── Forms ────────────────────────────────────────────────────────────────────

export async function listForms(
  accessToken?: string
): Promise<AdminForm[]> {
  const res = await fetch(`${BACKEND_URL}/admin/forms`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Backend /admin/forms returned ${res.status}`);
  return res.json() as Promise<AdminForm[]>;
}

export async function getForm(
  id: string,
  accessToken?: string
): Promise<AdminForm | null> {
  const res = await fetch(`${BACKEND_URL}/admin/forms/${id}`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Backend /admin/forms/${id} returned ${res.status}`);
  return res.json() as Promise<AdminForm>;
}

export async function createForm(
  data: Omit<AdminForm, "form_id">,
  accessToken?: string
): Promise<AdminForm> {
  const res = await fetch(`${BACKEND_URL}/admin/forms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Backend POST /admin/forms returned ${res.status}`);
  return res.json() as Promise<AdminForm>;
}

export async function updateForm(
  id: string,
  data: Partial<Omit<AdminForm, "form_id">>,
  accessToken?: string
): Promise<AdminForm | null> {
  const res = await fetch(`${BACKEND_URL}/admin/forms/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Backend PUT /admin/forms/${id} returned ${res.status}`);
  return res.json() as Promise<AdminForm>;
}

export async function deleteForm(
  id: string,
  accessToken?: string
): Promise<boolean> {
  const res = await fetch(`${BACKEND_URL}/admin/forms/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (res.status === 404) return false;
  if (!res.ok)
    throw new Error(`Backend DELETE /admin/forms/${id} returned ${res.status}`);
  return true;
}

// ── Sections ─────────────────────────────────────────────────────────────────

export async function listSections(
  accessToken?: string
): Promise<AdminSection[]> {
  const res = await fetch(`${BACKEND_URL}/admin/sections`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Backend /admin/sections returned ${res.status}`);
  return res.json() as Promise<AdminSection[]>;
}

export async function getSection(
  id: string,
  accessToken?: string
): Promise<AdminSection | null> {
  const res = await fetch(`${BACKEND_URL}/admin/sections/${id}`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Backend /admin/sections/${id} returned ${res.status}`);
  return res.json() as Promise<AdminSection>;
}

export async function createSection(
  data: Omit<AdminSection, "section_id">,
  accessToken?: string
): Promise<AdminSection> {
  const res = await fetch(`${BACKEND_URL}/admin/sections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Backend POST /admin/sections returned ${res.status}`);
  return res.json() as Promise<AdminSection>;
}

export async function updateSection(
  id: string,
  data: Partial<Omit<AdminSection, "section_id">>,
  accessToken?: string
): Promise<AdminSection | null> {
  const res = await fetch(`${BACKEND_URL}/admin/sections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Backend PUT /admin/sections/${id} returned ${res.status}`);
  return res.json() as Promise<AdminSection>;
}

export async function deleteSection(
  id: string,
  accessToken?: string
): Promise<boolean> {
  const res = await fetch(`${BACKEND_URL}/admin/sections/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (res.status === 404) return false;
  if (!res.ok)
    throw new Error(
      `Backend DELETE /admin/sections/${id} returned ${res.status}`
    );
  return true;
}

// ── Questions ────────────────────────────────────────────────────────────────

export async function listQuestions(
  collectionId?: string,
  accessToken?: string
): Promise<AdminQuestion[]> {
  const url = collectionId
    ? `${BACKEND_URL}/admin/questions?collectionId=${encodeURIComponent(collectionId)}`
    : `${BACKEND_URL}/admin/questions`;
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Backend /admin/questions returned ${res.status}`);
  return res.json() as Promise<AdminQuestion[]>;
}

export async function getQuestion(
  id: string,
  accessToken?: string
): Promise<AdminQuestion | null> {
  const res = await fetch(`${BACKEND_URL}/admin/questions/${id}`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Backend /admin/questions/${id} returned ${res.status}`);
  return res.json() as Promise<AdminQuestion>;
}

export async function createQuestion(
  data: Omit<AdminQuestion, "question_id" | "created_at" | "updated_at">,
  accessToken?: string
): Promise<AdminQuestion> {
  const res = await fetch(`${BACKEND_URL}/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Backend POST /admin/questions returned ${res.status}`);
  return res.json() as Promise<AdminQuestion>;
}

export async function updateQuestion(
  id: string,
  data: Partial<
    Omit<AdminQuestion, "question_id" | "created_at" | "updated_at">
  >,
  accessToken?: string
): Promise<AdminQuestion | null> {
  const res = await fetch(`${BACKEND_URL}/admin/questions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(
      `Backend PUT /admin/questions/${id} returned ${res.status}`
    );
  return res.json() as Promise<AdminQuestion>;
}

export async function deleteQuestion(
  id: string,
  accessToken?: string
): Promise<boolean> {
  const res = await fetch(`${BACKEND_URL}/admin/questions/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (res.status === 404) return false;
  if (!res.ok)
    throw new Error(
      `Backend DELETE /admin/questions/${id} returned ${res.status}`
    );
  return true;
}
