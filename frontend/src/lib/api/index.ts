/**
 * API client entry point.
 *
 * Re-exports everything from the module-specific files so existing
 * imports of `@/lib/api` continue to work without changes.
 *
 * Consumers can also import directly from the module file:
 *   import { listForms } from "@/lib/api/admin";
 *   import { getTestStatus } from "@/lib/api/test";
 */

export { BACKEND_URL, authHeaders } from "./client";

export type { TestGreeting, TestRecord } from "./test";
export { getTestStatus, getTestRecords } from "./test";

export type {
  PublishStatus,
  TranslationRef,
  CollectionPermission,
  AdminCollection,
  FormSection,
  FormOrganisation,
  AdminForm,
  SectionQuestion,
  AdminSection,
  QuestionType,
  QuestionParameters,
  AdminQuestion,
} from "./admin";

export {
  listCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  listForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  listSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "./admin";
