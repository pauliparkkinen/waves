'use client';

import type { Translation, TranslationRef } from '@/lib/api';
import TranslationField from '../components/TranslationField';

type Option = { label: string; value: string; order_index: number; id?: string };

type OptionsEditorProps = {
  options: Option[];
  onChange: (options: Option[]) => void;
  valueType?: string;
  collectionId?: string;
  entitySymbol: string;
  accessToken: string;
  translations: Translation[];
};

function isValidOptionValue(value: string, valueType: string | undefined): { valid: boolean; message?: string } {
  if (!valueType || valueType === 'string') return { valid: true };
  if (valueType === 'number') {
    if (value === '') return { valid: true };
    const num = Number(value);
    if (isNaN(num)) return { valid: false, message: 'Must be a number' };
    return { valid: true };
  }
  if (valueType === 'boolean') {
    if (value === '' || value === 'true' || value === 'false') return { valid: true };
    return { valid: false, message: 'Must be "true" or "false"' };
  }
  return { valid: true };
}

export default function OptionsEditor({
  options,
  onChange,
  valueType,
  collectionId,
  entitySymbol,
  accessToken,
  translations,
}: OptionsEditorProps) {
  function handleValueChange(index: number, value: string) {
    const updated = options.map((opt, i) =>
      i === index ? { ...opt, value } : opt,
    );
    onChange(updated);
  }

  function handleLabelChange(index: number, ref: TranslationRef | null) {
    const updated = options.map((opt, i) =>
      i === index ? { ...opt, label: ref?.translation_symbol ?? '' } : opt,
    );
    onChange(updated);
  }

  function handleRemove(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  function handleAdd() {
    const nextOrder =
      options.length > 0
        ? Math.max(...options.map((o) => o.order_index)) + 1
        : 0;
    const id = crypto.randomUUID?.() ?? `opt-${Date.now()}-${Math.random()}`;
    onChange([
      ...options,
      { label: '', value: '', order_index: nextOrder, id },
    ]);
  }

  if (options.length === 0) {
    return (
      <div className="options-editor">
        <p className="empty-state">
          No options defined. Click &apos;Add Option&apos; to add one.
        </p>
        <button
          type="button"
          className="btn-primary btn-small btn-add-option"
          onClick={handleAdd}
        >
          Add Option
        </button>
      </div>
    );
  }

  return (
    <div className="options-editor">
      {options.map((opt, i) => (
        <div key={opt.id ?? i} className="option-card">
          <span className="option-order">{i + 1}</span>
          <div className="option-label-field">
            <TranslationField
              label="Label"
              collectionId={collectionId ?? ''}
              entitySymbol={entitySymbol}
              accessToken={accessToken}
              value={
                opt.label
                  ? { translation_symbol: opt.label, symbol: entitySymbol }
                  : undefined
              }
              onChange={(ref) => handleLabelChange(i, ref)}
              translations={translations}
            />
          </div>
          <div className="option-value-wrap">
            <input
              type="text"
              className={`option-value-input${(() => {
                const result = isValidOptionValue(opt.value, valueType);
                return result.valid ? '' : ' has-error';
              })()}`}
              value={opt.value}
              onChange={(e) => handleValueChange(i, e.target.value)}
              placeholder="Value"
              aria-label={`Option ${i + 1} value`}
              aria-invalid={!isValidOptionValue(opt.value, valueType).valid}
            />
            {(() => {
              const result = isValidOptionValue(opt.value, valueType);
              return !result.valid ? (
                <span className="inline-error" style={{ fontSize: '0.75rem' }}>
                  {result.message}
                </span>
              ) : null;
            })()}
          </div>
          <button
            type="button"
            className="btn-danger btn-small"
            onClick={() => handleRemove(i)}
            aria-label={`Remove option ${i + 1}`}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="option-add-row">
        <button
          type="button"
          className="btn-secondary btn-small btn-add-option"
          onClick={handleAdd}
        >
          + Add Option
        </button>
      </div>
    </div>
  );
}
