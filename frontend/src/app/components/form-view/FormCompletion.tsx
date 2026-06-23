'use client';

import React, { useEffect, useRef } from 'react';
import { useFormView } from './FormViewProvider';
import { IncompleteIndicator } from './IncompleteIndicator';
import { getFormViewStrings } from '@/lib/translations/form-view';

type Props = {
  onSubmit: () => void;
};

export function FormCompletion({ onSubmit }: Props) {
  const { formOrder, openSection, currentSectionSymbol, locale } = useFormView();
  const strings = getFormViewStrings(locale);

  if (currentSectionSymbol !== null) {
    return null;
  }
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, []);

  const allSections = formOrder.flatMap((f) => f.sections);
  const incompleteSections = allSections.filter((s) => s.isIncomplete);
  const allComplete = incompleteSections.length === 0;

  return (
    <div className="form-view__content" aria-live="polite">
      <h1 tabIndex={-1} ref={headingRef}>
        {allComplete
          ? strings.summary.allComplete
          : strings.summary.incompleteWarning}
      </h1>

      {!allComplete && (
        <div className="error-message">
          <p>{strings.summary.incompleteWarning}</p>
          <ul>
            {incompleteSections.map((s) => (
              <li key={s.sectionSymbol}>
                <button
                  type="button"
                  className="summary__edit"
                  onClick={() => openSection(s.sectionSymbol)}
                >
                  <IncompleteIndicator locale={locale} /> {s.sectionTitle}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        {allSections.map((section) => (
          <div
            key={section.sectionSymbol}
            className={`section ${section.isIncomplete ? 'section--incomplete' : 'section--completed'}`}
          >
            <div className="section__header">
              <h3 className="section__title">
                {section.isIncomplete ? (
                  <>
                    <IncompleteIndicator locale={locale} /> {section.sectionTitle}
                  </>
                ) : (
                  <>
                    <span aria-label={strings.section.completedAriaLabel}>&#10003;</span> {section.sectionTitle}
                  </>
                )}
              </h3>
            </div>
            {section.isIncomplete && (
              <div className="section__controls">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => openSection(section.sectionSymbol)}
                >
                  {strings.section.continue}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="section__controls">
        <button
          type="button"
          className="btn-primary"
          onClick={onSubmit}
          disabled={!allComplete}
        >
          {strings.submission.submit}
        </button>
      </div>
    </div>
  );
}
