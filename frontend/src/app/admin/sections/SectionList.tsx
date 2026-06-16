"use client";

import { useState, useCallback, useMemo, Fragment } from 'react';
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
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [newVersioningId, setNewVersioningId] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | undefined>(undefined);

  const filteredSections = useMemo(() => {
    if (!collectionFilter) return sections;
    return sections.filter((sec) => sec.collection_id === collectionFilter);
  }, [sections, collectionFilter]);

  type SectionGroup = {
    key: string;
    versions: AdminSection[];
    latest: AdminSection;
  };

  const groupedSections = useMemo(() => {
    const groups = new Map<string, AdminSection[]>();
    for (const sec of filteredSections) {
      const key = `${sec.section_symbol}::${sec.collection_id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(sec);
    }
    for (const [, versions] of groups) {
      versions.sort((a, b) => b.version - a.version);
    }
    return [...groups.entries()]
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, versions]) => ({ key, versions, latest: versions[0] }));
  }, [filteredSections]);

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

  function renderActions(sec: AdminSection, isLatest: boolean): React.ReactNode {
    const isPublished = sec.status === 'published';

    if (isPublished) {
      return (
        <>
          <button className="btn-secondary btn-small" onClick={() => setViewingId(sec.section_id)}
            aria-label={`View ${sec.section_symbol} v${sec.version}`}>View</button>
          {isLatest && (
            <button className="btn-primary btn-small" onClick={() => setNewVersioningId(sec.section_id)}
              aria-label={`New version of ${sec.section_symbol}`}>New Version</button>
          )}
        </>
      );
    }

    return (
      <>
        <button className="btn-primary btn-small" onClick={() => setPublishingId(sec.section_id)}
          aria-label={`Publish ${sec.section_symbol} v${sec.version}`}>Publish</button>
        <button className="btn-secondary btn-small" onClick={() => setEditingId(sec.section_id)}
          aria-label={`Edit ${sec.section_symbol} v${sec.version}`}>Edit</button>
        <button className="btn-danger btn-small" onClick={() => setDeletingId(sec.section_id)}
          aria-label={`Delete ${sec.section_symbol} v${sec.version}`}>Delete</button>
      </>
    );
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
      {!loading && groupedSections.length === 0 && !showCreate && (
        <p className="empty-state">
          No sections yet. Click &quot;Create Section&quot; to get started.
        </p>
      )}

      {/* Table */}
      {!loading && groupedSections.length > 0 && (
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
              {groupedSections.map((group) => {
                const isExpanded = expandedGroupKey === group.key;
                const showSymbolWithCollection = !collectionFilter;

                return (
                  <Fragment key={group.key}>
                    {group.latest.section_id === viewingId ? (
                      <tr key={`view-${group.key}`}>
                        <td colSpan={5} className="inline-edit-container table-cell">
                          <SectionForm section={group.latest} collections={collections} questions={questions}
                            accessToken={accessToken} userOrgId={userOrgId} readOnly={true}
                            onSave={() => {}} onCancel={() => setViewingId(null)} />
                        </td>
                      </tr>
                    ) : group.latest.section_id === editingId ? (
                      <tr key={`edit-${group.key}`}>
                        <td colSpan={5} className="inline-edit-container table-cell">
                          <SectionForm section={group.latest} collections={collections} questions={questions}
                            accessToken={accessToken} userOrgId={userOrgId}
                            disableSymbolAndCollection={group.versions.some(v => v.status === 'published')}
                            onSave={() => { setEditingId(null); fetchSections(); }}
                            onCancel={() => setEditingId(null)} />
                        </td>
                      </tr>
                    ) : (
                      <tr key={group.key}>
                        <td>
                          <strong>{showSymbolWithCollection
                            ? `${group.latest.section_symbol} (${group.latest.collection_id})`
                            : group.latest.section_symbol}</strong>
                        </td>
                        <td>
                          <span className={group.latest.status === 'published' ? 'section-status-published' : 'section-status-draft'}>
                            {group.latest.status}
                          </span>
                        </td>
                        <td>{group.latest.section_questions.length} questions</td>
                        <td>
                          <button className="btn-link-version" onClick={() => {
                            setExpandedGroupKey(isExpanded ? null : group.key);
                          }} aria-label={`Toggle versions for ${group.latest.section_symbol}`}>
                            {group.latest.version}
                          </button>
                          {group.versions.length > 1 && (
                            <span className="version-count-badge">+{group.versions.length - 1}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {renderActions(group.latest, true)}
                          </div>
                        </td>
                      </tr>
                    )}

                    {isExpanded && group.versions.slice(1).map((ver) => (
                      <tr key={ver.section_id} className="version-sub-row">
                        {ver.section_id === viewingId ? (
                          <td colSpan={5} className="inline-edit-container table-cell">
                            <SectionForm section={ver} collections={collections} questions={questions}
                              accessToken={accessToken} userOrgId={userOrgId} readOnly={true}
                              onSave={() => {}} onCancel={() => setViewingId(null)} />
                          </td>
                        ) : (
                          <>
                            <td className="version-sub-symbol">v{ver.version}</td>
                            <td>
                              <span className={ver.status === 'published' ? 'section-status-published' : 'section-status-draft'}>
                                {ver.status}
                              </span>
                            </td>
                            <td>{ver.section_questions.length} questions</td>
                            <td>{ver.version}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {renderActions(ver, false)}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </Fragment>
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
