import { auth } from '@/auth';
import { loadFormViewData } from '@/lib/api/load-form-view-data';
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

  const {
    formResponseGroup,
    formResponses,
    questionResponsesMap,
    formDefinitions,
    sectionDefinitions,
    questionDefinitions,
  } = await loadFormViewData(groupId, accessToken);

  return (
    <FormViewPageClient
      initialData={{
        formResponseGroup,
        formDefinitions,
        formResponses,
        questionResponses: questionResponsesMap,
        sectionDefinitions,
        questionDefinitions,
        mode: 'review',
        locale: 'en',
      }}
      accessToken={accessToken}
    />
  );
}
