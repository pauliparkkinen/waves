"use client";

import { useMemo, useState } from 'react';
import type { AdminSection, AdminCollection, FormSection } from '@/lib/api';

type SectionAttachmentEditorProps = {
  sections: AdminSection[];
  collections: AdminCollection[];
  formSections: FormSection[];
  onChange: (updated: FormSection[]) => void;
  readOnly?: boolean;
};

export default function SectionAttachmentEditor({
  sections,
  collections,
  formSections,
  onChange,
  readOnly,
}: SectionAttachmentEditorProps) {
  const sectionsBySymbol = useMemo(() => {
    const map = new Map<string, AdminSection[]>();
    for (const sec of sections) {
      if (!map.has(sec.section_symbol)) map.set(sec.section_symbol, []);
      map.get(sec.section_symbol)!.push(sec);
    }
    for (const [, versions] of map) {
      versions.sort((a, b) => b.version - a.version);
    }
    return map;
  }, [sections]);

  const attachedSymbols = useMemo(
    () => new Set(formSections.map((fs) => fs.section_symbol)),
    [formSections],
  );

  const availableSections = useMemo(
    () =>
      sections
        .filter((s) => !attachedSymbols.has(s.section_symbol))
        .sort((a, b) => a.section_symbol.localeCompare(b.section_symbol)),
    [sections, attachedSymbols],
  );

  const sectionsByCollection = useMemo(() => {
    const map = new Map<string, AdminSection[]>();
    const latestBySymbol = new Map<string, AdminSection>();
    for (const s of availableSections) {
      const existing = latestBySymbol.get(s.section_symbol);
      if (!existing || s.version > existing.version) {
        latestBySymbol.set(s.section_symbol, s);
      }
    }
    for (const s of latestBySymbol.values()) {
      const colId = s.collection_id;
      if (!map.has(colId)) map.set(colId, []);
      map.get(colId)!.push(s);
    }
    return map;
  }, [availableSections]);

  const [selectedAddSymbol, setSelectedAddSymbol] = useState('');

  const sortedCollections = useMemo(
    () =>
      [...collections].sort((a, b) =>
        a.collection_symbol.localeCompare(b.collection_symbol),
      ),
    [collections],
  );

  function handleAddButton() {
    if (!selectedAddSymbol) return;

    const maxOrder = formSections.reduce(
      (max, fs) => Math.max(max, fs.order_number),
      -1,
    );

    const versions = sectionsBySymbol.get(selectedAddSymbol) ?? [];
    const latestVersion = versions[0];
    const newSection: FormSection = {
      section_symbol: selectedAddSymbol,
      version_number: latestVersion?.version ?? 1,
      order_number: maxOrder + 1,
    };

    onChange([...formSections, newSection]);
    setSelectedAddSymbol('');
  }

  function handleRemove(symbol: string) {
    onChange(formSections.filter((fs) => fs.section_symbol !== symbol));
  }

  function handleVersionChange(symbol: string, version: number) {
    onChange(
      formSections.map((fs) =>
        fs.section_symbol === symbol ? { ...fs, version_number: version } : fs,
      ),
    );
  }

  function handleMoveUp(sortedIndex: number) {
    if (sortedIndex <= 0) return;
    const current = sortedFormSections[sortedIndex];
    const above = sortedFormSections[sortedIndex - 1];

    const updated = formSections.map((fs) => {
      if (fs.section_symbol === current.section_symbol) {
        return { ...fs, order_number: sortedIndex - 1 };
      }
      if (fs.section_symbol === above.section_symbol) {
        return { ...above, order_number: sortedIndex };
      }
      return fs;
    });
    onChange(updated);
  }

  function handleMoveDown(sortedIndex: number) {
    if (sortedIndex >= sortedFormSections.length - 1) return;
    const current = sortedFormSections[sortedIndex];
    const below = sortedFormSections[sortedIndex + 1];

    const updated = formSections.map((fs) => {
      if (fs.section_symbol === current.section_symbol) {
        return { ...fs, order_number: sortedIndex + 1 };
      }
      if (fs.section_symbol === below.section_symbol) {
        return { ...below, order_number: sortedIndex };
      }
      return fs;
    });
    onChange(updated);
  }

  const sortedFormSections = useMemo(
    () => [...formSections].sort((a, b) => a.order_number - b.order_number),
    [formSections],
  );

  return (
    <div className="question-attachment-editor">
      <div className="question-attachment-header">
        <span>Attached Sections</span>
        <span className="question-attachment-count">
          {formSections.length}
        </span>
      </div>

      {formSections.length === 0 && (
        <div className="question-attachment-empty">
          No sections attached yet.
        </div>
      )}

      {sortedFormSections.map((fs, index) => {
        const versions = sectionsBySymbol.get(fs.section_symbol) ?? [];
        return (
        <div key={fs.section_symbol} className="question-attachment-row">
          <span className="question-attachment-symbol">
            {fs.section_symbol}
          </span>
          {!readOnly && versions.length > 1 ? (
            <select
              className="question-version-select"
              value={String(fs.version_number)}
              onChange={(e) => handleVersionChange(fs.section_symbol, parseInt(e.target.value, 10))}
              aria-label={`Version for ${fs.section_symbol}`}
            >
              {versions.map((sv) => (
                <option key={sv.version} value={sv.version}>
                  v{sv.version}
                </option>
              ))}
            </select>
          ) : (
            <span className="question-version-text">v{fs.version_number}</span>
          )}
          {!readOnly && (
            <>
              <div className="question-attachment-reorder">
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  disabled={index === 0}
                  onClick={() => handleMoveUp(index)}
                  aria-label={`Move ${fs.section_symbol} up`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  disabled={index === sortedFormSections.length - 1}
                  onClick={() => handleMoveDown(index)}
                  aria-label={`Move ${fs.section_symbol} down`}
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                className="btn-danger btn-small"
                onClick={() => handleRemove(fs.section_symbol)}
                aria-label={`Remove ${fs.section_symbol}`}
              >
                Remove
              </button>
            </>
          )}
        </div>
      );
      })}

      {!readOnly && availableSections.length > 0 && (
        <div className="question-attachment-add">
          <select
            value={selectedAddSymbol}
            onChange={(e) => setSelectedAddSymbol(e.target.value)}
            aria-label="Add section"
          >
            <option value="" disabled>
              -- Select a section --
            </option>
            {sortedCollections.map((col) => {
              const colSections = sectionsByCollection.get(col.collection_id);
              if (!colSections || colSections.length === 0) return null;
              return (
                <optgroup key={col.collection_id} label={col.collection_symbol}>
                  {colSections.map((s) => (
                    <option key={s.section_id} value={s.section_symbol}>
                      {s.section_symbol} (v{s.version})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <button
            type="button"
            className="btn-primary btn-small"
            disabled={!selectedAddSymbol}
            onClick={handleAddButton}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
