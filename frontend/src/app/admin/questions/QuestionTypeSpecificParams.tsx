'use client';

import { useCallback } from 'react';
import type { QuestionType, Translation, TranslationRef } from '@/lib/api';
import OptionsEditor from './OptionsEditor';
import TranslationField from '../components/TranslationField';

type QuestionTypeSpecificParamsProps = {
  type: QuestionType;
  parameters: Record<string, unknown>;
  onChange: (parameters: Record<string, unknown>) => void;
  valueType?: string;
  collectionId?: string;
  entitySymbol: string;
  accessToken: string;
  translations: Translation[];
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

function paramToRef(value: unknown, symbol: string): TranslationRef | undefined {
  return typeof value === 'string' && value.trim()
    ? { translation_symbol: value.trim(), symbol }
    : undefined;
}

export default function QuestionTypeSpecificParams({
  type,
  parameters,
  onChange,
  valueType,
  collectionId,
  entitySymbol,
  accessToken,
  translations,
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
            <TranslationField
              label="Placeholder"
              collectionId={collectionId ?? ''}
              entitySymbol={entitySymbol}
              accessToken={accessToken}
              value={paramToRef(parameters.placeholder, entitySymbol)}
              onChange={(ref) => updateParam('placeholder', ref?.translation_symbol ?? undefined)}
              translations={translations}
            />
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
            <TranslationField
              label="Minimum label"
              collectionId={collectionId ?? ''}
              entitySymbol={entitySymbol}
              accessToken={accessToken}
              value={paramToRef(parameters.min_label, entitySymbol)}
              onChange={(ref) => updateParam('min_label', ref?.translation_symbol ?? undefined)}
              translations={translations}
            />
          </div>
          <div className="form-group">
            <TranslationField
              label="Maximum label"
              collectionId={collectionId ?? ''}
              entitySymbol={entitySymbol}
              accessToken={accessToken}
              value={paramToRef(parameters.max_label, entitySymbol)}
              onChange={(ref) => updateParam('max_label', ref?.translation_symbol ?? undefined)}
              translations={translations}
            />
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
              collectionId={collectionId}
              entitySymbol={entitySymbol}
              accessToken={accessToken}
              translations={translations}
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
              collectionId={collectionId}
              entitySymbol={entitySymbol}
              accessToken={accessToken}
              translations={translations}
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
              collectionId={collectionId}
              entitySymbol={entitySymbol}
              accessToken={accessToken}
              translations={translations}
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
