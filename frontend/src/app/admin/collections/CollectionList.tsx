"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { AdminCollection } from "@/lib/api";
import CollectionForm from "./CollectionForm";

type CollectionListProps = {
  initialCollections: AdminCollection[];
  accessToken: string;
};

function permissionsSummary(perms: AdminCollection["collection_permissions"]): string {
  const count = perms.length;
  if (count === 0) return "No permissions";
  return `${count} ${count === 1 ? "organisation" : "organisations"}`;
}

export default function CollectionList({
  initialCollections,
  accessToken,
}: CollectionListProps) {
  const [collections, setCollections] = useState(initialCollections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/collections", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to fetch collections (${res.status})`);
      const data = (await res.json()) as AdminCollection[];
      setCollections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to delete collection (${res.status})`);
      setDeletingId(null);
      await fetchCollections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete collection");
    }
  }

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="error-message" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Header */}
      <div className="collection-header">
        <h2 style={{ margin: 0 }}>Collections</h2>
        {!showCreate && (
          <button
            className="btn-primary"
            onClick={() => setShowCreate(true)}
          >
            Create Collection
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <CollectionForm
          accessToken={accessToken}
          onSave={() => {
            setShowCreate(false);
            fetchCollections();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Edit form */}
      {editingId && (
        <CollectionForm
          collection={collections.find((c) => c.collection_id === editingId)}
          accessToken={accessToken}
          onSave={() => {
            setEditingId(null);
            fetchCollections();
          }}
          onCancel={() => setEditingId(null)}
        />
      )}

      {/* Loading */}
      {loading && <p className="empty-state">Loading...</p>}

      {/* Empty state */}
      {!loading && collections.length === 0 && !showCreate && (
        <p className="empty-state">
          No collections yet. Click &quot;Create Collection&quot; to get started.
        </p>
      )}

      {/* Table */}
      {!loading && collections.length > 0 && (
        <div className="collection-table-wrapper">
          <table className="collection-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((col) => (
                <tr key={col.collection_id}>
                  <td>
                    <strong>{col.collection_symbol}</strong>
                  </td>
                  <td>{permissionsSummary(col.collection_permissions)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="btn-secondary btn-small"
                        onClick={() =>
                          setEditingId(
                            editingId === col.collection_id
                              ? null
                              : col.collection_id
                          )
                        }
                        aria-label={`Edit ${col.collection_symbol}`}
                      >
                        {editingId === col.collection_id ? "Cancel" : "Edit"}
                      </button>
                      <button
                        className="btn-danger btn-small"
                        onClick={() => setDeletingId(col.collection_id)}
                        aria-label={`Delete ${col.collection_symbol}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingId && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-heading"
          onClick={() => setDeletingId(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDeletingId(null);
          }}
          tabIndex={-1}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-heading">Confirm Delete</h3>
            <p>
              Are you sure you want to delete this collection? This action cannot
              be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setDeletingId(null)}
                autoFocus
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDelete(deletingId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
