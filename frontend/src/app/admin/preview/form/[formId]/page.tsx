import { auth } from '@/auth';
import { getForm, listSections, listQuestions } from '@/lib/api';
import type {
  FormDefinition,
  FormResponse,
  SectionDefinition,
  QuestionDefinition,
  QuestionResponse,
  FormResponseGroup,
} from '@/lib/api/form-response';
import dynamic from 'next/dynamic';

const FormViewPageClient = dynamic(
  () => import('@/app/components/form-view/FormViewPageClient'),
);

export default async function FormPreviewPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const session = await auth();
  const accessToken = session?.accessToken;

  const form = await getForm(formId, accessToken);
  if (!form) {
    return (
      <div className="admin-placeholder">
        <h2>Form not found</h2>
        <p>The requested form could not be found.</p>
      </div>
    );
  }

  const allSections = await listSections(accessToken).catch(() => []);
  const matchedSections = allSections.filter((s) =>
    form.form_sections.some((fs) => fs.section_symbol === s.section_symbol),
  );

  const allQuestions = await listQuestions(undefined, accessToken).catch(() => []);
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
    form_response_group_id: `preview-${formId}`,
    form_responses: [],
  };

  return (
    <FormViewPageClient
      initialData={{
        formResponseGroup,
        formDefinitions,
        formResponses: [],
        questionResponses: new Map<string, QuestionResponse>(),
        sectionDefinitions,
        questionDefinitions,
        mode: 'preview',
        locale: 'en',
      }}
    />
  );
}
