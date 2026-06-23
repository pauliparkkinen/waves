import { auth } from '@/auth';
import { getQuestion } from '@/lib/api';
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
import dynamic from 'next/dynamic';

const FormViewPageClient = dynamic(
  () => import('@/app/components/form-view/FormViewPageClient'),
);

export default async function QuestionPreviewPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;
  const session = await auth();
  const accessToken = session?.accessToken;

  const question = await getQuestion(questionId, accessToken);
  if (!question) {
    return (
      <div className="admin-placeholder">
        <h2>Question not found</h2>
        <p>The requested question could not be found.</p>
      </div>
    );
  }

  const sectionSymbol = `preview-${question.question_symbol}`;
  const sectionQuestionRef: SectionQuestionRef = {
    question_symbol: question.question_symbol,
    version_number: question.version,
    order_number: 0,
    required: false,
  };

  const formSectionRef: FormSectionRef = {
    section_symbol: sectionSymbol,
    version_number: 1,
    order_number: 0,
  };

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

  const sectionDefinitions: SectionDefinition[] = [
    {
      section_symbol: sectionSymbol,
      version: 1,
      section_questions: [sectionQuestionRef],
      status: 'draft',
      translations: {},
    },
  ];

  const formDefinitions: FormDefinition[] = [
    {
      collection_id: question.collection_id,
      form_symbol: `preview-${question.question_symbol}`,
      version: 1,
      form_sections: [formSectionRef],
      status: 'draft',
      translations: {},
    },
  ];

  const formResponseGroup: FormResponseGroup = {
    form_response_group_id: `preview-question-${questionId}`,
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
