'use client';

import type { SandboxTestResult } from '@/lib/api/admin';

type Props = {
  result: SandboxTestResult;
  locale: string;
};

export default function TestResultsPanel({ result }: Props) {
  return (
    <div className="test-results-panel" aria-live="polite">
      <h3>Test Results</h3>

      {/* Section visibility */}
      <div className="test-results-section">
        <h4>Section Visibility</h4>
        {result.sections.length === 0 && <p>No sections in test result.</p>}
        {result.sections.map((section) => (
          <div key={section.section_symbol} className="test-result-item">
            <span className={`test-visibility-badge ${section.visible ? 'visible' : 'hidden'}`}>
              {section.visible ? 'Visible' : 'Hidden'}
            </span>
            <strong>{section.section_symbol}</strong>
            {section.questions.length > 0 && (
              <ul className="test-question-list">
                {section.questions.map((q) => (
                  <li key={q.question_symbol}>
                    <span className={`test-visibility-badge ${q.visible ? 'visible' : 'hidden'}`}>
                      {q.visible ? 'Visible' : 'Hidden'}
                    </span>
                    {q.question_symbol}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Formula outputs */}
      {result.formulas.length > 0 && (
        <div className="test-results-section">
          <h4>Formula Outputs</h4>
          <table className="test-formula-table">
            <thead>
              <tr>
                <th>Formula</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {result.formulas.map((f) => (
                <tr key={f.formula_symbol}>
                  <td>{f.formula_symbol}</td>
                  <td>{String(f.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Received answers */}
      <div className="test-results-section">
        <h4>Received Answers</h4>
        <pre className="test-answers-echo">{JSON.stringify(result.received_answers, null, 2)}</pre>
      </div>
    </div>
  );
}
