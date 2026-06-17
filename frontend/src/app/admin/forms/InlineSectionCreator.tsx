"use client";

import { useState } from 'react';
import type { AdminSection, AdminCollection } from '@/lib/api';
import CollectionSelector from '../collections/CollectionSelector';
import InlineCollectionCreator from '../questions/InlineCollectionCreator';

type InlineSectionCreatorProps = {
  accessToken: string;
  collections: AdminCollection[];
  userOrgId?: string;
  onCreated: (section: AdminSection) => void;
  onCancel: () => void;
};

export default function InlineSectionCreator({
  accessToken,
  collections,
  userOrgId,
  onCreated,
  onCancel,
}: InlineSectionCreatorProps) {
  const [symbol, setSymbol] = useState('');
  const [collectionId, setCollectionId] = useState<string | undefined>();
  const [localCollections, setLocalCollections] = useState(collections);
  const [showInlineCreator, setShowInlineCreator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const trimmed = symbol.trim();
    if (!trimmed) {
      errors.symbol = 'Section symbol is required';
    } else if (trimmed.length < 2) {
      errors.symbol = 'Section symbol must be at least 2 characters';
    } else if (trimmed.length > 100) {
      errors.symbol = 'Section symbol must be 100 characters or fewer';
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      errors.symbol = 'Section symbol may only contain letters, numbers, and underscores';
    }
    if (!collectionId) {
      errors.collectionId = 'Collection is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        section_symbol: symbol.trim(),
        collection_id: collectionId,
        version: 1,
        status: 'draft' as const,
        section_questions: [],
        translations: [],
      };
      const res = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }
      const created = (await res.json()) as AdminSection;
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  function handleCollectionCreated(created: AdminCollection) {
    setLocalCollections((prev) => [...prev, created]);
    setCollectionId(created.collection_id);
    setShowInlineCreator(false);
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inline-section-heading"
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      tabIndex={-1}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '36rem' }}>
        <div>
          <h3 id="inline-section-heading">Create Section</h3>

          {error && <div className="error-message" role="alert">{error}</div>}

          <div className="form-group">
            <label htmlFor="is-symbol">Section Symbol</label>
            <input
              id="is-symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. financial_info"
              maxLength={100}
              pattern="[a-zA-Z0-9_]+"
              autoFocus
              aria-invalid={!!fieldErrors.symbol}
              aria-describedby={fieldErrors.symbol ? 'is-symbol-error' : undefined}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
            />
            {fieldErrors.symbol && (
              <p className="inline-error" id="is-symbol-error" role="alert">{fieldErrors.symbol}</p>
            )}
          </div>

          <div className="form-group">
            <label>Collection</label>
            <div className="collection-selector-row">
              <CollectionSelector
                collections={localCollections}
                selectedId={collectionId}
                onChange={setCollectionId}
              />
              <button type="button" className="btn-secondary btn-small btn-new-collection" onClick={() => setShowInlineCreator(true)}>
                + New Collection
              </button>
            </div>
            {fieldErrors.collectionId && <p className="inline-error" role="alert">{fieldErrors.collectionId}</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        {showInlineCreator && (
          <InlineCollectionCreator
            accessToken={accessToken}
            userOrgId={userOrgId}
            onCreated={handleCollectionCreated}
            onCancel={() => setShowInlineCreator(false)}
          />
        )}
      </div>
    </div>
  );
}
