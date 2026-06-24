'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type {
  AdminForm,
  AdminSection,
  AdminQuestion,
  TranslationRef,
} from '@/lib/api';
import type {
  FormDefinition,
  FormResponse,
  SectionDefinition,
  QuestionDefinition,
  QuestionResponse,
  FormResponseGroup,
} from '@/lib/api/form-response';
import type { TestConfig } from '@/app/components/form-view/FormViewPageClient';
import FormViewPageClient from '@/app/components/form-view/FormViewPageClient';

type FormTestOverlayProps = {
  onClose: () => void;
  accessToken?: string;
  form?: AdminForm;
  section?: AdminSection;
  question?: AdminQuestion;
  sections?: AdminSection[];
  questions?: AdminQuestion[];
};

/**
 * Fetch all translations for a collection and return a Map<symbol, locale→text>.
 *
 * Backend stores translations as individual rows (one per locale_code per symbol),
 * so we group them by symbol into a single Record<locale, text> per symbol.
 */
async function fetchTranslationMap(
  collectionId: string,
  accessToken?: string,
): Promise<Map<string, Record<string, string>>> {
  try {
    const res = await fetch(
      `/api/admin/translations?collection_id=${encodeURIComponent(collectionId)}`,
      { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
    );
    if (!res.ok) return new Map();
    const data = await res.json();
    const map = new Map<string, Record<string, string>>();
    for (const item of data) {
      const symbol = item.symbol as string | undefined;
      const locale = item.locale_code as string | undefined;
      const value = item.value as string | undefined;
      if (!symbol || !locale || value === undefined) continue;
      let entry = map.get(symbol);
      if (!entry) {
        entry = {};
        map.set(symbol, entry);
      }
      entry[locale] = value;
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Resolve the title TranslationRef (index 0 = title) into Record<locale, title>.
 * For question definitions, also resolves the description (index 1) and
 * embeds it as help text via the `${locale}_help` key so QuestionRenderer
 * displays it as help text below the title.
 */
function resolveTranslations(
  refs: TranslationRef[] | undefined,
  translationMap: Map<string, Record<string, string>>,
  includeDescription = false,
): Record<string, string> {
  if (!refs || refs.length === 0) return {};

  const result: Record<string, string> = {};

  // Index 0 = Title
  const titleRef = refs[0];
  if (titleRef) {
    const titleMap = translationMap.get(titleRef.translation_symbol);
    if (titleMap) {
      for (const [locale, text] of Object.entries(titleMap)) {
        result[locale] = text;
      }
    }
  }

  // Index 1 = Description (optional) — embed as help text
  if (includeDescription && refs.length > 1) {
    const descRef = refs[1];
    if (descRef) {
      const descMap = translationMap.get(descRef.translation_symbol);
      if (descMap) {
        for (const [locale, text] of Object.entries(descMap)) {
          result[`${locale}_help`] = text;
        }
      }
    }
  }

  return result;
}

export default function FormTestOverlay({
  onClose,
  accessToken,
  form,
  section,
  question,
  sections: allSections = [],
  questions: allQuestions = [],
}: FormTestOverlayProps) {
  const collectionId = form?.collection_id ?? section?.collection_id ?? question?.collection_id;
  const [translationMap, setTranslationMap] = useState<Map<string, Record<string, string>>>(new Map());

  useEffect(() => {
    if (!collectionId) return;
    fetchTranslationMap(collectionId, accessToken).then(setTranslationMap);
  }, [collectionId, accessToken]);

  const { initialData, testConfig } = useMemo(() => {
    if (form) {
      return buildFormTestData(form, allSections, allQuestions, translationMap);
    }
    if (section) {
      return buildSectionTestData(section, allQuestions, translationMap);
    }
    if (question) {
      return buildQuestionTestData(question, translationMap);
    }
    return { initialData: null as any, testConfig: undefined };
  }, [form, section, question, allSections, allQuestions, translationMap]);

  if (!initialData) return null;

  // Resolve the entity's title and description for the modal header
  const entityRefs = form?.translations ?? section?.translations ?? question?.translations;
  const entityTitle = entityRefs?.[0]
    ? (translationMap.get(entityRefs[0].translation_symbol)?.['en'] ?? null)
    : null;
  const entityDescription = entityRefs?.[1]
    ? (translationMap.get(entityRefs[1].translation_symbol)?.['en'] ?? null)
    : null;
  const displayTitle = entityTitle ?? form?.form_symbol ?? section?.section_symbol ?? question?.question_symbol ?? '';

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-heading"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      tabIndex={-1}
    >
      <div className="modal-content modal-content--fullscreen" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 id="test-heading">Test: {displayTitle}</h3>
            {entityDescription && <p className="test-description">{entityDescription}</p>}
          </div>
          <button type="button" className="btn-secondary btn-small" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <FormViewPageClient
            initialData={initialData}
            accessToken={accessToken}
            testConfig={testConfig}
          />
        </div>
      </div>
    </div>
  );
}

function buildFormTestData(
  form: AdminForm,
  allSections: AdminSection[],
  allQuestions: AdminQuestion[],
  translationMap: Map<string, Record<string, string>>,
): { initialData: any; testConfig: TestConfig } {
  const matchedSections = allSections.filter((s) =>
    form.form_sections.some((fs) => fs.section_symbol === s.section_symbol),
  );

  const questionSymbols = new Set(
    matchedSections.flatMap((s) => s.section_questions.map((sq) => sq.question_symbol)),
  );
  const matchedQuestions = allQuestions.filter((q) => questionSymbols.has(q.question_symbol));

  const formDefinitions: FormDefinition[] = [
    {
      collection_id: form.collection_id,
      form_symbol: form.form_symbol,
      version: form.version,
      form_sections: form.form_sections.map((fs) => ({
        section_symbol: fs.section_symbol,
        version_number: fs.version_number,
        order_number: fs.order_number,
      })),
      status: form.status,
      translations: resolveTranslations(form.translations, translationMap),
    },
  ];

  const sectionDefinitions: SectionDefinition[] = matchedSections.map((s) => ({
    section_symbol: s.section_symbol,
    version: s.version,
    section_questions: s.section_questions.map((sq) => ({
      question_symbol: sq.question_symbol,
      version_number: sq.version_number,
      order_number: sq.order_number,
      required: sq.required,
    })),
    condition_formula_id: s.condition_formula_id,
    status: s.status,
    translations: resolveTranslations(s.translations, translationMap),
  }));

  const questionDefinitions: QuestionDefinition[] = matchedQuestions.map((q) => ({
    question_symbol: q.question_symbol,
    version: q.version,
    type: q.type,
    parameters: q.parameters,
    condition_formula_id: q.condition_formula_id,
    translations: resolveTranslations(q.translations, translationMap, true),
  }));

  const formResponseGroup: FormResponseGroup = {
    form_response_group_id: `test-${form.form_id}`,
    form_responses: [],
  };

  return {
    initialData: {
      formResponseGroup,
      formDefinitions,
      formResponses: [],
      questionResponses: new Map<string, QuestionResponse>(),
      sectionDefinitions,
      questionDefinitions,
      mode: 'preview' as const,
      locale: 'en',
    },
    testConfig: { formId: form.form_id, entityType: 'form' as const },
  };
}

function buildSectionTestData(
  section: AdminSection,
  allQuestions: AdminQuestion[],
  translationMap: Map<string, Record<string, string>>,
): { initialData: any; testConfig: TestConfig } {
  const questionSymbols = new Set(
    section.section_questions.map((sq) => sq.question_symbol),
  );
  const matchedQuestions = allQuestions.filter((q) => questionSymbols.has(q.question_symbol));

  const sectionTitle = resolveTranslations(section.translations, translationMap);
  const formDefinitions: FormDefinition[] = [
    {
      collection_id: section.collection_id,
      form_symbol: section.section_symbol,
      version: 1,
      form_sections: [
        {
          section_symbol: section.section_symbol,
          version_number: section.version,
          order_number: 0,
        },
      ],
      status: 'draft',
      translations: sectionTitle,
    },
  ];

  const sectionDefinitions: SectionDefinition[] = [
    {
      section_symbol: section.section_symbol,
      version: section.version,
      section_questions: section.section_questions.map((sq) => ({
        question_symbol: sq.question_symbol,
        version_number: sq.version_number,
        order_number: sq.order_number,
        required: sq.required,
      })),
      condition_formula_id: section.condition_formula_id,
      status: section.status,
      translations: resolveTranslations(section.translations, translationMap),
    },
  ];

  const questionDefinitions: QuestionDefinition[] = matchedQuestions.map((q) => ({
    question_symbol: q.question_symbol,
    version: q.version,
    type: q.type,
    parameters: q.parameters,
    condition_formula_id: q.condition_formula_id,
    translations: resolveTranslations(q.translations, translationMap, true),
  }));

  const formResponseGroup: FormResponseGroup = {
    form_response_group_id: `test-section-${section.section_id}`,
    form_responses: [],
  };

  return {
    initialData: {
      formResponseGroup,
      formDefinitions,
      formResponses: [],
      questionResponses: new Map<string, QuestionResponse>(),
      sectionDefinitions,
      questionDefinitions,
      mode: 'preview' as const,
      locale: 'en',
    },
    testConfig: { formId: section.section_id, entityType: 'section' as const },
  };
}

function buildQuestionTestData(
  question: AdminQuestion,
  translationMap: Map<string, Record<string, string>>,
): { initialData: any; testConfig: TestConfig } {
  const sectionSymbol = question.question_symbol;
  const questionTitle = resolveTranslations(question.translations, translationMap);

  const formDefinitions: FormDefinition[] = [
    {
      collection_id: question.collection_id,
      form_symbol: sectionSymbol,
      version: 1,
      form_sections: [
        {
          section_symbol: sectionSymbol,
          version_number: 1,
          order_number: 0,
        },
      ],
      status: 'draft',
      translations: questionTitle,
    },
  ];

  const sectionDefinitions: SectionDefinition[] = [
    {
      section_symbol: sectionSymbol,
      version: 1,
      section_questions: [
        {
          question_symbol: question.question_symbol,
          version_number: question.version,
          order_number: 0,
          required: false,
        },
      ],
      status: 'draft',
      translations: {},
    },
  ];

  // Question gets its actual title + description (as help text)
  const questionDefinitions: QuestionDefinition[] = [
    {
      question_symbol: question.question_symbol,
      version: question.version,
      type: question.type,
      parameters: question.parameters,
      condition_formula_id: question.condition_formula_id,
      translations: resolveTranslations(question.translations, translationMap, true),
    },
  ];

  const formResponseGroup: FormResponseGroup = {
    form_response_group_id: `test-question-${question.question_id}`,
    form_responses: [],
  };

  return {
    initialData: {
      formResponseGroup,
      formDefinitions,
      formResponses: [],
      questionResponses: new Map<string, QuestionResponse>(),
      sectionDefinitions,
      questionDefinitions,
      mode: 'preview' as const,
      locale: 'en',
    },
    testConfig: { formId: question.question_id, entityType: 'question' as const },
  };
}
