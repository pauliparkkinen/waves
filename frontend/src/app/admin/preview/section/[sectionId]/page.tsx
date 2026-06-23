import { auth } from '@/auth';
import { getSection, listQuestions } from '@/lib/api';
import type {
  FormDefinition,
  FormResponse,
  SectionDefinition,
  QuestionDefinition,
  QuestionResponse,
  FormResponseGroup,
  FormSectionRef,
} from '@/lib/api/form-response';
import dynamic from 'next/dynamic';

const FormViewPageClient = dynamic(
  () => import('@/app/components/form-view/FormViewPageClient'),
);

export default async function SectionPreviewPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const session = await auth();
  const accessToken = session?.accessToken;

  const section = await getSection(sectionId, accessToken);
  if (!section) {
    return (
      <div className="admin-placeholder">
        <h2>Section not found</h2>
        <p>The requested section could not be found.</p>
      </div>
    );
  }

  const allQuestions = await listQuestions(undefined, accessToken).catch(() => []);
  const questionSymbols = new Set(
    section.section_questions.map((sq) => sq.question_symbol),
  );
  const matchedQuestions = allQuestions.filter((q) => questionSymbols.has(q.question_symbol));

  const formSectionRef: FormSectionRef = {
    section_symbol: section.section_symbol,
    version_number: section.version,
    order_number: 0,
  };

  const formDefinitions: FormDefinition[] = [
    {
      collection_id: section.collection_id,
      form_symbol: `preview-${section.section_symbol}`,
      version: 1,
      form_sections: [formSectionRef],
      status: section.status,
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
    form_response_group_id: `preview-section-${sectionId}`,
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
