export type FormResponseStatus = 'Draft' | 'Submitted';

export type FormResponse = {
  form_response_id: string;
  form_response_group_id: string;
  collection_id: string;
  form_symbol: string;
  form_version: number;
  organization_id: string;
  user_id: string;
  filling_user_id: string;
  status: FormResponseStatus;
  version: number;
  started_timestamp: string;
  submitted_timestamp?: string;
};

export type CreateFormResponseInput = {
  form_response_group_id: string;
  collection_id: string;
  form_symbol: string;
  form_version: number;
  organization_id: string;
  user_id: string;
  filling_user_id: string;
  started_timestamp?: string;
};

export type UpdateFormResponseInput = {
  status?: FormResponseStatus;
  submitted_timestamp?: string;
  filling_user_id?: string;
  version: number;
};

// ---- Error Types ----

export class FormResponseVersionConflictError extends Error {
  constructor(id: string, expected: number, actual: number) {
    super(`Version conflict on form response ${id}: expected ${expected}, actual ${actual}`);
    this.name = 'FormResponseVersionConflictError';
  }
}

export class FormResponseImmutabilityError extends Error {
  constructor(id: string) {
    super(`Form response ${id} is already submitted and cannot be modified`);
    this.name = 'FormResponseImmutabilityError';
  }
}

export class FormResponseSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormResponseSubmissionError';
  }
}

export class FormResponseAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormResponseAuthorizationError';
  }
}

// ---- Audit Types ----

export type FormResponseAuditAction = 'create' | 'update' | 'submit' | 'delete' | 'deny';

export type FormResponseAuditRecord = {
  action: FormResponseAuditAction;
  sub: string;
  permissions: string[];
  resource: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp: string;
};
