import { auth } from '@/auth';
import { listForms, listCollections, listSections, listQuestions } from '@/lib/api';
import FormList from './FormList';

export default async function FormsPage() {
  const session = await auth();
  const accessToken = session?.accessToken as string | undefined;

  if (!accessToken) {
    return (
      <div className="admin-placeholder">
        <h2>Authentication Required</h2>
        <p>Please sign in to access the form editor.</p>
      </div>
    );
  }

  const [forms, collections, sections, questions] = await Promise.all([
    listForms(accessToken).catch(() => []),
    listCollections(accessToken).catch(() => []),
    listSections(accessToken).catch(() => []),
    listQuestions(undefined, accessToken).catch(() => []),
  ]);

  return (
    <FormList
      initialForms={forms}
      collections={collections}
      sections={sections}
      questions={questions}
      accessToken={accessToken}
    />
  );
}
