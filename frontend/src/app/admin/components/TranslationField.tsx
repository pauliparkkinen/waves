"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Translation, TranslationRef } from '@/lib/api';
import TranslationEditorPopup from './TranslationEditorPopup';

type TranslationFieldProps = {
  label: string;
  collectionId: string;
  entitySymbol: string;
  accessToken: string;
  value?: TranslationRef;
  onChange: (ref: TranslationRef | null) => void;
  readOnly?: boolean;
  translations?: Translation[];
};

export default function TranslationField({
  label,
  collectionId,
  entitySymbol,
  accessToken,
  value,
  onChange,
  readOnly,
  translations: externalTranslations,
}: TranslationFieldProps) {
  const [allTranslations, setAllTranslations] = useState<Translation[]>(
    externalTranslations ?? [],
  );
  const [uniqueSymbols, setUniqueSymbols] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showPopup, setShowPopup] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const fetchTranslations = useCallback(async (force = false) => {
    if (!force && externalTranslations) {
      return;
    }
    if (!collectionId) return;
    try {
      const res = await fetch(
        `/api/admin/translations?collection_id=${encodeURIComponent(collectionId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error(`Failed to fetch translations (${res.status})`);
      const data = (await res.json()) as Translation[];
      setAllTranslations(data);
      const symbols = [...new Set(data.map((t: Translation) => t.symbol))];
      setUniqueSymbols(symbols);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch translations');
    }
  }, [collectionId, accessToken, externalTranslations]);

  useEffect(() => { fetchTranslations(); }, [fetchTranslations]);

  useEffect(() => {
    if (externalTranslations) {
      setAllTranslations(externalTranslations);
      const symbols = [...new Set(externalTranslations.map((t: Translation) => t.symbol))];
      setUniqueSymbols(symbols);
    }
  }, [externalTranslations]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSymbols = uniqueSymbols.filter((sym) =>
    sym.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="translation-field">
      <label className="translation-field-label">{label}</label>
      <div className="translation-field-controls">
        <div className="translation-field-search" ref={searchRef}>
          <div className="translation-field-input-wrapper">
            <input
              type="text"
              className="translation-field-search-input"
              placeholder={value ? value.translation_symbol : 'Search translations...'}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); setHighlightedIndex(-1); }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={(e) => {
                if (!isDropdownOpen) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightedIndex((prev) =>
                    prev < filteredSymbols.length - 1 ? prev + 1 : 0,
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredSymbols.length - 1,
                  );
                } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                  e.preventDefault();
                  const selected = filteredSymbols[highlightedIndex];
                  if (selected) {
                    onChange({ translation_symbol: selected, symbol: entitySymbol });
                    setSearchQuery('');
                    setIsDropdownOpen(false);
                  }
                } else if (e.key === 'Escape') {
                  setIsDropdownOpen(false);
                }
              }}
              aria-label={`Select translation for ${label}`}
              aria-expanded={isDropdownOpen}
              aria-autocomplete="list"
              role="combobox"
              aria-controls="translation-field-dropdown"
              readOnly={readOnly}
            />
            {value && !searchQuery && (
              <button
                type="button"
                className="translation-field-clear"
                onClick={() => { onChange(null); setSearchQuery(''); }}
                aria-label={`Clear ${label} translation`}
              >
                &times;
              </button>
            )}
          </div>

          {isDropdownOpen && (
            <div className="translation-field-dropdown" id="translation-field-dropdown" role="listbox" aria-label={`Available translations for ${label}`}>
              {filteredSymbols.length === 0 ? (
                <div className="translation-field-dropdown-empty">
                  {searchQuery
                    ? `No translations match "${searchQuery}"`
                    : uniqueSymbols.length === 0
                      ? 'No translations yet. Click "Manage" to create one.'
                      : 'No translations available.'}
                </div>
              ) : (
                filteredSymbols.map((sym, i) => {
                  const localeCodes = allTranslations.filter((t) => t.symbol === sym).map((t) => t.locale_code);
                  return (
                    <button
                      key={sym}
                      type="button"
                      className={`translation-field-dropdown-item ${highlightedIndex === i ? 'highlighted' : ''} ${value?.translation_symbol === sym ? 'selected' : ''}`}
                      role="option"
                      aria-selected={highlightedIndex === i}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange({ translation_symbol: sym, symbol: entitySymbol });
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span className="translation-field-item-symbol">{sym}</span>
                      <span className="translation-field-item-locales">{localeCodes.join(', ')}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {!readOnly && (
          <button
            type="button"
            className="btn-secondary btn-small translation-field-manage-btn"
            onClick={() => setShowPopup(true)}
            aria-label={`Manage translations for ${label}`}
          >
            Manage
          </button>
        )}
      </div>

      {fetchError && (
        <p className="inline-error" role="alert">{fetchError}</p>
      )}

      {showPopup && (
        <TranslationEditorPopup
          collectionId={collectionId}
          accessToken={accessToken}
          onSave={(_translations) => {
            // Translations are saved server-side by TranslationEditorPopup.
            // Force-refetch to pick up newly created translations.
            fetchTranslations(true);
            setShowPopup(false);
          }}
          onCancel={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}
