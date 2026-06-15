import { auth } from "@/auth";
import { listCollections } from "@/lib/api";
import type { AdminCollection } from "@/lib/api";
import CollectionList from "./CollectionList";

export default async function CollectionsPage() {
  const session = await auth();
  const accessToken = session?.accessToken ?? "";

  let collections: AdminCollection[];
  let error: string | null = null;

  try {
    collections = await listCollections(accessToken);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load collections";
    collections = [];
  }

  return (
    <div className="admin-layout">
      <h1>Collections</h1>
      {error && <div className="error-message">{error}</div>}
      <CollectionList
        initialCollections={collections}
        accessToken={accessToken}
      />
    </div>
  );
}
