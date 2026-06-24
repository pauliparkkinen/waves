'use client';

import React, { useCallback, useRef, useState } from 'react';
import { FormViewProvider, useFormView } from './FormViewProvider';
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
import type { SandboxTestResult } from '@/lib/api/admin';
import { testForm, testSection, testQuestion } from '@/lib/api/admin';
import TestResultsPanel from './TestResultsPanel';

type ViewMode = 'fill' | 'review' | 'preview';

export type TestConfig = {
  formId: string;
  entityType: 'form' | 'section' | 'question';
};

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
  testConfig?: TestConfig;
}

export default function FormViewPageClient({
  initialData,
  accessToken,
  testConfig,
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

  const interactive = !!testConfig;
  const isReadOnly = !interactive && (initialData.mode === 'review' || initialData.mode === 'preview');

  // If HCP and no patient selected, show patient selector (but not in test mode)
  if (initialData.isHcp && !currentPatientId && !interactive) {
    return (
      <PatientSelector
        onSelectPatient={handleSelectPatient}
        locale={initialData.locale}
      />
    );
  }

  return (
    <FormViewProvider
      initialData={initialData}
      accessToken={accessToken}
      submitActionRef={submitActionRef}
      disablePersistence={interactive}
    >
      <FormViewLayout
        header={<FormHeader />}
        progress={<ProgressTracker />}
        navigation={<FormNavigation />}
      >
        <SectionRenderer disabled={isReadOnly} />
        {testConfig ? (
          <TestFormContent testConfig={testConfig} accessToken={accessToken} locale={initialData.locale} />
        ) : initialData.mode === 'fill' ? (
          <FormCompletion onSubmit={handleOpenDialog} />
        ) : null}
      </FormViewLayout>
      {!testConfig && (
        <SubmissionDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onSubmit={handleConfirmSubmit}
          isSubmitting={isSubmitting}
          error={submitError}
          locale={initialData.locale}
        />
      )}
    </FormViewProvider>
  );
}

function TestFormContent({
  testConfig,
  accessToken,
  locale,
}: {
  testConfig: TestConfig;
  accessToken?: string;
  locale: string;
}) {
  const { questionResponses } = useFormView();
  const [testResult, setTestResult] = useState<SandboxTestResult | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const handleRunTest = useCallback(async () => {
    const answers: Record<string, string | number | boolean> = {};
    for (const [symbol, response] of questionResponses) {
      if (response.response_value_text !== undefined) {
        answers[symbol] = response.response_value_text;
      } else if (response.response_value_number !== undefined) {
        answers[symbol] = response.response_value_number;
      } else if (response.response_value_boolean !== undefined) {
        answers[symbol] = response.response_value_boolean;
      }
    }

    setIsTestRunning(true);
    setTestError(null);
    setTestResult(null);

    try {
      const input = { answers };
      let result: SandboxTestResult;

      if (testConfig.entityType === 'section') {
        result = await testSection(testConfig.formId, input, accessToken);
      } else if (testConfig.entityType === 'question') {
        result = await testQuestion(testConfig.formId, input, accessToken);
      } else {
        result = await testForm(testConfig.formId, input, accessToken);
      }

      setTestResult(result);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Test execution failed');
    } finally {
      setIsTestRunning(false);
    }
  }, [questionResponses, testConfig, accessToken]);

  return (
    <div className="test-mode-controls">
      <div className="section__controls">
        <button
          type="button"
          className="btn-primary"
          onClick={handleRunTest}
          disabled={isTestRunning}
        >
          {isTestRunning ? 'Running Test...' : 'Run Test'}
        </button>
      </div>

      {testError && (
        <div className="error-message" role="alert">
          {testError}
        </div>
      )}

      {testResult && <TestResultsPanel result={testResult} locale={locale} />}
    </div>
  );
}
