'use client';

import React, { useCallback, useRef, useState } from 'react';
import { FormViewProvider, useFormView } from './FormViewProvider';
import FormViewLayout from './FormViewLayout';
import FormHeader from './FormHeader';
import ProgressTracker from './ProgressTracker';
import FormNavigation from './FormNavigation';
import { SectionRenderer } from './SectionRenderer';
import { SectionSummary } from './SectionSummary';
import { QuestionRenderer } from './QuestionRenderer';
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
        navigation={<FormNavigation hideButtons={interactive} />}
      >
        {testConfig ? (
          <TestModeSections
            testConfig={testConfig}
            accessToken={accessToken}
            locale={initialData.locale}
            disabled={isReadOnly}
          />
        ) : (
          <>
            <SectionRenderer disabled={isReadOnly} />
            {initialData.mode === 'fill' && <FormCompletion onSubmit={handleOpenDialog} />}
          </>
        )}
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

/**
 * Test-mode view: renders nav buttons above the sections, shows ALL sections
 * simultaneously (active section with interactive questions, others as
 * summaries), and provides the Run Test button with results.
 */
function TestModeSections({
  testConfig,
  accessToken,
  locale,
  disabled,
}: {
  testConfig: TestConfig;
  accessToken?: string;
  locale: string;
  disabled: boolean;
}) {
  const {
    formOrder,
    currentSectionSymbol,
    completedSections,
    questionResponses,
    onAnswer,
    openSection,
    saveStatus,
  } = useFormView();
  const [testResult, setTestResult] = useState<SandboxTestResult | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const strings = getFormViewStrings(locale);
  const isSaving = saveStatus === 'saving';

  const allSections = formOrder.flatMap((f) => f.sections);
  const currentIndex = allSections.findIndex((s) => s.sectionSymbol === currentSectionSymbol);
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= allSections.length - 1;

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      openSection(allSections[currentIndex - 1].sectionSymbol);
    }
  }, [currentIndex, allSections, openSection]);

  const handleNext = useCallback(() => {
    if (currentIndex < allSections.length - 1) {
      openSection(allSections[currentIndex + 1].sectionSymbol);
    }
  }, [currentIndex, allSections, openSection]);

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

  if (allSections.length === 0) {
    return <p className="empty-state">No sections to display.</p>;
  }

  return (
    <div className="test-mode-content">
      {/* ── Nav buttons above sections ── */}
      <div className="test-mode-nav-buttons">
        <button
          onClick={handlePrevious}
          disabled={isFirst || isSaving}
          aria-label={strings.navigation.previousSectionLabel}
          className="btn-secondary"
        >
          {strings.navigation.previous}
        </button>
        <button
          onClick={handleNext}
          disabled={isLast || isSaving}
          aria-label={strings.navigation.nextSectionLabel}
          className="btn-primary"
        >
          {strings.navigation.next}
        </button>
      </div>

      {/* ── All sections: active with questions, others as summaries ── */}
      {allSections.map((section) => {
        const isActive = section.sectionSymbol === currentSectionSymbol;
        const isCompleted = completedSections.has(section.sectionSymbol);

        if (isActive && !isCompleted) {
          // Active section — show questions interactively
          return (
            <div key={section.sectionSymbol} className="section">
              <div className="section__header">
                <h2 className="section__title">{section.sectionTitle}</h2>
              </div>
              <div className="section__questions">
                {section.questions.map((question) => (
                  <QuestionRenderer
                    key={question.question_symbol}
                    question={question}
                    currentValue={questionResponses.get(question.question_symbol)}
                    onAnswer={(_symbol, qValue) => {
                      const simpleValue: string | number | boolean | string[] =
                        qValue.response_value_number !== undefined ? qValue.response_value_number :
                        qValue.response_value_boolean !== undefined ? qValue.response_value_boolean :
                        qValue.response_value_text !== undefined ? qValue.response_value_text :
                        '';
                      onAnswer(question.question_symbol, simpleValue);
                    }}
                    locale={locale}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          );
        }

        // Non-active or completed section — show summary
        return (
          <SectionSummary
            key={section.sectionSymbol}
            section={section}
            isIncomplete={section.isIncomplete}
            onContinue={() => openSection(section.sectionSymbol)}
            readOnly
          />
        );
      })}

      {/* ── Run Test button below all sections ── */}
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
    </div>
  );
}
