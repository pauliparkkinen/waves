import { auth } from '@/auth';
import { listCollections, listQuestions } from '@/lib/api';
import QuestionList from './QuestionList';

export default async function QuestionsPage() {
  const session = await auth();
  const accessToken = session?.accessToken as string | undefined;
  const organisationId = session?.organisationId as string | undefined;

  if (!accessToken) {
    return (
      <div className="admin-placeholder">
        <h2>Authentication Required</h2>
        <p>Please sign in to access the question editor.</p>
      </div>
    );
  }

  const [collections, questions] = await Promise.all([
    listCollections(accessToken).catch(() => []),
    listQuestions(undefined, accessToken).catch(() => []),
  ]);

  return (
    <QuestionList
      initialQuestions={questions}
      collections={collections}
      accessToken={accessToken}
      userOrgId={organisationId}
    />
  );
}
