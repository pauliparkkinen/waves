"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AdminSection, AdminCollection, AdminQuestion, SectionQuestion, Formula, Translation, TranslationRef } from '@/lib/api';
import TranslationField from '../components/TranslationField';
import QuestionAttachmentEditor from './QuestionAttachmentEditor';
import CollectionSelector from '../collections/CollectionSelector';
import InlineCollectionCreator from '../questions/InlineCollectionCreator';
import FormulaEditorPopup from '../components/FormulaEditorPopup';

type SectionFormProps = {
  section?: AdminSection;
  collections: AdminCollection[];
  questions: AdminQuestion[];
  accessToken: string;
  userOrgId?: string;
  readOnly?: boolean;
  disableSymbolAndCollection?: boolean;
  onSave: () => void;
  onCancel: () => void;
  noForm?: boolean;
};

export default function SectionForm({
  section,
  collections,
  questions,
  accessToken,
  userOrgId,
  readOnly,
  disableSymbolAndCollection,
  onSave,
  onCancel,
  noForm,
}: SectionFormProps) {
  const [localQuestions, setLocalQuestions] = useState(questions);
  const [localCollections, setLocalCollections] = useState(collections);
  const [showInlineCreator, setShowInlineCreator] = useState(false);
  const isEdit = !!section;
  const isReadOnly = readOnly === true;
  const isSymbolCollectionDisabled = isReadOnly || (isEdit && disableSymbolAndCollection);
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
  const [formulasInCollection, setFormulasInCollection] = useState<Formula[]>([]);
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [allTranslations, setAllTranslations] = useState<Translation[]>([]);
  const [titleTranslation, setTitleTranslation] = useState<TranslationRef | null>(null);
  const [descriptionTranslation, setDescriptionTranslation] = useState<TranslationRef | null>(null);

  const refreshTranslations = useCallback(async () => {
    if (!collectionId) return;
    try {
      const res = await fetch(
        `/api/admin/translations?collection_id=${encodeURIComponent(collectionId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = (await (res.ok ? res.json() : Promise.resolve([]))) as Translation[];
      setAllTranslations(data);
    } catch {
      setAllTranslations([]);
    }
  }, [collectionId, accessToken]);

  useEffect(() => { refreshTranslations(); }, [refreshTranslations]);

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

  async function refreshFormulas() {
    if (!collectionId) return;
    try {
      const res = await fetch(
        `/api/admin/formulas?collection_id=${encodeURIComponent(collectionId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (res.ok) {
        const data = (await res.json()) as Formula[];
        setFormulasInCollection(data);
      }
    } catch {
      /* silently ignore */
    }
  }

  useEffect(() => {
    refreshFormulas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, accessToken]);

  function handleCollectionCreated(created: AdminCollection) {
    setLocalCollections((prev) => [...prev, created]);
    setCollectionId(created.collection_id);
    setShowInlineCreator(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isReadOnly) return;
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
        translations: [titleTranslation, descriptionTranslation].filter((t): t is TranslationRef => t !== null),
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

  function renderContent() {
    return (
      <>
      <h3>{isReadOnly ? `View Section: ${section?.section_symbol ?? ''}` : isEdit ? 'Edit Section' : 'Create Section'}</h3>

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
        <label>Visibility Condition</label>
        <div className="collection-selector-row">
          <select
            className="collection-selector"
            value={conditionFormulaId ?? ''}
            onChange={(e) => setConditionFormulaId(e.target.value || undefined)}
            disabled={isReadOnly}
          >
            <option value="">-- None --</option>
            {formulasInCollection.map((f) => (
              <option key={f.formula_id} value={f.formula_id}>
                {f.symbol} ({f.output_type})
              </option>
            ))}
          </select>
          {!isReadOnly && conditionFormulaId && (
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={() => setEditingFormulaId(conditionFormulaId)}
            >
              Edit
            </button>
          )}
          {!isReadOnly && collectionId && (
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={() => setEditingFormulaId('__new__')}
            >
              + New Formula
            </button>
          )}
        </div>
        {editingFormulaId && (
          <FormulaEditorPopup
            formula={
              editingFormulaId === '__new__'
                ? undefined
                : formulasInCollection.find(
                    (f) => f.formula_id === editingFormulaId,
                  )
            }
            collectionId={collectionId ?? ''}
            accessToken={accessToken}
            onSave={(saved) => {
              setConditionFormulaId(saved.formula_id);
              setEditingFormulaId(null);
              refreshFormulas();
            }}
            onCancel={() => setEditingFormulaId(null)}
          />
        )}
      </div>

      <div className="form-group">
        <QuestionAttachmentEditor
          questions={localQuestions}
          collections={localCollections}
          sectionQuestions={sectionQuestions}
          onChange={setSectionQuestions}
          userOrgId={userOrgId}
          accessToken={accessToken}
          onQuestionCreated={(updatedQuestions) => {
            setLocalQuestions(updatedQuestions);
          }}
          readOnly={isReadOnly}
        />
      </div>

      {!isReadOnly && collectionId && (
        <div className="form-group translation-fields-group">
          <TranslationField
            label="Section Title"
            collectionId={collectionId}
            entitySymbol={symbol.trim() || section?.section_symbol || ''}
            accessToken={accessToken}
            value={titleTranslation ?? undefined}
            onChange={(ref) => setTitleTranslation(ref)}
            readOnly={isReadOnly}
            translations={allTranslations}
            onManageSaved={refreshTranslations}
          />
          <TranslationField
            label="Description"
            collectionId={collectionId}
            entitySymbol={symbol.trim() || section?.section_symbol || ''}
            accessToken={accessToken}
            value={descriptionTranslation ?? undefined}
            onChange={(ref) => setDescriptionTranslation(ref)}
            readOnly={isReadOnly}
            translations={allTranslations}
            onManageSaved={refreshTranslations}
          />
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
          <button type={noForm ? "button" : "submit"} className="btn-primary" disabled={saving} onClick={noForm ? handleSubmit : undefined}>
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
      </>
    );
  }

  return noForm ? (
    <div className="collection-form">
      {renderContent()}
    </div>
  ) : (
    <form className="collection-form" onSubmit={handleSubmit} noValidate>
      {renderContent()}
    </form>
  );
}
