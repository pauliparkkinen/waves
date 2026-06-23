'use client';

import React, { useEffect, useRef } from 'react';
import type { QuestionResponse } from '@/lib/api/form-response';
import type { SectionWithQuestions } from './FormViewProvider';
import { useFormView } from './FormViewProvider';
import { IncompleteIndicator } from './IncompleteIndicator';
import { getFormViewStrings } from '@/lib/translations/form-view';

type Props = {
  section: SectionWithQuestions;
  isIncomplete: boolean;
  onContinue: () => void;
  autoFocus?: boolean;
};

function formatAnswer(
  questionResponses: Map<string, QuestionResponse>,
  questionSymbol: string,
  strings: Record<string, Record<string, string>>,
): string {
  const r = questionResponses.get(questionSymbol);
  if (!r) return '';
  if (r.response_value_text !== undefined) return r.response_value_text;
  if (r.response_value_number !== undefined) return String(r.response_value_number);
  if (r.response_value_boolean !== undefined) return r.response_value_boolean ? strings.section.booleanYes : strings.section.booleanNo;
  return '';
}

export function SectionSummary({ section, isIncomplete, onContinue, autoFocus = false }: Props) {
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
            const answer = formatAnswer(questionResponses, question.question_symbol, strings);
            const questionText = question.translations?.[locale] ?? question.question_symbol;
            return (
              <div key={question.question_symbol} className="summary__item">
                <div>
                  <strong>{questionText}</strong>
                  <span className="summary__answer">
                    {answer || <em>{strings.summary.noAnswer}</em>}
                  </span>
                </div>
                <button
                  type="button"
                  className="summary__edit btn-small btn-secondary"
                  onClick={() => reopenSection(section.sectionSymbol)}
                  aria-label={`Edit ${questionText}`}
                >
                  {strings.section.edit}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isIncomplete && (
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
