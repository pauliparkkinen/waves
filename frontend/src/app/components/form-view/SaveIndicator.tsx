'use client';

import React, { useEffect, useState } from 'react';
import { useFormView } from './FormViewProvider';
import { getFormViewStrings } from '@/lib/translations/form-view';

export function SaveIndicator() {
  const { saveStatus, setSaveStatus, locale } = useFormView();
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
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={() => setSaveStatus('idle')}
          >
            Retry
          </button>
        </>
      )}
    </div>
  );
}
