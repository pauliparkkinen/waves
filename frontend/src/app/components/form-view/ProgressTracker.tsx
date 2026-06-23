'use client';

import React, { useMemo } from 'react';
import { useFormView } from './FormViewProvider';
import { getFormViewStrings } from '@/lib/translations/form-view';

export default function ProgressTracker() {
  const { formOrder, currentFormIndex, currentSectionSymbol, completedSections, questionResponses, locale } =
    useFormView();
  const strings = getFormViewStrings(locale);

  const currentForm = formOrder[currentFormIndex];
  if (!currentForm || currentForm.sections.length === 0) {
    return null;
  }

  const sections = currentForm.sections;
  const currentSectionIndex = sections.findIndex(
    (s) => s.sectionSymbol === currentSectionSymbol,
  );
  const displaySectionIndex = currentSectionIndex >= 0 ? currentSectionIndex + 1 : sections.length;

  const questionCounts = useMemo(() => {
    let total = 0;
    let answered = 0;
    for (const section of sections) {
      for (const q of section.questions) {
        total++;
        const r = questionResponses.get(q.question_symbol);
        if (
          r &&
          (r.response_value_text !== undefined ||
            r.response_value_number !== undefined ||
            r.response_value_boolean !== undefined)
        ) {
          answered++;
        }
      }
    }
    return { total, answered };
  }, [sections, questionResponses]);

  const percentComplete =
    questionCounts.total > 0
      ? Math.round((questionCounts.answered / questionCounts.total) * 100)
      : 0;

  return (
    <div className="form-view__progress">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {strings.progress.section} {displaySectionIndex} {strings.progress.of} {sections.length}
        </span>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {strings.progress.question} {questionCounts.answered} {strings.progress.of} {questionCounts.total}
        </span>
      </div>

      <div
        className="progress-bar"
        role="progressbar"
        aria-valuenow={percentComplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={strings.progress.progressLabel.replace('{percent}', String(percentComplete))}
      >
        <div
          className="progress-bar__fill"
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
        {strings.progress.percent.replace('{percent}', String(percentComplete))}
      </div>
    </div>
  );
}
