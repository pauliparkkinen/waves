'use client';

import React from 'react';
import { formViewStrings } from '@/lib/translations/form-view';

export function IncompleteIndicator() {
  return (
    <span className="incomplete-indicator">
      <span aria-hidden="true" className="incomplete-indicator__icon">&#9888;</span>
      <span className="sr-only">{formViewStrings.section.incomplete}</span>
    </span>
  );
}
