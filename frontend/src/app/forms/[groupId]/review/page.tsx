import { auth } from '@/auth';
import { getFormResponseGroup } from '@/lib/api/form-response';
import type { FormResponse, QuestionResponse } from '@/lib/api/form-response';
import dynamic from 'next/dynamic';

const FormViewPageClient = dynamic(
  () => import('@/app/components/form-view/FormViewPageClient'),
);

export default async function FormReviewPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const session = await auth();
  const accessToken = session?.accessToken;

  const formResponseGroup = await getFormResponseGroup(groupId, accessToken);

  const formResponses: FormResponse[] = formResponseGroup.form_responses.map((fr) => ({
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
    question_responses: [],
  }));

  return (
    <FormViewPageClient
      initialData={{
        formResponseGroup,
        formDefinitions: [],
        formResponses,
        questionResponses: new Map<string, QuestionResponse>(),
        sectionDefinitions: [],
        questionDefinitions: [],
        mode: 'review',
        locale: 'en',
      }}
      accessToken={accessToken}
    />
  );
}
