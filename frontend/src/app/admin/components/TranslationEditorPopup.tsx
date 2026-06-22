"use client";

import { useState, useEffect, useRef } from 'react';
import type { Translation, PublishStatus } from '@/lib/api';
import { AVAILABLE_LOCALES, getLocaleInfo } from '@/lib/translations/locales';

type TranslationEditorPopupProps = {
  collectionId: string;
  accessToken: string;
  existingTranslations?: Translation[];
  onSave: (translations: Translation[]) => void;
  onCancel: () => void;
};

export default function TranslationEditorPopup({
  collectionId,
  accessToken,
  existingTranslations,
  onSave,
  onCancel,
}: TranslationEditorPopupProps) {
  const [translations, setTranslations] = useState<Translation[]>(
    existingTranslations ?? [],
  );
  const [newSymbol, setNewSymbol] = useState('');
  const [newLocaleCode, setNewLocaleCode] = useState(AVAILABLE_LOCALES[0]?.code ?? '');
  const [newValue, setNewValue] = useState('');
  const [newStatus, setNewStatus] = useState<PublishStatus>('draft');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSymbol, setEditSymbol] = useState('');
  const [editLocaleCode, setEditLocaleCode] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editStatus, setEditStatus] = useState<PublishStatus>('draft');
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const ERRORS_ID = 'translation-add-errors';
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const focusableSelectors =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const focusable = overlay!.querySelectorAll<HTMLElement>(focusableSelectors);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    const focusable = overlay.querySelectorAll<HTMLElement>(focusableSelectors);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      trigger?.focus();
    };
  }, []);

  useEffect(() => {
    async function fetchTranslations() {
      try {
        const res = await fetch(
          `/api/admin/translations?collection_id=${encodeURIComponent(collectionId)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (res.ok) {
          const data = (await res.json()) as Translation[];
          setTranslations(data);
          setFetchError(null);
        } else {
          setFetchError(`Failed to load translations (${res.status})`);
        }
      } catch {
        setFetchError('Failed to load translations');
      }
    }

    if (!existingTranslations || existingTranslations.length === 0) {
      fetchTranslations();
    }
  }, [collectionId, accessToken, existingTranslations]);

  function validate(
    symbol: string,
    localeCode: string,
    value: string,
  ): string[] {
    const errs: string[] = [];
    const trimmedSymbol = symbol.trim();
    if (!trimmedSymbol) {
      errs.push('Symbol is required');
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedSymbol)) {
      errs.push('Symbol may only contain letters, numbers, and underscores');
    }
    if (!value.trim()) {
      errs.push('Value is required');
    }
    if (!localeCode || !AVAILABLE_LOCALES.some((l) => l.code === localeCode)) {
      errs.push('A valid locale must be selected');
    }
    return errs;
  }

  async function handleAdd() {
    setErrors([]);
    setFieldErrors({});
    setSaveError(null);

    const newFieldErrors: Record<string, string> = {};
    if (!newSymbol.trim()) newFieldErrors.newSymbol = 'Symbol is required';
    if (!newValue.trim()) newFieldErrors.newValue = 'Value is required';
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          collection_id: collectionId,
          symbol: newSymbol.trim(),
          locale_code: newLocaleCode,
          value: newValue.trim(),
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const saved = (await res.json()) as Translation;
      setTranslations((prev) => [...prev, saved]);
      setNewSymbol('');
      setNewLocaleCode(AVAILABLE_LOCALES[0]?.code ?? '');
      setNewValue('');
      setNewStatus('draft');
      setShowAddForm(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(t: Translation) {
    setEditingId(t.translation_id);
    setEditSymbol(t.symbol);
    setEditLocaleCode(t.locale_code);
    setEditValue(t.value);
    setEditStatus(t.status);
    setErrors([]);
    setFieldErrors({});
    setSaveError(null);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    setErrors([]);
    setFieldErrors({});
    setSaveError(null);

    const validationErrors = validate(editSymbol, editLocaleCode, editValue);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/translations/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          symbol: editSymbol.trim(),
          locale_code: editLocaleCode,
          value: editValue.trim(),
          status: editStatus,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const updated = (await res.json()) as Translation;
      setTranslations((prev) =>
        prev.map((t) => (t.translation_id === editingId ? updated : t)),
      );
      setEditingId(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this translation?')) return;
    setSaveError(null);

    try {
      const res = await fetch(`/api/admin/translations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      setTranslations((prev) => prev.filter((t) => t.translation_id !== id));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  function handleSaveAll() {
    onSave(translations);
  }

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="translation-editor-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
      tabIndex={-1}
    >
      <div
        className="modal-content translation-editor-popup"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="translation-editor-heading">Translation Editor</h3>

        {fetchError && (
          <div className="error-message" role="alert">
            {fetchError}
          </div>
        )}

        {translations.length > 0 && (
          <div className="translations-list">
            <h4>Translations ({translations.length})</h4>
            <div className="translations-table">
              {translations.map((t) => (
                <div key={t.translation_id} className="translation-row">
                  {editingId === t.translation_id ? (
                    <div className="translation-edit-inline">
                      <div className="form-group">
                        <label htmlFor={`edit-locale-${t.translation_id}`}>Locale</label>
                        <select
                          id={`edit-locale-${t.translation_id}`}
                          value={editLocaleCode}
                          onChange={(e) => setEditLocaleCode(e.target.value)}
                        >
                          {AVAILABLE_LOCALES.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.flag} {l.name} ({l.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor={`edit-symbol-${t.translation_id}`}>Symbol / Key</label>
                        <input
                          id={`edit-symbol-${t.translation_id}`}
                          type="text"
                          value={editSymbol}
                          onChange={(e) => setEditSymbol(e.target.value)}
                          maxLength={100}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`edit-value-${t.translation_id}`}>Translation Value</label>
                        <textarea
                          id={`edit-value-${t.translation_id}`}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="form-group">
                        <label>Status</label>
                        <div className="publish-toggle">
                          <label>
                            <input
                              type="radio"
                              name={`edit-status-${t.translation_id}`}
                              value="draft"
                              checked={editStatus === 'draft'}
                              onChange={() => setEditStatus('draft')}
                            />{' '}
                            Draft
                          </label>
                          <label>
                            <input
                              type="radio"
                              name={`edit-status-${t.translation_id}`}
                              value="published"
                              checked={editStatus === 'published'}
                              onChange={() => setEditStatus('published')}
                            />{' '}
                            Published
                          </label>
                        </div>
                      </div>
                      <div className="translation-edit-actions">
                        <button
                          type="button"
                          className="btn-small btn-primary"
                          onClick={handleSaveEdit}
                          disabled={saving}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn-small btn-secondary"
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="translation-display-row">
                      <span className="locale-badge">
                        {getLocaleInfo(t.locale_code)?.flag} {t.locale_code}
                      </span>
                      <span className="translation-symbol">{t.symbol}</span>
                      <span className="translation-value">{t.value}</span>
                      <span className="translation-version">v{t.version}</span>
                      <span className={`status-badge status-${t.status}`}>{t.status}</span>
                      <button
                        onClick={() => handleEdit(t)}
                        className="btn-small btn-secondary"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.translation_id)}
                        className="btn-small btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn-secondary btn-small"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Translation'}
        </button>

        {showAddForm && (
          <div className="translation-add-form">
            <div className="form-group">
              <label htmlFor="translation-locale">Locale</label>
              <select
                id="translation-locale"
                value={newLocaleCode}
                onChange={(e) => setNewLocaleCode(e.target.value)}
              >
                {AVAILABLE_LOCALES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="translation-symbol">Symbol / Key</label>
              <input
                id="translation-symbol"
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                placeholder="e.g. form_title"
                maxLength={100}
                aria-invalid={!!fieldErrors.newSymbol}
                aria-describedby={fieldErrors.newSymbol ? ERRORS_ID : undefined}
              />
              {fieldErrors.newSymbol && (
                <p className="inline-error" role="alert">{fieldErrors.newSymbol}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="translation-value">Translation Value</label>
              <textarea
                id="translation-value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter translated text"
                rows={3}
                aria-invalid={!!fieldErrors.newValue}
                aria-describedby={fieldErrors.newValue ? ERRORS_ID : undefined}
              />
              {fieldErrors.newValue && (
                <p className="inline-error" role="alert">{fieldErrors.newValue}</p>
              )}
            </div>

            <div className="form-group">
              <label>Status</label>
              <div className="publish-toggle">
                <label>
                  <input
                    type="radio"
                    name="new-status"
                    value="draft"
                    checked={newStatus === 'draft'}
                    onChange={() => setNewStatus('draft')}
                  />{' '}
                  Draft
                </label>
                <label>
                  <input
                    type="radio"
                    name="new-status"
                    value="published"
                    checked={newStatus === 'published'}
                    onChange={() => setNewStatus('published')}
                  />{' '}
                  Published
                </label>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary btn-small"
              onClick={handleAdd}
              disabled={saving}
            >
              Add Translation
            </button>
          </div>
        )}

        {errors.length > 0 && (
          <div className="translation-errors" id={ERRORS_ID}>
            {errors.map((err, i) => (
              <p key={i} className="translation-error-item">
                {err}
              </p>
            ))}
          </div>
        )}

        {saveError && (
          <div className="error-message" role="alert">
            {saveError}
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
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>
    </div>
  );
}
