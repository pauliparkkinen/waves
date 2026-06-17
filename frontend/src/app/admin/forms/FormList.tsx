"use client";

import { useState, useCallback, useMemo, Fragment } from 'react';
import type { AdminForm, AdminCollection, AdminSection } from '@/lib/api';
import FormForm from './FormForm';
import CollectionSelector from '../collections/CollectionSelector';

type FormListProps = {
  initialForms: AdminForm[];
  collections: AdminCollection[];
  sections: AdminSection[];
  accessToken: string;
  userOrgId?: string;
};

export default function FormList({
  initialForms,
  collections,
  sections,
  accessToken,
  userOrgId,
}: FormListProps) {
  const [forms, setForms] = useState(initialForms);
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
  const [localCollections, setLocalCollections] = useState(collections);

  const collectionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of localCollections) {
      map.set(col.collection_id, col.collection_symbol);
    }
    return map;
  }, [localCollections]);

  const filteredForms = useMemo(() => {
    if (!collectionFilter) return forms;
    return forms.filter((f) => f.collection_id === collectionFilter);
  }, [forms, collectionFilter]);

  type FormVersionGroup = {
    key: string;
    versions: AdminForm[];
    latest: AdminForm;
  };

  type CollectionGroup = {
    collectionId: string;
    collectionSymbol: string;
    formGroups: FormVersionGroup[];
  };

  const groupedForms = useMemo(() => {
    const groups = new Map<string, AdminForm[]>();
    for (const f of filteredForms) {
      const key = `${f.form_symbol}::${f.collection_id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    }
    for (const [, versions] of groups) {
      versions.sort((a, b) => b.version - a.version);
    }
    return [...groups.entries()]
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, versions]) => ({ key, versions, latest: versions[0] }));
  }, [filteredForms]);

  const collectionGroups = useMemo(() => {
    const collMap = new Map<string, FormVersionGroup[]>();
    for (const fg of groupedForms) {
      const colId = fg.latest.collection_id;
      if (!collMap.has(colId)) collMap.set(colId, []);
      collMap.get(colId)!.push(fg);
    }
    return [...collMap.entries()]
      .map(([colId, formGroups]) => ({
        collectionId: colId,
        collectionSymbol: collectionMap.get(colId) ?? colId,
        formGroups,
      }))
      .sort((a, b) => a.collectionSymbol.localeCompare(b.collectionSymbol));
  }, [groupedForms, collectionMap]);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/forms', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Failed to fetch forms (${res.status})`);
      const data = (await res.json()) as AdminForm[];
      setForms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  async function handlePublish(form: AdminForm) {
    setError(null);
    setPublishError(null);
    try {
      const res = await fetch(`/api/admin/forms/${form.form_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: 'published' }),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Failed to update form (${res.status})`);
      setPublishingId(null);
      await fetchForms();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update form';
      setError(msg);
      setPublishError(msg);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/forms/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Failed to delete form (${res.status})`);
      setDeletingId(null);
      await fetchForms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete form');
    }
  }

  function renderActions(form: AdminForm, isLatest: boolean): React.ReactNode {
    const isPublished = form.status === 'published';

    if (isPublished) {
      return (
        <>
          <button className="btn-secondary btn-small" onClick={() => setViewingId(form.form_id)}
            aria-label={`View ${form.form_symbol} v${form.version}`}>View</button>
          {isLatest && (
            <button className="btn-primary btn-small" onClick={() => setNewVersioningId(form.form_id)}
              aria-label={`New version of ${form.form_symbol}`}>New Version</button>
          )}
        </>
      );
    }

    return (
      <>
        <button className="btn-primary btn-small" onClick={() => setPublishingId(form.form_id)}
          aria-label={`Publish ${form.form_symbol} v${form.version}`}>Publish</button>
        <button className="btn-secondary btn-small" onClick={() => setEditingId(form.form_id)}
          aria-label={`Edit ${form.form_symbol} v${form.version}`}>Edit</button>
        <button className="btn-danger btn-small" onClick={() => setDeletingId(form.form_id)}
          aria-label={`Delete ${form.form_symbol} v${form.version}`}>Delete</button>
      </>
    );
  }

  return (
    <div>
      {(error || publishError) && (
        <div className="error-message" role="alert" style={{ marginBottom: '1rem' }}>
          {error || publishError}
        </div>
      )}

      <div className="collection-header">
        <h2 style={{ margin: 0 }}>Forms</h2>
        {!showCreate && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Create Form
          </button>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <CollectionSelector
          collections={localCollections}
          selectedId={collectionFilter}
          onChange={setCollectionFilter}
          label="Filter by collection"
        />
      </div>

      {showCreate && (
        <div className="inline-edit-container">
          <FormForm
            collections={localCollections}
            sections={sections}
            accessToken={accessToken}
            userOrgId={userOrgId}
            onSave={() => {
              setShowCreate(false);
              fetchForms();
            }}
            onCancel={() => setShowCreate(false)}
            onCollectionCreated={(created) => {
              setLocalCollections((prev) => [...prev, created]);
            }}
          />
        </div>
      )}

      {loading && <p className="empty-state">Loading...</p>}

      {!loading && groupedForms.length === 0 && !showCreate && (
        <p className="empty-state">
          {collectionFilter
            ? 'No forms match the current filter.'
            : 'No forms yet. Click "Create Form" to get started.'}
        </p>
      )}

      {!loading && groupedForms.length > 0 && (
        <div className="collection-table-wrapper">
          <table className="collection-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Status</th>
                <th>Sections</th>
                <th>Version</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {collectionGroups.map((colGroup) => (
                <Fragment key={colGroup.collectionId}>
                  <tr className="collection-header-row">
                    <td colSpan={5}>
                      {colGroup.collectionSymbol}
                    </td>
                  </tr>

                  {colGroup.formGroups.map((group) => {
                    const isExpanded = expandedGroupKey === group.key;

                    return (
                      <Fragment key={group.key}>
                        {group.latest.form_id === viewingId ? (
                          <tr key={`view-${group.key}`}>
                            <td colSpan={5} className="inline-edit-container table-cell">
                              <FormForm form={group.latest} collections={collections} sections={sections}
                                accessToken={accessToken} userOrgId={userOrgId} readOnly={true}
                                onSave={() => {}} onCancel={() => setViewingId(null)} />
                            </td>
                          </tr>
                        ) : group.latest.form_id === editingId ? (
                          <tr key={`edit-${group.key}`}>
                            <td colSpan={5} className="inline-edit-container table-cell">
                              <FormForm form={group.latest} collections={collections} sections={sections}
                                accessToken={accessToken} userOrgId={userOrgId}
                                disableSymbolAndCollection={group.versions.some(v => v.status === 'published')}
                                onSave={() => { setEditingId(null); fetchForms(); }}
                                onCancel={() => setEditingId(null)} />
                            </td>
                          </tr>
                        ) : (
                          <tr key={group.key} className="section-group-row">
                            <td>
                              <strong>{group.latest.form_symbol}</strong>
                            </td>
                            <td>
                              <span className={group.latest.status === 'published' ? 'section-status-published' : 'section-status-draft'}>
                                {group.latest.status}
                              </span>
                            </td>
                            <td>{group.latest.form_sections.length} sections</td>
                            <td>
                              <button className="btn-link-version" onClick={() => {
                                setExpandedGroupKey(isExpanded ? null : group.key);
                              }} aria-label={`Toggle versions for ${group.latest.form_symbol}`}>
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
                          <tr key={ver.form_id} className="version-sub-row">
                            {ver.form_id === viewingId ? (
                              <td colSpan={5} className="inline-edit-container table-cell">
                                <FormForm form={ver} collections={collections} sections={sections}
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
                                <td>{ver.form_sections.length} sections</td>
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
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
              Are you sure you want to delete this form? This action cannot
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
            <p>Are you sure you want to publish this form? It will be visible to users.</p>
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
                  const form = forms.find(
                    (f) => f.form_id === publishingId,
                  );
                  if (form) handlePublish(form);
                }}
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

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
            <p>This will create a new draft version based on the current published form. The published version will remain unchanged.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setNewVersioningId(null)} autoFocus>Cancel</button>
              <button className="btn-primary" onClick={async () => {
                const f = forms.find(f => f.form_id === newVersioningId);
                if (!f) return;
                try {
                  const res = await fetch('/api/admin/forms', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                      form_symbol: f.form_symbol,
                      collection_id: f.collection_id,
                      version: f.version + 1,
                      status: 'draft',
                      form_sections: f.form_sections,
                      formulas: f.formulas,
                      form_organisations: f.form_organisations,
                      translations: f.translations,
                    }),
                  });
                  if (!res.ok) throw new Error(`Failed to create new version (${res.status})`);
                  setNewVersioningId(null);
                  await fetchForms();
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
