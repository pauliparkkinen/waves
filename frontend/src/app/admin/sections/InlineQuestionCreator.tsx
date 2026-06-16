"use client";

import { useState } from 'react';
import type { AdminQuestion, AdminCollection, QuestionType } from '@/lib/api';
import CollectionSelector from '../collections/CollectionSelector';
import InlineCollectionCreator from '../questions/InlineCollectionCreator';
import QuestionTypeSpecificParams from '../questions/QuestionTypeSpecificParams';

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'free-text', label: 'Free-text' },
  { value: 'range', label: 'Range' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'radio', label: 'Radio' },
];

type InlineQuestionCreatorProps = {
  accessToken: string;
  collections: AdminCollection[];
  userOrgId?: string;
  onCreated: (question: AdminQuestion) => void;
  onCancel: () => void;
};

export default function InlineQuestionCreator({
  accessToken,
  collections,
  userOrgId,
  onCreated,
  onCancel,
}: InlineQuestionCreatorProps) {
  const [symbol, setSymbol] = useState('');
  const [collectionId, setCollectionId] = useState<string | undefined>();
  const [type, setType] = useState<QuestionType | undefined>();
  const [parameters, setParameters] = useState<Record<string, unknown>>({});
  const [localCollections, setLocalCollections] = useState(collections);
  const [showInlineCreator, setShowInlineCreator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const trimmed = symbol.trim();
    if (!trimmed) {
      errors.symbol = 'Question symbol is required';
    } else if (trimmed.length < 2) {
      errors.symbol = 'Question symbol must be at least 2 characters';
    } else if (trimmed.length > 100) {
      errors.symbol = 'Question symbol must be 100 characters or fewer';
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      errors.symbol = 'Question symbol may only contain letters, numbers, and underscores';
    }
    if (!collectionId) {
      errors.collectionId = 'Collection is required';
    }
    if (!type) {
      errors.type = 'Question type is required';
    }
    if (type === 'select' || type === 'multiselect' || type === 'radio') {
      const options = parameters.options as { label: string; value: string; order_index: number }[] | undefined;
      if (!options || options.length < 2) {
        errors.parameters = 'At least 2 options are required for this question type';
      }
    }
    if (type === 'range') {
      const min = parameters.min as number | undefined;
      const max = parameters.max as number | undefined;
      if (min === undefined || max === undefined || typeof min !== 'number' || typeof max !== 'number') {
        errors.parameters = 'Min and max must be valid numbers';
      } else if (min >= max) {
        errors.parameters = 'Min must be less than max';
      }
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
        question_symbol: symbol.trim(),
        collection_id: collectionId,
        type,
        version: 1,
        parameters,
        condition_formula_id: null,
        translations: [],
      };
      const res = await fetch('/api/admin/questions', {
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
      const created = (await res.json()) as AdminQuestion;
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  function handleTypeChange(newType: QuestionType) {
    setType(newType);
    setParameters({});
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
      aria-labelledby="inline-question-heading"
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      tabIndex={-1}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '36rem' }}>
        <div>
          <h3 id="inline-question-heading">Create Question</h3>

          {error && <div className="error-message" role="alert">{error}</div>}

          <div className="form-group">
            <label htmlFor="iq-symbol">Question Symbol</label>
            <input
              id="iq-symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. annual_revenue"
              maxLength={100}
              pattern="[a-zA-Z0-9_]+"
              autoFocus
              aria-invalid={!!fieldErrors.symbol}
              aria-describedby={fieldErrors.symbol ? 'iq-symbol-error' : undefined}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
            />
            {fieldErrors.symbol && (
              <p className="inline-error" id="iq-symbol-error" role="alert">{fieldErrors.symbol}</p>
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

          <div className="form-group">
            <label>Question Type</label>
            <div className="question-type-selector">
              {QUESTION_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="question-type-option">
                  <input type="radio" name="iq-type" value={opt.value} checked={type === opt.value} onChange={() => handleTypeChange(opt.value)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            {fieldErrors.type && <p className="inline-error" role="alert">{fieldErrors.type}</p>}
          </div>

          {type && (
            <div className="form-group">
              <h4>Type Parameters</h4>
              <QuestionTypeSpecificParams type={type} parameters={parameters} onChange={setParameters} />
              {fieldErrors.parameters && <p className="inline-error" role="alert">{fieldErrors.parameters}</p>}
            </div>
          )}

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
