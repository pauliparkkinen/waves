'use client';

import React from 'react';

interface FormViewLayoutProps {
  children: React.ReactNode;
  header: React.ReactNode;
}

/**
 * Minimal layout wrapper. The header is placed outside the scrollable area
 * (scrolls away). Everything inside children renders inside the scrollable
 * main element — progress bar, nav, and section content all scroll together,
 * and sticky elements within them work relative to the outermost scroll
 * container (the modal or page).
 */
export default function FormViewLayout({ children, header }: FormViewLayoutProps) {
  return (
    <div className="form-view">
      <header className="form-view__header" role="banner">
        {header}
      </header>
      <main className="form-view__content" role="main">
        {children}
      </main>
    </div>
  );
}
