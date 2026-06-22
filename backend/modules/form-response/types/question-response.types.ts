export type QuestionResponse = {
  question_response_id: string;
  form_response_id: string;
  collection_id: string;
  question_symbol: string;
  question_version: number;
  response_value_text?: string;
  response_value_number?: number;
  response_value_boolean?: boolean;
};

export type CreateQuestionResponseInput = {
  form_response_id: string;
  collection_id: string;
  question_symbol: string;
  question_version: number;
  response_value_text?: string;
  response_value_number?: number;
  response_value_boolean?: boolean;
};

export type UpdateQuestionResponseInput = Partial<{
  response_value_text: string;
  response_value_number: number;
  response_value_boolean: boolean;
}>;
