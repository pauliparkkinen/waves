"use client";

import { useState } from 'react';
import type { AdminSection, AdminCollection, AdminQuestion, SectionQuestion } from '@/lib/api';
import QuestionAttachmentEditor from './QuestionAttachmentEditor';
import CollectionSelector from '../collections/CollectionSelector';
import InlineCollectionCreator from '../questions/InlineCollectionCreator';

type SectionFormProps = {
  section?: AdminSection;
  collections: AdminCollection[];
  questions: AdminQuestion[];
  accessToken: string;
  userOrgId?: string;
  onSave: () => void;
  onCancel: () => void;
};

export default function SectionForm({
  section,
  collections,
  questions,
  accessToken,
  userOrgId,
  onSave,
  onCancel,
}: SectionFormProps) {
  const [localQuestions, setLocalQuestions] = useState(questions);
  const [localCollections, setLocalCollections] = useState(collections);
  const [showInlineCreator, setShowInlineCreator] = useState(false);
  const isEdit = !!section;
  const [symbol, setSymbol] = useState(section?.section_symbol ?? '');
  const [collectionId, setCollectionId] = useState<string | undefined>(
    section?.collection_id,
  );
  const [conditionFormulaId, setConditionFormulaId] = useState<
    string | undefined
  >(section?.condition_formula_id);
  const [sectionQuestions, setSectionQuestions] = useState<SectionQuestion[]>(
    section?.section_questions ?? [],
  );
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
      errors.symbol =
        'Section symbol may only contain letters, numbers, and underscores';
    }
    if (!collectionId) {
      errors.collectionId = 'Collection is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleCollectionCreated(created: AdminCollection) {
    setLocalCollections((prev) => [...prev, created]);
    setCollectionId(created.collection_id);
    setShowInlineCreator(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        section_symbol: symbol.trim(),
        collection_id: collectionId,
        version: section?.version ?? 1,
        ...(isEdit ? {} : { status: 'draft' as const }),
        condition_formula_id: conditionFormulaId,
        section_questions: sectionQuestions,
        translations: section?.translations ?? [],
      };

      const url = isEdit
        ? `/api/admin/sections/${section.section_id}`
        : '/api/admin/sections';

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
      <h3>{isEdit ? 'Edit Section' : 'Create Section'}</h3>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="section-symbol">Section Symbol</label>
        <input
          id="section-symbol"
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="e.g. financial_info"
          maxLength={100}
          pattern="[a-zA-Z0-9_]+"
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
          />
          <button
            type="button"
            className="btn-secondary btn-small btn-new-collection"
            onClick={() => setShowInlineCreator(true)}
          >
            + New Collection
          </button>
        </div>
        {fieldErrors.collectionId && (
          <p className="inline-error" role="alert">{fieldErrors.collectionId}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="condition-formula">Visibility Condition</label>
        <select
          id="condition-formula"
          className="collection-selector"
          value={conditionFormulaId ?? ''}
          onChange={(e) => setConditionFormulaId(e.target.value || undefined)}
        >
          <option value="">-- None --</option>
          <option value="placeholder-1" disabled>
            Formula 1 (coming soon)
          </option>
          <option value="placeholder-2" disabled>
            Formula 2 (coming soon)
          </option>
        </select>
      </div>

      <div className="form-group">
        <QuestionAttachmentEditor
          questions={localQuestions}
          collections={localCollections}
          sectionQuestions={sectionQuestions}
          onChange={setSectionQuestions}
          userOrgId={userOrgId}
          accessToken={accessToken}
          onQuestionCreated={(newQ) => {
            setLocalQuestions((prev) => [...prev, newQ]);
          }}
        />
      </div>

      <div className="form-group">
        <button
          type="button"
          className="btn-secondary btn-small"
          disabled
          title="Coming soon"
        >
          Translations
        </button>
      </div>

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
