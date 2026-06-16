"use client";

import { useState, useCallback } from 'react';
import type { AdminSection, AdminCollection, AdminQuestion } from '@/lib/api';
import SectionForm from './SectionForm';

type SectionListProps = {
  initialSections: AdminSection[];
  collections: AdminCollection[];
  questions: AdminQuestion[];
  accessToken: string;
};

export default function SectionList({
  initialSections,
  collections,
  questions,
  accessToken,
}: SectionListProps) {
  const [sections, setSections] = useState(initialSections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

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
    const newStatus = section.status === 'draft' ? 'published' : 'draft';
    setError(null);
    setPublishError(null);
    try {
      const res = await fetch(`/api/admin/sections/${section.section_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
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

      {/* Create form */}
      {showCreate && (
        <div className="inline-edit-container">
          <SectionForm
            collections={collections}
            questions={questions}
            accessToken={accessToken}
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
      {!loading && sections.length === 0 && !showCreate && (
        <p className="empty-state">
          No sections yet. Click &quot;Create Section&quot; to get started.
        </p>
      )}

      {/* Table */}
      {!loading && sections.length > 0 && (
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
              {sections.map((sec) => {
                if (sec.section_id === editingId) {
                  return (
                    <tr key={sec.section_id}>
                      <td colSpan={5} className="inline-edit-container table-cell">
                        <SectionForm
                          section={sec}
                          collections={collections}
                          questions={questions}
                          accessToken={accessToken}
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
                    <td>{sec.version}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {sec.status === 'draft' ? (
                          <button
                            className="btn-primary btn-small"
                            onClick={() => setPublishingId(sec.section_id)}
                            aria-label={`Publish ${sec.section_symbol}`}
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            className="btn-secondary btn-small"
                            onClick={() => setPublishingId(sec.section_id)}
                            aria-label={`Unpublish ${sec.section_symbol}`}
                          >
                            Unpublish
                          </button>
                        )}
                        <button
                          className="btn-secondary btn-small"
                          onClick={() => setEditingId(sec.section_id)}
                          aria-label={`Edit ${sec.section_symbol}`}
                        >
                          Edit
                        </button>
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
            <h3 id="publish-heading">
              {sections.find((s) => s.section_id === publishingId)?.status === 'draft'
                ? 'Confirm Publish'
                : 'Confirm Unpublish'}
            </h3>
            <p>
              {sections.find((s) => s.section_id === publishingId)?.status === 'draft'
                ? 'Are you sure you want to publish this section? It will be visible to users.'
                : 'Are you sure you want to unpublish this section?'}
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setPublishingId(null)}
                autoFocus
              >
                Cancel
              </button>
              <button
                className={
                  sections.find((s) => s.section_id === publishingId)?.status === 'draft'
                    ? 'btn-primary'
                    : 'btn-secondary'
                }
                onClick={() => {
                  const section = sections.find(
                    (s) => s.section_id === publishingId,
                  );
                  if (section) handlePublish(section);
                }}
              >
                {sections.find((s) => s.section_id === publishingId)?.status === 'draft'
                  ? 'Publish'
                  : 'Unpublish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
