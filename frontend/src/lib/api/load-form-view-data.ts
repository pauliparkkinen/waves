import {
  getFormResponseGroup,
  getQuestionResponses,
} from './form-response';
import { listSections, listQuestions, getForm } from './admin';
import type { FormResponseGroup, FormResponse, QuestionResponse } from './form-response';
import type { FormDefinition, SectionDefinition, QuestionDefinition } from './form-response';

export type LoadedFormViewData = {
  formResponseGroup: FormResponseGroup;
  formResponses: FormResponse[];
  questionResponsesMap: Map<string, QuestionResponse>;
  formDefinitions: FormDefinition[];
  sectionDefinitions: SectionDefinition[];
  questionDefinitions: QuestionDefinition[];
};

function buildTranslations(translations: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!translations) return result;
  if (Array.isArray(translations)) {
    for (const t of translations) {
      if (t && typeof t === 'object' && 'locale' in t && 'translated_text' in t) {
        const locale = String((t as Record<string, unknown>).locale);
        const text = String((t as Record<string, unknown>).translated_text);
        result[locale] = text;
      }
    }
  } else if (typeof translations === 'object') {
    return translations as Record<string, string>;
  }
  return result;
}

export async function loadFormViewData(
  groupId: string,
  accessToken?: string,
): Promise<LoadedFormViewData> {
  const formResponseGroup = await getFormResponseGroup(groupId, accessToken);

  const questionResponsesMap = new Map<string, QuestionResponse>();
  const formResponses: FormResponse[] = [];

  for (const fr of formResponseGroup.form_responses) {
    let questionResponses: QuestionResponse[] = [];
    try {
      questionResponses = await getQuestionResponses(fr.form_response_id, accessToken);
    } catch {
      questionResponses = [];
    }
    for (const qr of questionResponses) {
      questionResponsesMap.set(qr.question_symbol, qr);
    }
    formResponses.push({
      form_response_id: fr.form_response_id,
      form_response_group_id: groupId,
      collection_id: '',
      form_symbol: fr.form_symbol,
      form_version: fr.form_version,
      user_id: '',
      filling_user_id: '',
      status: fr.status,
      started_timestamp: fr.started_timestamp,
      submitted_timestamp: fr.submitted_timestamp,
      question_responses: questionResponses,
    });
  }

  let formDefinitions: FormDefinition[] = [];
  let sectionDefinitions: SectionDefinition[] = [];
  let questionDefinitions: QuestionDefinition[] = [];

  const formSymbols = formResponseGroup.form_responses.map((fr) => fr.form_symbol);

  if (formSymbols.length > 0) {
    try {
      const allSections = await listSections(accessToken).catch(() => []);
      const allQuestions = await listQuestions(undefined, accessToken).catch(() => []);

      for (const formResponse of formResponseGroup.form_responses) {
        try {
          const form = await getForm(formResponse.form_symbol, accessToken);
          if (form) {
            formDefinitions.push({
              collection_id: form.collection_id,
              form_symbol: form.form_symbol,
              version: form.version,
              form_sections: form.form_sections.map(
                (fs: { section_symbol: string; version_number: number; order_number: number }) => ({
                  section_symbol: fs.section_symbol,
                  version_number: fs.version_number,
                  order_number: fs.order_number,
                }),
              ),
              status: form.status,
              translations: buildTranslations(form.translations),
            });
          }
        } catch {
          // Form not found
        }
      }

      const matchedSectionSymbols = new Set(
        formDefinitions.flatMap((fd) => fd.form_sections.map((fs) => fs.section_symbol)),
      );

      sectionDefinitions = allSections
        .filter((s) => matchedSectionSymbols.has(s.section_symbol))
        .map((s) => ({
          section_symbol: s.section_symbol,
          version: s.version,
          section_questions: s.section_questions.map(
            (sq: { question_symbol: string; version_number: number; order_number: number; required: boolean }) => ({
              question_symbol: sq.question_symbol,
              version_number: sq.version_number,
              order_number: sq.order_number,
              required: sq.required,
            }),
          ),
          condition_formula_id: s.condition_formula_id,
          status: s.status,
          translations: buildTranslations(s.translations),
        }));

      const matchedQuestionSymbols = new Set(
        sectionDefinitions.flatMap((sd) => sd.section_questions.map((sq) => sq.question_symbol)),
      );

      questionDefinitions = allQuestions
        .filter((q) => matchedQuestionSymbols.has(q.question_symbol))
        .map((q) => ({
          question_symbol: q.question_symbol,
          version: q.version,
          type: q.type,
          parameters: q.parameters,
          condition_formula_id: q.condition_formula_id,
          translations: buildTranslations(q.translations),
        }));
    } catch {
      console.warn('Failed to load form definitions');
    }
  }

  return {
    formResponseGroup,
    formResponses,
    questionResponsesMap,
    formDefinitions,
    sectionDefinitions,
    questionDefinitions,
  };
}

export function findFirstUnansweredSection(
  sectionDefinitions: SectionDefinition[],
  questionResponsesMap: Map<string, QuestionResponse>,
  formDefinitions: FormDefinition[],
): string | null {
  const sortedSectionRefs = formDefinitions
    .flatMap((fd) => fd.form_sections)
    .slice()
    .sort((a, b) => a.order_number - b.order_number);

  for (const sectionRef of sortedSectionRefs) {
    const section = sectionDefinitions.find((s) => s.section_symbol === sectionRef.section_symbol);
    if (!section) continue;
    const questions = (section.section_questions ?? [])
      .slice()
      .sort((a, b) => a.order_number - b.order_number);
    for (const sq of questions) {
      const response = questionResponsesMap.get(sq.question_symbol);
      const hasAnswer =
        response &&
        (response.response_value_text !== undefined ||
          response.response_value_number !== undefined ||
          response.response_value_boolean !== undefined);
      if (!hasAnswer) {
        return section.section_symbol;
      }
    }
  }
  return null;
}
