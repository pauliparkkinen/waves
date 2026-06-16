import { auth } from '@/auth';
import { listSections, listCollections, listQuestions } from '@/lib/api';
import SectionList from './SectionList';

export default async function SectionsPage() {
  const session = await auth();
  const accessToken = session?.accessToken as string | undefined;

  if (!accessToken) {
    return (
      <div className="admin-placeholder">
        <h2>Authentication Required</h2>
        <p>Please sign in to access the section editor.</p>
      </div>
    );
  }

  const [sections, collections, questions] = await Promise.all([
    listSections(accessToken).catch(() => []),
    listCollections(accessToken).catch(() => []),
    listQuestions(undefined, accessToken).catch(() => []),
  ]);

  return (
    <SectionList
      initialSections={sections}
      collections={collections}
      questions={questions}
      accessToken={accessToken}
    />
  );
}
