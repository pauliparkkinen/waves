import { auth } from '@/auth';
import { loadFormViewData, findFirstUnansweredSection } from '@/lib/api/load-form-view-data';
import dynamic from 'next/dynamic';

const FormViewPageClient = dynamic(
  () => import('@/app/components/form-view/FormViewPageClient'),
);

export default async function FormFillPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ patientId?: string }>;
}) {
  const { groupId } = await params;
  const resolvedSearchParams = await searchParams;
  const patientIdParam = resolvedSearchParams?.patientId;

  const session = await auth();
  const accessToken = session?.accessToken;

  // Detect if user has HCP role
  const userRoles = session?.roles ?? [];
  const isHcp = userRoles.includes('hcp') || userRoles.includes('HCP') || userRoles.includes('healthcare') || userRoles.includes('Healthcare');

  const {
    formResponseGroup,
    formResponses,
    questionResponsesMap,
    formDefinitions,
    sectionDefinitions,
    questionDefinitions,
  } = await loadFormViewData(groupId, accessToken);

  const initialSectionSymbol = findFirstUnansweredSection(
    sectionDefinitions,
    questionResponsesMap,
    formDefinitions,
  );

  return (
    <FormViewPageClient
      initialData={{
        formResponseGroup,
        formDefinitions,
        formResponses,
        questionResponses: questionResponsesMap,
        sectionDefinitions,
        questionDefinitions,
        mode: 'fill',
        locale: 'en',
        initialSectionSymbol,
        isHcp,
        selectedPatientId: patientIdParam,
      }}
      accessToken={accessToken}
    />
  );
}
