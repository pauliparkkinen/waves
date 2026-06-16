"use client";

import { useState } from 'react';
import type { AdminCollection, CollectionPermission } from '@/lib/api';

type InlineCollectionCreatorProps = {
  accessToken: string;
  userOrgId?: string;
  onCreated: (collection: AdminCollection) => void;
  onCancel: () => void;
};

export default function InlineCollectionCreator({
  accessToken,
  userOrgId,
  onCreated,
  onCancel,
}: InlineCollectionCreatorProps) {
  const [symbol, setSymbol] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function validate(): boolean {
    const trimmed = symbol.trim();
    if (!trimmed) {
      setFieldError('Collection symbol is required');
      return false;
    }
    if (trimmed.length < 2) {
      setFieldError('Collection symbol must be at least 2 characters');
      return false;
    }
    if (trimmed.length > 100) {
      setFieldError('Collection symbol must be 100 characters or fewer');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setFieldError('Collection symbol may only contain letters, numbers, and underscores');
      return false;
    }
    setFieldError(null);
    return true;
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError(null);

    try {
      const permissions: CollectionPermission[] = userOrgId
        ? [{ organisation_id: userOrgId, read: true, use: true, edit: true, owner: true }]
        : [];

      const body = {
        collection_symbol: symbol.trim(),
        collection_permissions: permissions,
      };

      const res = await fetch('/api/admin/collections', {
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

      const created = (await res.json()) as AdminCollection;
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inline-creator-heading"
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
      tabIndex={-1}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 id="inline-creator-heading">Create Collection</h3>
        <div className="inline-creator">
          <div className="form-group">
            <label htmlFor="inline-creator-symbol">Collection Symbol</label>
            <input
              id="inline-creator-symbol"
              className="inline-creator"
              type="text"
              autoFocus
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setFieldError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="e.g. financial_2024"
              maxLength={100}
              pattern="[a-zA-Z0-9_]+"
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? 'inline-creator-error' : undefined}
            />
            {fieldError && (
              <p className="inline-error" id="inline-creator-error" role="alert">
                {fieldError}
              </p>
            )}
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
