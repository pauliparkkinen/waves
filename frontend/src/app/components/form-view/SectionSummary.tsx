'use client';

import React, { useEffect, useRef } from 'react';
import type { QuestionDefinition, QuestionResponse } from '@/lib/api/form-response';
import type { SectionWithQuestions } from './FormViewProvider';
import { useFormView } from './FormViewProvider';
import { IncompleteIndicator } from './IncompleteIndicator';
import { getFormViewStrings } from '@/lib/translations/form-view';

type Props = {
  section: SectionWithQuestions;
  isIncomplete: boolean;
  onContinue: () => void;
  autoFocus?: boolean;
  readOnly?: boolean;
};

/** Resolve an option value to its label for select/radio/multiselect questions. */
function optionLabel(
  question: QuestionDefinition,
  value: string,
): string {
  const rawOptions = question.parameters?.options;
  if (!Array.isArray(rawOptions)) return value;
  for (const opt of rawOptions) {
    const optVal = (opt as { value?: string; label?: string }).value ?? (opt as { label?: string }).label;
    if (String(optVal) === value) {
      return (opt as { label?: string }).label ?? value;
    }
  }
  return value;
}

function formatAnswer(
  questionResponses: Map<string, QuestionResponse>,
  sectionQuestions: QuestionDefinition[],
  questionSymbol: string,
  strings: Record<string, Record<string, string>>,
): string {
  const r = questionResponses.get(questionSymbol);
  if (!r) return '';

  if (r.response_value_text !== undefined) {
    const qDef = sectionQuestions.find((q) => q.question_symbol === questionSymbol);
    // Try to parse as JSON array (multiselect) first
    if (qDef && (qDef.type === 'multiselect' || qDef.type === 'select' || qDef.type === 'radio')) {
      try {
        const parsed = JSON.parse(r.response_value_text);
        if (Array.isArray(parsed)) {
          return parsed.map((v: string) => optionLabel(qDef, v)).join(', ');
        }
      } catch {
        // Not JSON — treat as single value
      }
      return optionLabel(qDef, r.response_value_text);
    }
    return r.response_value_text;
  }

  if (r.response_value_number !== undefined) return String(r.response_value_number);
  if (r.response_value_boolean !== undefined) return r.response_value_boolean ? strings.section.booleanYes : strings.section.booleanNo;
  return '';
}

export function SectionSummary({ section, isIncomplete, onContinue, autoFocus = false, readOnly = false }: Props) {
  const { questionResponses, reopenSection, locale } = useFormView();
  const strings = getFormViewStrings(locale);
  const summaryRef = useRef<HTMLDivElement>(null);
  const hasNoQuestions = section.questions.length === 0;

  useEffect(() => {
    if (autoFocus && summaryRef.current) {
      summaryRef.current.focus();
    }
  }, [autoFocus]);

  const sectionTitle = section.sectionTitle;

  return (
    <div
      className={`section ${isIncomplete ? 'section--incomplete' : 'section--completed'}`}
      ref={summaryRef}
      tabIndex={-1}
      aria-live="polite"
    >
      <div className="section__header">
        <h3 className="section__title">
          {isIncomplete ? (
            <>
              <IncompleteIndicator locale={locale} /> {sectionTitle}
            </>
          ) : (
            <>
              <span aria-label={strings.section.completedAriaLabel}>&#10003;</span> {sectionTitle}
            </>
          )}
        </h3>
      </div>

      {hasNoQuestions && (
        <p className="summary">{strings.summary.noQuestions}</p>
      )}

      {!hasNoQuestions && (
        <div className="summary">
          {section.questions.map((question) => {
            const answer = formatAnswer(questionResponses, section.questions, question.question_symbol, strings);
            const questionText = question.translations?.[locale] ?? question.question_symbol;
            return (
              <div key={question.question_symbol} className="summary__item">
                <div>
                  <strong>{questionText}</strong>
                  <span className="summary__answer">
                    {answer || <em>{strings.summary.noAnswer}</em>}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    className="summary__edit btn-small btn-secondary"
                    onClick={() => reopenSection(section.sectionSymbol)}
                    aria-label={`${strings.section.edit} ${questionText}`}
                  >
                    {strings.section.edit}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && isIncomplete && (
        <div className="section__controls">
          <button
            type="button"
            className="btn-primary"
            onClick={onContinue}
          >
            {strings.section.continue}
          </button>
        </div>
      )}
    </div>
  );
}
