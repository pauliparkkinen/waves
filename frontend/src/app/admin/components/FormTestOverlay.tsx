'use client';

import React, { useMemo } from 'react';
import type {
  AdminForm,
  AdminSection,
  AdminQuestion,
} from '@/lib/api';
import type {
  FormDefinition,
  FormResponse,
  SectionDefinition,
  QuestionDefinition,
  QuestionResponse,
  FormResponseGroup,
  FormSectionRef,
  SectionQuestionRef,
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

export default function FormTestOverlay({
  onClose,
  accessToken,
  form,
  section,
  question,
  sections: allSections = [],
  questions: allQuestions = [],
}: FormTestOverlayProps) {
  const { initialData, testConfig } = useMemo(() => {
    if (form) {
      return buildFormTestData(form, allSections, allQuestions);
    }
    if (section) {
      return buildSectionTestData(section, allQuestions);
    }
    if (question) {
      return buildQuestionTestData(question);
    }
    return { initialData: null as any, testConfig: undefined };
  }, [form, section, question, allSections, allQuestions]);

  if (!initialData) return null;

  const entitySymbol = form?.form_symbol ?? section?.section_symbol ?? question?.question_symbol ?? '';

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
          <h3 id="test-heading">Test: {entitySymbol}</h3>
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
      translations: {},
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
    translations: {},
  }));

  const questionDefinitions: QuestionDefinition[] = matchedQuestions.map((q) => ({
    question_symbol: q.question_symbol,
    version: q.version,
    type: q.type,
    parameters: q.parameters,
    condition_formula_id: q.condition_formula_id,
    translations: {},
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
): { initialData: any; testConfig: TestConfig } {
  const questionSymbols = new Set(
    section.section_questions.map((sq) => sq.question_symbol),
  );
  const matchedQuestions = allQuestions.filter((q) => questionSymbols.has(q.question_symbol));

  const formDefinitions: FormDefinition[] = [
    {
      collection_id: section.collection_id,
      form_symbol: `__test__`,
      version: 1,
      form_sections: [
        {
          section_symbol: section.section_symbol,
          version_number: section.version,
          order_number: 0,
        },
      ],
      status: 'draft',
      translations: {},
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
      translations: {},
    },
  ];

  const questionDefinitions: QuestionDefinition[] = matchedQuestions.map((q) => ({
    question_symbol: q.question_symbol,
    version: q.version,
    type: q.type,
    parameters: q.parameters,
    condition_formula_id: q.condition_formula_id,
    translations: {},
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
): { initialData: any; testConfig: TestConfig } {
  const sectionSymbol = `__test__`;
  const formSymbol = `__test__`;

  const formDefinitions: FormDefinition[] = [
    {
      collection_id: question.collection_id,
      form_symbol: formSymbol,
      version: 1,
      form_sections: [
        {
          section_symbol: sectionSymbol,
          version_number: 1,
          order_number: 0,
        },
      ],
      status: 'draft',
      translations: {},
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

  const questionDefinitions: QuestionDefinition[] = [
    {
      question_symbol: question.question_symbol,
      version: question.version,
      type: question.type,
      parameters: question.parameters,
      condition_formula_id: question.condition_formula_id,
      translations: {},
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
