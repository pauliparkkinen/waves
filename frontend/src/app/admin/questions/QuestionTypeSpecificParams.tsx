'use client';

import { useCallback } from 'react';
import type { QuestionType } from '@/lib/api';
import OptionsEditor from './OptionsEditor';

type QuestionTypeSpecificParamsProps = {
  type: QuestionType;
  parameters: Record<string, unknown>;
  onChange: (parameters: Record<string, unknown>) => void;
  valueType?: string;
};

function isValidOption(
  o: unknown,
): o is { label: string; value: string; order_index: number } {
  return (
    typeof o === 'object' &&
    o !== null &&
    'label' in o &&
    'value' in o &&
    'order_index' in o
  );
}

function ensureOptions(
  raw: unknown,
): { label: string; value: string; order_index: number }[] {
  return Array.isArray(raw) ? raw.filter(isValidOption) : [];
}

export default function QuestionTypeSpecificParams({
  type,
  parameters,
  onChange,
  valueType,
}: QuestionTypeSpecificParamsProps) {
  const updateParam = useCallback(
    (key: string, value: unknown) => {
      onChange({ ...parameters, [key]: value });
    },
    [parameters, onChange],
  );

  function handleNumberChange(key: string, raw: string) {
    updateParam(key, raw === '' ? undefined : Number(raw));
  }

  if (!type) {
    return (
      <div className="type-specific-params">
        <p className="empty-state">
          Select a question type to see its parameters.
        </p>
      </div>
    );
  }

  switch (type) {
    case 'free-text':
      return (
        <div className="type-specific-params">
          <div className="form-group">
            <label htmlFor="param-max-length">Max characters</label>
            <input
              id="param-max-length"
              type="number"
              inputMode="numeric"
              className="collection-selector"
              value={(parameters.max_length as string | number | undefined) ?? ''}
              onChange={(e) => handleNumberChange('max_length', e.target.value)}
              placeholder="Max characters"
            />
          </div>
          <div className="form-group">
            <div className="translation-ref-header">
              <label htmlFor="param-placeholder">Placeholder</label>
              <span className="translation-ref-badge">translation ref</span>
            </div>
            <div className="translation-ref-field">
              <input
                id="param-placeholder"
                type="text"
                className="collection-selector"
                value={(parameters.placeholder as string | undefined) ?? ''}
                onChange={(e) => updateParam('placeholder', e.target.value)}
                placeholder="translation_symbol"
              />
              <button
                type="button"
                className="btn-secondary btn-small btn-translate"
                disabled
                title="Coming soon"
              >
                Add Translation
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={(parameters.multiline as boolean | undefined) ?? false}
                onChange={(e) => updateParam('multiline', e.target.checked)}
                style={{ marginRight: '0.5rem' }}
              />
              Multi-line text area
            </label>
          </div>
        </div>
      );

    case 'range':
      return (
        <div className="type-specific-params">
          <div className="form-group">
            <label htmlFor="param-min">Min *</label>
            <input
              id="param-min"
              type="number"
              inputMode="numeric"
              className="collection-selector"
              value={(parameters.min as string | number | undefined) ?? ''}
              onChange={(e) => handleNumberChange('min', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="param-max">Max *</label>
            <input
              id="param-max"
              type="number"
              inputMode="numeric"
              className="collection-selector"
              value={(parameters.max as string | number | undefined) ?? ''}
              onChange={(e) => handleNumberChange('max', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="param-step">Step</label>
            <input
              id="param-step"
              type="number"
              inputMode="decimal"
              className="collection-selector"
              value={(parameters.step as string | number | undefined) ?? ''}
              onChange={(e) => handleNumberChange('step', e.target.value)}
              min={0.01}
              placeholder="0.01"
            />
          </div>
          <div className="form-group">
            <div className="translation-ref-header">
              <label htmlFor="param-min-label">Minimum label</label>
              <span className="translation-ref-badge">translation ref</span>
            </div>
            <div className="translation-ref-field">
              <input
                id="param-min-label"
                type="text"
                className="collection-selector"
                value={(parameters.min_label as string | undefined) ?? ''}
                onChange={(e) => updateParam('min_label', e.target.value)}
                placeholder="translation_symbol"
              />
              <button
                type="button"
                className="btn-secondary btn-small btn-translate"
                disabled
                title="Coming soon"
              >
                Add Translation
              </button>
            </div>
          </div>
          <div className="form-group">
            <div className="translation-ref-header">
              <label htmlFor="param-max-label">Maximum label</label>
              <span className="translation-ref-badge">translation ref</span>
            </div>
            <div className="translation-ref-field">
              <input
                id="param-max-label"
                type="text"
                className="collection-selector"
                value={(parameters.max_label as string | undefined) ?? ''}
                onChange={(e) => updateParam('max_label', e.target.value)}
                placeholder="translation_symbol"
              />
              <button
                type="button"
                className="btn-secondary btn-small btn-translate"
                disabled
                title="Coming soon"
              >
                Add Translation
              </button>
            </div>
          </div>
        </div>
      );

    case 'select':
      return (
        <div className="type-specific-params">
          <div className="form-group">
            <label>Options</label>
            <OptionsEditor
              options={ensureOptions(parameters.options)}
              onChange={(opts) => updateParam('options', opts)}
              valueType={valueType}
            />
          </div>
        </div>
      );

    case 'multiselect':
      return (
        <div className="type-specific-params">
          <div className="form-group">
            <label>Options</label>
            <OptionsEditor
              options={ensureOptions(parameters.options)}
              onChange={(opts) => updateParam('options', opts)}
              valueType={valueType}
            />
          </div>
          <div className="form-group">
            <label htmlFor="param-min-select">Minimum selections</label>
            <input
              id="param-min-select"
              type="number"
              inputMode="numeric"
              className="collection-selector"
              value={
                (parameters.min_select as string | number | undefined) ?? ''
              }
              onChange={(e) =>
                handleNumberChange('min_select', e.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="param-max-select">Maximum selections</label>
            <input
              id="param-max-select"
              type="number"
              inputMode="numeric"
              className="collection-selector"
              value={
                (parameters.max_select as string | number | undefined) ?? ''
              }
              onChange={(e) =>
                handleNumberChange('max_select', e.target.value)
              }
            />
          </div>
        </div>
      );

    case 'radio':
      return (
        <div className="type-specific-params">
          <div className="form-group">
            <label>Options</label>
            <OptionsEditor
              options={ensureOptions(parameters.options)}
              onChange={(opts) => updateParam('options', opts)}
              valueType={valueType}
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="type-specific-params">
          <p className="empty-state">
            Select a question type to see its parameters.
          </p>
        </div>
      );
  }
}
