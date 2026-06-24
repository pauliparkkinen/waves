'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useFormView } from './FormViewProvider';
import { getFormViewStrings } from '@/lib/translations/form-view';

export function SaveIndicator() {
  const { saveStatus, setSaveStatus, locale, retryFailedSave, failedSaves } = useFormView();
  const strings = getFormViewStrings(locale);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (saveStatus === 'idle') {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => {
        setVisible(false);
        setSaveStatus('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus, setSaveStatus]);

  const handleRetry = useCallback(async () => {
    await Promise.allSettled(
      Array.from(failedSaves.keys()).map((symbol) => retryFailedSave(symbol)),
    );
  }, [failedSaves, retryFailedSave]);

  if (!visible) return null;

  return (
    <div
      className={`save-indicator save-indicator--${saveStatus}`}
      aria-live="polite"
      role="status"
    >
      {saveStatus === 'saving' && <span>{strings.saveIndicator.saving}</span>}
      {saveStatus === 'saved' && <span>{strings.saveIndicator.saved}</span>}
      {saveStatus === 'error' && (
        <>
          <span>{strings.saveIndicator.error}</span>
          <span className="question__help" style={{ display: 'block' }}>
            {strings.saveIndicator.retryInstruction}
          </span>
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={handleRetry}
          >
            {strings.saveIndicator.retry}
          </button>
        </>
      )}
    </div>
  );
}
