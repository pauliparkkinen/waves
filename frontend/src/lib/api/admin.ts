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
  value_type?: 'number' | 'boolean' | 'string';
  version: number;
  parameters: QuestionParameters;
  created_at: string;
  updated_at: string;
  translations: TranslationRef[];
};

// ── Formula Types ─────────────────────────────────────────────────────────────

export type OutputType = 'number' | 'boolean';

export type FormulaReferenceType = 'formula' | 'activity';

export type FormulaReference = {
  formula_reference_id: string;
  symbol: string;
  type: FormulaReferenceType;
  referenced_formula_id?: string;
};

export type BinaryOperator = '+' | '-' | '*' | '/';
export type LogicalOperator = '&&' | '||';
export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==';
export type FunctionName = 'max' | 'min';

export type AstLiteralNode = { type: 'literal'; value: number | boolean };
export type AstVariableNode = { type: 'variable'; name: string };
export type AstBinaryExpressionNode = { type: 'binary_expression'; operator: BinaryOperator; left: AstNode; right: AstNode };
export type AstLogicalExpressionNode = { type: 'logical_expression'; operator: LogicalOperator; left: AstNode; right: AstNode };
export type AstComparisonExpressionNode = { type: 'comparison_expression'; operator: ComparisonOperator; left: AstNode; right: AstNode };
export type AstUnaryExpressionNode = { type: 'unary_expression'; operator: '-'; operand: AstNode };
export type AstTernaryExpressionNode = { type: 'ternary_expression'; condition: AstNode; true_branch: AstNode; false_branch: AstNode };
export type AstFunctionCallNode = { type: 'function_call'; function: FunctionName; arguments: AstNode[] };

export type AstNode =
  | AstLiteralNode
  | AstVariableNode
  | AstBinaryExpressionNode
  | AstLogicalExpressionNode
  | AstComparisonExpressionNode
  | AstUnaryExpressionNode
  | AstTernaryExpressionNode
  | AstFunctionCallNode;

export type Formula = {
  collection_id: string;
  formula_id: string;
  symbol: string;
  expression: AstNode;
  output_type: OutputType;
  formula_references: FormulaReference[];
};

export type CreateFormulaInput = Omit<Formula, 'formula_id'>;
export type UpdateFormulaInput = Partial<Omit<Formula, 'formula_id'>>;

// ── Translation Types ──────────────────────────────────────────────────────────

export type Translation = {
  translation_id: string;
  collection_id: string;
  symbol: string;
  locale_code: string;
  value: string;
  version: number;
  status: PublishStatus;
};

export type CreateTranslationInput = {
  collection_id: string;
  symbol: string;
  locale_code: string;
  value: string;
  status: PublishStatus;
};

export type UpdateTranslationInput = Partial<{
  symbol: string;
  locale_code: string;
  value: string;
  status: PublishStatus;
}>;

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

// ── Formulas ──────────────────────────────────────────────────────────────────

export async function listFormulas(
  collectionId?: string,
  accessToken?: string
): Promise<Formula[]> {
  const url = collectionId
    ? `${BACKEND_URL}/admin/formulas?collection_id=${encodeURIComponent(collectionId)}`
    : `${BACKEND_URL}/admin/formulas`;
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
    cache: 'no-store',
  });
  if (!res.ok)
    throw new Error(`Backend /admin/formulas returned ${res.status}`);
  return res.json() as Promise<Formula[]>;
}

export async function getFormula(
  id: string,
  accessToken?: string
): Promise<Formula | null> {
  const res = await fetch(`${BACKEND_URL}/admin/formulas/${id}`, {
    headers: authHeaders(accessToken),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Backend /admin/formulas/${id} returned ${res.status}`);
  return res.json() as Promise<Formula>;
}

export async function createFormula(
  data: CreateFormulaInput,
  accessToken?: string
): Promise<Formula> {
  const res = await fetch(`${BACKEND_URL}/admin/formulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok)
    throw new Error(`Backend POST /admin/formulas returned ${res.status}`);
  return res.json() as Promise<Formula>;
}

export async function updateFormula(
  id: string,
  data: UpdateFormulaInput,
  accessToken?: string
): Promise<Formula | null> {
  const res = await fetch(`${BACKEND_URL}/admin/formulas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Backend PUT /admin/formulas/${id} returned ${res.status}`);
  return res.json() as Promise<Formula>;
}

export async function deleteFormula(
  id: string,
  accessToken?: string
): Promise<boolean> {
  const res = await fetch(`${BACKEND_URL}/admin/formulas/${id}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
    cache: 'no-store',
  });
  if (res.status === 404) return false;
  if (!res.ok)
    throw new Error(`Backend DELETE /admin/formulas/${id} returned ${res.status}`);
  return true;
}

// ── Translations ──────────────────────────────────────────────────────────────

export async function listTranslations(
  collectionId?: string,
  accessToken?: string
): Promise<Translation[]> {
  const url = collectionId
    ? `${BACKEND_URL}/admin/translations?collection_id=${encodeURIComponent(collectionId)}`
    : `${BACKEND_URL}/admin/translations`;
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
    cache: 'no-store',
  });
  if (!res.ok)
    throw new Error(`Backend /admin/translations returned ${res.status}`);
  return res.json() as Promise<Translation[]>;
}

export async function getTranslation(
  id: string,
  accessToken?: string
): Promise<Translation | null> {
  const res = await fetch(`${BACKEND_URL}/admin/translations/${id}`, {
    headers: authHeaders(accessToken),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Backend /admin/translations/${id} returned ${res.status}`);
  return res.json() as Promise<Translation>;
}

export async function createTranslation(
  data: CreateTranslationInput,
  accessToken?: string
): Promise<Translation> {
  const res = await fetch(`${BACKEND_URL}/admin/translations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok)
    throw new Error(`Backend POST /admin/translations returned ${res.status}`);
  return res.json() as Promise<Translation>;
}

export async function updateTranslation(
  id: string,
  data: UpdateTranslationInput,
  accessToken?: string
): Promise<Translation | null> {
  const res = await fetch(`${BACKEND_URL}/admin/translations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Backend PUT /admin/translations/${id} returned ${res.status}`);
  return res.json() as Promise<Translation>;
}

export async function deleteTranslation(
  id: string,
  accessToken?: string
): Promise<boolean> {
  const res = await fetch(`${BACKEND_URL}/admin/translations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
    cache: 'no-store',
  });
  if (res.status === 404) return false;
  if (!res.ok)
    throw new Error(`Backend DELETE /admin/translations/${id} returned ${res.status}`);
  return true;
}
