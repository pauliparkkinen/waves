"use client";

import { useState } from 'react';
import type { AdminForm, AdminCollection, AdminSection, FormSection } from '@/lib/api';
import SectionAttachmentEditor from './SectionAttachmentEditor';
import CollectionSelector from '../collections/CollectionSelector';
import InlineCollectionCreator from '../questions/InlineCollectionCreator';

type FormFormProps = {
  form?: AdminForm;
  collections: AdminCollection[];
  sections: AdminSection[];
  accessToken: string;
  userOrgId?: string;
  readOnly?: boolean;
  disableSymbolAndCollection?: boolean;
  onSave: () => void;
  onCancel: () => void;
  onCollectionCreated?: (collection: AdminCollection) => void;
};

export default function FormForm({
  form,
  collections,
  sections,
  accessToken,
  userOrgId,
  readOnly,
  disableSymbolAndCollection,
  onSave,
  onCancel,
  onCollectionCreated,
}: FormFormProps) {
  const [localCollections, setLocalCollections] = useState(collections);
  const [localSections, setLocalSections] = useState(sections);
  const [showInlineCreator, setShowInlineCreator] = useState(false);
  const isEdit = !!form;
  const isReadOnly = readOnly === true;
  const isSymbolCollectionDisabled = isReadOnly || (isEdit && disableSymbolAndCollection);
  const [symbol, setSymbol] = useState(form?.form_symbol ?? '');
  const [collectionId, setCollectionId] = useState<string | undefined>(
    form?.collection_id,
  );
  const [formSections, setFormSections] = useState<FormSection[]>(
    form?.form_sections ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleCollectionCreated(created: AdminCollection) {
    setLocalCollections((prev) => [...prev, created]);
    setCollectionId(created.collection_id);
    setShowInlineCreator(false);
    if (onCollectionCreated) onCollectionCreated(created);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const trimmed = symbol.trim();
    if (!trimmed) {
      errors.symbol = 'Form symbol is required';
    } else if (trimmed.length < 2) {
      errors.symbol = 'Form symbol must be at least 2 characters';
    } else if (trimmed.length > 100) {
      errors.symbol = 'Form symbol must be 100 characters or fewer';
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      errors.symbol =
        'Form symbol may only contain letters, numbers, and underscores';
    }
    if (!collectionId) {
      errors.collectionId = 'Collection is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) return;
    if (!validate()) return;

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        form_symbol: symbol.trim(),
        collection_id: collectionId,
        version: form?.version ?? 1,
        ...(isEdit ? {} : { status: 'draft' as const }),
        form_sections: formSections,
        formulas: form?.formulas ?? [],
        form_organisations: form?.form_organisations ?? [],
        translations: form?.translations ?? [],
      };

      const url = isEdit
        ? `/api/admin/forms/${form.form_id}`
        : '/api/admin/forms';

      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
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

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="collection-form" onSubmit={handleSubmit} noValidate>
      <h3>{isReadOnly ? `View Form: ${form?.form_symbol ?? ''}` : isEdit ? 'Edit Form' : 'Create Form'}</h3>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="form-symbol">Form Symbol</label>
        <input
          id="form-symbol"
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="e.g. annual_report"
          maxLength={100}
          pattern="[a-zA-Z0-9_]+"
          disabled={isSymbolCollectionDisabled}
          aria-invalid={!!fieldErrors.symbol}
          aria-describedby={fieldErrors.symbol ? 'symbol-error' : undefined}
        />
        {fieldErrors.symbol && (
          <p className="inline-error" id="symbol-error" role="alert">
            {fieldErrors.symbol}
          </p>
        )}
      </div>

      <div className="form-group">
        <label>Collection</label>
        <div className="collection-selector-row">
          <CollectionSelector
            collections={localCollections}
            selectedId={collectionId}
            onChange={setCollectionId}
            disabled={isSymbolCollectionDisabled}
          />
          {!isSymbolCollectionDisabled && (
            <button
              type="button"
              className="btn-secondary btn-small btn-new-collection"
              onClick={() => setShowInlineCreator(true)}
            >
              + New Collection
            </button>
          )}
        </div>
        {fieldErrors.collectionId && (
          <p className="inline-error" role="alert">{fieldErrors.collectionId}</p>
        )}
      </div>

      <div className="form-group">
        <SectionAttachmentEditor
          sections={localSections}
          collections={localCollections}
          formSections={formSections}
          onChange={setFormSections}
          readOnly={isReadOnly}
          accessToken={accessToken}
          userOrgId={userOrgId}
          onSectionCreated={(updatedSections) => {
            setLocalSections(updatedSections);
          }}
        />
      </div>

      {!isReadOnly && (
        <div className="form-group" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary btn-small"
            disabled
            title="Coming soon"
          >
            Formulas
          </button>
          <button
            type="button"
            className="btn-secondary btn-small"
            disabled
            title="Coming soon"
          >
            Translations
          </button>
          <button
            type="button"
            className="btn-secondary btn-small"
            disabled
            title="Coming soon"
          >
            Test Mode
          </button>
        </div>
      )}

      {isReadOnly ? (
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
          >
            Close
          </button>
        </div>
      ) : (
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      )}

      {showInlineCreator && (
        <InlineCollectionCreator
          accessToken={accessToken}
          userOrgId={userOrgId}
          onCreated={handleCollectionCreated}
          onCancel={() => setShowInlineCreator(false)}
        />
      )}
    </form>
  );
}
