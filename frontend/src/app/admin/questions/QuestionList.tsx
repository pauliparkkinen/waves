"use client";

import { useState, useCallback } from 'react';
import type { AdminQuestion, AdminCollection } from '@/lib/api';
import CollectionSelector from '../collections/CollectionSelector';
import QuestionForm from './QuestionForm';
import FormTestOverlay from '../components/FormTestOverlay';

type QuestionListProps = {
  initialQuestions: AdminQuestion[];
  collections: AdminCollection[];
  accessToken: string;
  userOrgId?: string;
};

export default function QuestionList({
  initialQuestions,
  collections: initialCollections,
  accessToken,
  userOrgId,
}: QuestionListProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [localCollections, setLocalCollections] = useState(initialCollections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | undefined>(undefined);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/questions', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Failed to fetch questions (${res.status})`);
      const data = (await res.json()) as AdminQuestion[];
      setQuestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Failed to delete question (${res.status})`);
      setDeletingId(null);
      await fetchQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete question');
    }
  }

  function getCollectionSymbol(collectionId: string): string {
    return localCollections.find((c) => c.collection_id === collectionId)?.collection_symbol ?? collectionId;
  }

  function handleCollectionCreated(created: AdminCollection) {
    setLocalCollections((prev) => [...prev, created]);
  }

  const filteredQuestions = collectionFilter
    ? questions.filter((q) => q.collection_id === collectionFilter)
    : questions;

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="error-message" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Header */}
      <div className="collection-header">
        <h2 style={{ margin: 0 }}>Questions</h2>
        {!showCreate && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Create Question
          </button>
        )}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '1rem' }}>
        <CollectionSelector
          collections={localCollections}
          selectedId={collectionFilter}
          onChange={setCollectionFilter}
          label="Filter by collection"
        />
      </div>

      {/* Create form */}
      {showCreate && (
        <QuestionForm
          collections={localCollections}
          accessToken={accessToken}
          userOrgId={userOrgId}
          onSave={() => {
            setShowCreate(false);
            fetchQuestions();
          }}
          onCancel={() => setShowCreate(false)}
          onCollectionCreated={handleCollectionCreated}
        />
      )}

      {/* Loading */}
      {loading && <p className="empty-state">Loading...</p>}

      {/* Empty state */}
      {!loading && filteredQuestions.length === 0 && !showCreate && (
        <p className="empty-state">
          {collectionFilter
            ? 'No questions match the selected collection.'
            : 'No questions yet. Click "Create Question" to get started.'}
        </p>
      )}

      {/* Table */}
      {!loading && filteredQuestions.length > 0 && (
        <div className="collection-table-wrapper">
          <table className="collection-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Type</th>
                <th>Collection</th>
                <th>Version</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((q) => {
                if (q.question_id === editingId) {
                  return (
                    <tr key={q.question_id}>
                       <td colSpan={5} className="inline-edit-container table-cell">
                         <QuestionForm
                           question={q}
                          collections={localCollections}
                          accessToken={accessToken}
                          userOrgId={userOrgId}
                          onSave={() => {
                            setEditingId(null);
                            fetchQuestions();
                          }}
                          onCancel={() => setEditingId(null)}
                          onCollectionCreated={handleCollectionCreated}
                        />
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={q.question_id}>
                    <td>
                      <strong>{q.question_symbol}</strong>
                    </td>
                    <td>{q.type}</td>
                    <td>{getCollectionSymbol(q.collection_id)}</td>
                    <td>{q.version}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn-secondary btn-small"
                          onClick={() => setTestingId(q.question_id)}
                          aria-label={`Test ${q.question_symbol}`}
                        >
                          Test
                        </button>
                        <button
                          className="btn-secondary btn-small"
                          onClick={() => setEditingId(q.question_id)}
                          aria-label={`Edit ${q.question_symbol}`}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-danger btn-small"
                          onClick={() => setDeletingId(q.question_id)}
                          aria-label={`Delete ${q.question_symbol}`}
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
              Are you sure you want to delete this question? This action cannot
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

      {testingId && (() => {
        const q = questions.find(q => q.question_id === testingId);
        if (!q) return null;
        return (
          <FormTestOverlay
            question={q}
            accessToken={accessToken}
            onClose={() => setTestingId(null)}
          />
        );
      })()}
    </div>
  );
}
