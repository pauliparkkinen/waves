export type FormResponseStatus = 'Draft' | 'Submitted';

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
};

export type CreateFormResponseInput = {
  form_response_group_id: string;
  collection_id: string;
  form_symbol: string;
  form_version: number;
  user_id: string;
  filling_user_id: string;
  started_timestamp?: string;
};

export type UpdateFormResponseInput = Partial<{
  status: FormResponseStatus;
  submitted_timestamp: string;
  filling_user_id: string;
}>;
