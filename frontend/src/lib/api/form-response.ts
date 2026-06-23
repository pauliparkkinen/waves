/**
 * Form Response API client — mirrors backend modules/form-response/ endpoints.
 * Server-side only. Client components use /api/form-response/* proxy routes.
 */

import { BACKEND_URL, authHeaders } from "./client";

// ── Types ────────────────────────────────────────────────────────────────────

export type FormResponseStatus = "draft" | "submitted";

export type FormResponseGroup = {
  form_response_group_id: string;
  form_responses: FormResponseSummary[];
};

export type FormResponseSummary = {
  form_response_id: string;
  form_symbol: string;
  form_version: number;
  status: FormResponseStatus;
  started_timestamp: string;
  submitted_timestamp?: string;
};

export type FormResponse = {
  form_response_id: string;
  form_response_group_id: string;
  collection_id: string;
  form_symbol: string;
  form_version: number;
  user_id: string;
  filling_user_id: string;
  status: FormResponseStatus;
  started_timestamp: string;
  submitted_timestamp?: string;
  question_responses: QuestionResponse[];
};

export type QuestionResponse = {
  question_response_id?: string;
  form_response_id: string;
  collection_id: string;
  question_symbol: string;
  question_version: number;
  response_value_text?: string;
  response_value_number?: number;
  response_value_boolean?: boolean;
};

// ── Form Definition Types (loaded alongside form response) ──────────────────

export type FormDefinition = {
  collection_id: string;
  form_symbol: string;
  version: number;
  form_sections: FormSectionRef[];
  status: "draft" | "published";
  translations: Record<string, string>; // locale → title
};

export type FormSectionRef = {
  section_symbol: string;
  version_number: number;
  order_number: number;
};

export type SectionDefinition = {
  section_symbol: string;
  version: number;
  section_questions: SectionQuestionRef[];
  condition_formula_id?: string;
  status: "draft" | "published";
  translations: Record<string, string>; // locale → title
};

export type SectionQuestionRef = {
  question_symbol: string;
  version_number: number;
  order_number: number;
  required: boolean;
};

export type QuestionDefinition = {
  question_symbol: string;
  version: number;
  type: "multiselect" | "select" | "radio" | "free-text" | "range";
  parameters: Record<string, unknown>;
  condition_formula_id?: string;
  translations: Record<string, string>; // locale → title/text
};

// ── API Functions ────────────────────────────────────────────────────────────

export async function getFormResponseGroup(
  groupId: string,
  accessToken?: string
): Promise<FormResponseGroup> {
  const res = await fetch(`${BACKEND_URL}/form-response/groups/${groupId}`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Backend /form-response/groups/${groupId} returned ${res.status}`);
  return res.json() as Promise<FormResponseGroup>;
}

export async function getFormDefinitions(
  collectionId: string,
  formSymbols: string[],
  accessToken?: string
): Promise<FormDefinition[]> {
  const params = new URLSearchParams();
  formSymbols.forEach((s) => params.append("symbol", s));
  const res = await fetch(
    `${BACKEND_URL}/admin/forms/definitions?collection_id=${collectionId}&${params}`,
    { headers: authHeaders(accessToken), cache: "no-store" }
  );
  if (!res.ok)
    throw new Error(`Backend /admin/forms/definitions returned ${res.status}`);
  return res.json() as Promise<FormDefinition[]>;
}

export async function saveQuestionResponse(
  formResponseId: string,
  data: Omit<QuestionResponse, "question_response_id" | "form_response_id">,
  accessToken?: string
): Promise<QuestionResponse> {
  const res = await fetch(
    `${BACKEND_URL}/form-response/responses/${formResponseId}/questions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
      body: JSON.stringify(data),
      cache: "no-store",
    }
  );
  if (!res.ok)
    throw new Error(
      `Backend POST /form-response/responses/${formResponseId}/questions returned ${res.status}`
    );
  return res.json() as Promise<QuestionResponse>;
}

export async function submitFormResponseGroup(
  groupId: string,
  accessToken?: string
): Promise<void> {
  const res = await fetch(
    `${BACKEND_URL}/form-response/groups/${groupId}/submit`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      cache: "no-store",
    }
  );
  if (!res.ok)
    throw new Error(
      `Backend POST /form-response/groups/${groupId}/submit returned ${res.status}`
    );
}
