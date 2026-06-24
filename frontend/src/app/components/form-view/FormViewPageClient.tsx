'use client';

import React, { useCallback, useRef, useState } from 'react';
import { FormViewProvider } from './FormViewProvider';
import FormViewLayout from './FormViewLayout';
import FormHeader from './FormHeader';
import ProgressTracker from './ProgressTracker';
import FormNavigation from './FormNavigation';
import { SectionRenderer } from './SectionRenderer';
import { FormCompletion } from './FormCompletion';
import { SubmissionDialog } from './SubmissionDialog';
import { PatientSelector } from './PatientSelector';
import { getFormViewStrings } from '@/lib/translations/form-view';
import type {
  FormResponseGroup,
  FormDefinition,
  FormResponse,
  QuestionResponse,
  SectionDefinition,
  QuestionDefinition,
} from '@/lib/api/form-response';

type ViewMode = 'fill' | 'review' | 'preview';

interface FormViewPageClientProps {
  initialData: {
    formResponseGroup: FormResponseGroup;
    formDefinitions: FormDefinition[];
    formResponses: FormResponse[];
    questionResponses: Map<string, QuestionResponse>;
    sectionDefinitions: SectionDefinition[];
    questionDefinitions: QuestionDefinition[];
    mode: ViewMode;
    locale: string;
    initialSectionSymbol?: string | null;
    isHcp?: boolean;
    selectedPatientId?: string;
  };
  accessToken?: string;
}

export default function FormViewPageClient({
  initialData,
  accessToken,
}: FormViewPageClientProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentPatientId, setCurrentPatientId] = useState<string | undefined>(
    initialData.selectedPatientId,
  );
  const strings = getFormViewStrings(initialData.locale);

  const submitActionRef = useRef<(() => Promise<void>) | null>(null);

  const groupId = initialData.formResponseGroup.form_response_group_id;

  const handleSelectPatient = useCallback((patientId: string) => {
    setCurrentPatientId(patientId);
  }, []);

  const handleOpenDialog = useCallback(() => {
    setDialogOpen(true);
    setSubmitError(null);
  }, []);

  const handleCloseDialog = useCallback(() => {
    if (!isSubmitting) {
      setDialogOpen(false);
    }
  }, [isSubmitting]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!groupId) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitActionRef.current?.();
      window.location.href = `/forms/${groupId}/review`;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : strings.errorMessages.submitFailed.replace('{status}', 'unknown'));
      setSubmitting(false);
    }
  }, [groupId]);

  // If HCP and no patient selected, show patient selector
  if (initialData.isHcp && !currentPatientId) {
    return (
      <PatientSelector
        onSelectPatient={handleSelectPatient}
        locale={initialData.locale}
      />
    );
  }

  return (
    <FormViewProvider initialData={initialData} accessToken={accessToken} submitActionRef={submitActionRef}>
      <FormViewLayout
        header={<FormHeader />}
        progress={<ProgressTracker />}
        navigation={<FormNavigation />}
      >
        <SectionRenderer disabled={initialData.mode === 'review' || initialData.mode === 'preview'} />
        {initialData.mode === 'fill' && <FormCompletion onSubmit={handleOpenDialog} />}
      </FormViewLayout>
      <SubmissionDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleConfirmSubmit}
        isSubmitting={isSubmitting}
        error={submitError}
        locale={initialData.locale}
      />
    </FormViewProvider>
  );
}
