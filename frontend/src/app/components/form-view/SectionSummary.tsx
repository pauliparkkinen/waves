'use client';

import React, { useEffect, useRef } from 'react';
import type { QuestionResponse } from '@/lib/api/form-response';
import type { SectionWithQuestions } from './FormViewProvider';
import { useFormView } from './FormViewProvider';
import { IncompleteIndicator } from './IncompleteIndicator';
import { formViewStrings } from '@/lib/translations/form-view';

type Props = {
  section: SectionWithQuestions;
  isIncomplete: boolean;
  onContinue: () => void;
  autoFocus?: boolean;
};

function formatAnswer(questionResponses: Map<string, QuestionResponse>, questionSymbol: string): string {
  const r = questionResponses.get(questionSymbol);
  if (!r) return '';
  if (r.response_value_text !== undefined) return r.response_value_text;
  if (r.response_value_number !== undefined) return String(r.response_value_number);
  if (r.response_value_boolean !== undefined) return r.response_value_boolean ? 'Yes' : 'No';
  return '';
}

export function SectionSummary({ section, isIncomplete, onContinue, autoFocus = false }: Props) {
  const { questionResponses, reopenSection, locale } = useFormView();
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
              <IncompleteIndicator /> {sectionTitle}
            </>
          ) : (
            <>
              <span aria-label="Completed">&#10003;</span> {sectionTitle}
            </>
          )}
        </h3>
      </div>

      {hasNoQuestions && (
        <p className="summary">{formViewStrings.summary.noQuestions}</p>
      )}

      {!hasNoQuestions && (
        <div className="summary">
          {section.questions.map((question) => {
            const answer = formatAnswer(questionResponses, question.question_symbol);
            const questionText = question.translations?.[locale] ?? question.question_symbol;
            return (
              <div key={question.question_symbol} className="summary__item">
                <div>
                  <strong>{questionText}</strong>
                  <span className="summary__answer">
                    {answer || <em>No answer</em>}
                  </span>
                </div>
                <button
                  type="button"
                  className="summary__edit btn-small btn-secondary"
                  onClick={() => reopenSection(section.sectionSymbol)}
                  aria-label={`Edit ${questionText}`}
                >
                  {formViewStrings.section.edit}
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
            {formViewStrings.section.continue}
          </button>
        </div>
      )}
    </div>
  );
}
