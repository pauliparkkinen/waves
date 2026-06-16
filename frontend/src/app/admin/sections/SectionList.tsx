"use client";

import { useState, useCallback, useMemo } from 'react';
import type { AdminSection, AdminCollection, AdminQuestion } from '@/lib/api';
import SectionForm from './SectionForm';
import CollectionSelector from '../collections/CollectionSelector';

type SectionListProps = {
  initialSections: AdminSection[];
  collections: AdminCollection[];
  questions: AdminQuestion[];
  accessToken: string;
  userOrgId?: string;
};

export default function SectionList({
  initialSections,
  collections,
  questions,
  accessToken,
  userOrgId,
}: SectionListProps) {
  const [sections, setSections] = useState(initialSections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [versionPopupId, setVersionPopupId] = useState<string | null>(null);
  const [newVersioningId, setNewVersioningId] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | undefined>(undefined);

  const filteredSections = useMemo(() => {
    if (!collectionFilter) return sections;
    return sections.filter((sec) => sec.collection_id === collectionFilter);
  }, [sections, collectionFilter]);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/sections', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Failed to fetch sections (${res.status})`);
      const data = (await res.json()) as AdminSection[];
      setSections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  async function handlePublish(section: AdminSection) {
    setError(null);
    setPublishError(null);
    try {
      const res = await fetch(`/api/admin/sections/${section.section_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: 'published' }),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Failed to update section (${res.status})`);
      setPublishingId(null);
      await fetchSections();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update section';
      setError(msg);
      setPublishError(msg);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/sections/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Failed to delete section (${res.status})`);
      setDeletingId(null);
      await fetchSections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete section');
    }
  }

  return (
    <div>
      {/* Error banner */}
      {(error || publishError) && (
        <div className="error-message" role="alert" style={{ marginBottom: '1rem' }}>
          {error || publishError}
        </div>
      )}

      {/* Header */}
      <div className="collection-header">
        <h2 style={{ margin: 0 }}>Sections</h2>
        {!showCreate && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Create Section
          </button>
        )}
      </div>

      {/* Filter by collection */}
      <div style={{ marginBottom: '1rem' }}>
        <CollectionSelector
          collections={collections}
          selectedId={collectionFilter}
          onChange={setCollectionFilter}
          label="Filter by collection"
        />
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="inline-edit-container">
          <SectionForm
            collections={collections}
            questions={questions}
            accessToken={accessToken}
            userOrgId={userOrgId}
            onSave={() => {
              setShowCreate(false);
              fetchSections();
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Loading */}
      {loading && <p className="empty-state">Loading...</p>}

      {/* Empty state */}
      {!loading && filteredSections.length === 0 && !showCreate && (
        <p className="empty-state">
          No sections yet. Click &quot;Create Section&quot; to get started.
        </p>
      )}

      {/* Table */}
      {!loading && filteredSections.length > 0 && (
        <div className="collection-table-wrapper">
          <table className="collection-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Status</th>
                <th>Questions</th>
                <th>Version</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSections.map((sec) => {
                if (sec.section_id === viewingId) {
                  return (
                    <tr key={sec.section_id}>
                      <td colSpan={5} className="inline-edit-container table-cell">
                        <SectionForm
                          section={sec}
                          collections={collections}
                          questions={questions}
                          accessToken={accessToken}
                          userOrgId={userOrgId}
                          readOnly={true}
                          onSave={() => {}}
                          onCancel={() => setViewingId(null)}
                        />
                      </td>
                    </tr>
                  );
                }
                if (sec.section_id === editingId) {
                  return (
                    <tr key={sec.section_id}>
                      <td colSpan={5} className="inline-edit-container table-cell">
                        <SectionForm
                          section={sec}
                          collections={collections}
                          questions={questions}
                          accessToken={accessToken}
                          userOrgId={userOrgId}
                          onSave={() => {
                            setEditingId(null);
                            fetchSections();
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={sec.section_id}>
                    <td>
                      <strong>{sec.section_symbol}</strong>
                    </td>
                    <td>
                      <span
                        className={
                          sec.status === 'published'
                            ? 'section-status-published'
                            : 'section-status-draft'
                        }
                      >
                        {sec.status}
                      </span>
                    </td>
                    <td>{sec.section_questions.length} questions</td>
                    <td>
                      <button
                        className="btn-link-version"
                        onClick={() => setVersionPopupId(sec.section_id)}
                        aria-label={`View version details for ${sec.section_symbol}`}
                      >
                        {sec.version}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {sec.status === 'draft' ? (
                          <>
                            <button
                              className="btn-primary btn-small"
                              onClick={() => setPublishingId(sec.section_id)}
                              aria-label={`Publish ${sec.section_symbol}`}
                            >
                              Publish
                            </button>
                            <button
                              className="btn-secondary btn-small"
                              onClick={() => setEditingId(sec.section_id)}
                              aria-label={`Edit ${sec.section_symbol}`}
                            >
                              Edit
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-secondary btn-small"
                              onClick={() => setViewingId(sec.section_id)}
                              aria-label={`View ${sec.section_symbol}`}
                            >
                              View
                            </button>
                            <button
                              className="btn-primary btn-small"
                              onClick={() => setNewVersioningId(sec.section_id)}
                              aria-label={`New version of ${sec.section_symbol}`}
                            >
                              New Version
                            </button>
                          </>
                        )}
                        <button
                          className="btn-danger btn-small"
                          onClick={() => setDeletingId(sec.section_id)}
                          aria-label={`Delete ${sec.section_symbol}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
            if (e.key === 'Escape') setDeletingId(null);
          }}
          tabIndex={-1}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-heading">Confirm Delete</h3>
            <p>
              Are you sure you want to delete this section? This action cannot
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

      {/* Publish confirmation modal */}
      {publishingId && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-heading"
          onClick={() => setPublishingId(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setPublishingId(null);
          }}
          tabIndex={-1}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 id="publish-heading">Confirm Publish</h3>
            <p>Are you sure you want to publish this section? It will be visible to users.</p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setPublishingId(null)}
                autoFocus
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  const section = sections.find(
                    (s) => s.section_id === publishingId,
                  );
                  if (section) handlePublish(section);
                }}
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version details popup */}
      {versionPopupId && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="version-heading"
          onClick={() => setVersionPopupId(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setVersionPopupId(null);
          }}
          tabIndex={-1}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 id="version-heading">Version Details</h3>
            {(() => {
              const sec = sections.find(s => s.section_id === versionPopupId);
              if (!sec) return null;
              return (
                <>
                  <p><strong>Section:</strong> {sec.section_symbol}</p>
                  <p><strong>Version:</strong> {sec.version}</p>
                  <p><strong>Status:</strong> {sec.status}</p>
                  <p><strong>Questions:</strong> {sec.section_questions.length}</p>
                  <p><strong>Collection ID:</strong> {sec.collection_id}</p>
                  <p><strong>Condition Formula:</strong> {sec.condition_formula_id ?? 'None'}</p>
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setVersionPopupId(null)} autoFocus>Close</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* New Version confirmation modal */}
      {newVersioningId && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="newversion-heading"
          onClick={() => setNewVersioningId(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setNewVersioningId(null);
          }}
          tabIndex={-1}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 id="newversion-heading">Create New Version</h3>
            <p>This will create a new draft version based on the current published section. The published version will remain unchanged.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setNewVersioningId(null)} autoFocus>Cancel</button>
              <button className="btn-primary" onClick={async () => {
                const sec = sections.find(s => s.section_id === newVersioningId);
                if (!sec) return;
                try {
                  const res = await fetch('/api/admin/sections', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                      section_symbol: sec.section_symbol,
                      collection_id: sec.collection_id,
                      version: sec.version + 1,
                      status: 'draft',
                      condition_formula_id: sec.condition_formula_id,
                      section_questions: sec.section_questions,
                      translations: sec.translations,
                    }),
                  });
                  if (!res.ok) throw new Error(`Failed to create new version (${res.status})`);
                  setNewVersioningId(null);
                  await fetchSections();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to create new version');
                  setNewVersioningId(null);
                }
              }}>
                Create New Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
