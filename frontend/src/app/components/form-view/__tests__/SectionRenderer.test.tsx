import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionRenderer } from '../SectionRenderer';
import { FormViewProvider } from '../FormViewProvider';
import type {
  FormResponseGroup,
  FormDefinition,
  FormResponse,
  QuestionResponse,
  SectionDefinition,
  QuestionDefinition,
} from '@/lib/api/form-response';

function createMockData(): {
  formResponseGroup: FormResponseGroup;
  formDefinitions: FormDefinition[];
  formResponses: FormResponse[];
  questionResponses: Map<string, QuestionResponse>;
  sectionDefinitions: SectionDefinition[];
  questionDefinitions: QuestionDefinition[];
} {
  return {
    formResponseGroup: {
      form_response_group_id: 'group-1',
      form_responses: [],
    },
    formDefinitions: [
      {
        collection_id: 'col-1',
        form_symbol: 'form_a',
        version: 1,
        form_sections: [
          { section_symbol: 'section_1', version_number: 1, order_number: 0 },
          { section_symbol: 'section_2', version_number: 1, order_number: 1 },
        ],
        status: 'published',
        translations: { en: 'Test Form' },
      },
    ],
    formResponses: [],
    questionResponses: new Map(),
    sectionDefinitions: [
      {
        section_symbol: 'section_1',
        version: 1,
        section_questions: [
          { question_symbol: 'q1', version_number: 1, order_number: 0, required: false },
        ],
        status: 'published',
        translations: { en: 'Personal Info' },
      },
      {
        section_symbol: 'section_2',
        version: 1,
        section_questions: [
          { question_symbol: 'q2', version_number: 1, order_number: 0, required: false },
        ],
        status: 'published',
        translations: { en: 'Details' },
      },
    ],
    questionDefinitions: [
      {
        question_symbol: 'q1',
        version: 1,
        type: 'free-text',
        parameters: {},
        translations: { en: 'What is your name?' },
      },
      {
        question_symbol: 'q2',
        version: 1,
        type: 'free-text',
        parameters: {},
        translations: { en: 'Any details?' },
      },
    ],
  };
}

function renderWithProvider(component: React.ReactNode) {
  const data = createMockData();
  return render(
    <FormViewProvider
      initialData={{
        ...data,
        mode: 'fill',
        locale: 'en',
      }}
    >
      {component}
    </FormViewProvider>,
  );
}

describe('SectionRenderer', () => {
  describe('given a current section', () => {
    it('when rendered, then shows section title', () => {
      renderWithProvider(<SectionRenderer />);
      expect(screen.getByText('Personal Info')).toBeInTheDocument();
    });

    it('when rendered, then shows the question text for the section', () => {
      renderWithProvider(<SectionRenderer />);
      // Question text appears in both legend and label elements
      const questionElements = screen.getAllByText('What is your name?');
      expect(questionElements.length).toBeGreaterThanOrEqual(1);
    });

    it('when rendered, then shows complete section button', () => {
      renderWithProvider(<SectionRenderer />);
      expect(screen.getByText('Complete Section')).toBeInTheDocument();
    });
  });

  describe('given section completion', () => {
    it('when Complete Section is clicked, then shows summary view', () => {
      renderWithProvider(<SectionRenderer />);
      const completeButton = screen.getByText('Complete Section');
      fireEvent.click(completeButton);
      // After clicking complete, the completed section shows as summary
      expect(screen.getByText('Personal Info')).toBeInTheDocument();
      // Should show summary with "No answer" text
      const noAnswers = screen.getAllByText('No answer');
      expect(noAnswers.length).toBeGreaterThanOrEqual(1);
      // Completed section shows an Edit button, not Continue
      expect(screen.queryByText('Continue')).not.toBeInTheDocument();
    });
  });

  describe('given section with no questions', () => {
    it('when completed, then shows no questions message in summary', () => {
      render(
        <FormViewProvider
          initialData={{
            formResponseGroup: {
              form_response_group_id: 'group-1',
              form_responses: [],
            },
            formDefinitions: [
              {
                collection_id: 'col-1',
                form_symbol: 'form_a',
                version: 1,
                form_sections: [
                  { section_symbol: 'section_1', version_number: 1, order_number: 0 },
                ],
                status: 'published',
                translations: { en: 'Single Section Form' },
              },
            ],
            formResponses: [],
            questionResponses: new Map(),
            sectionDefinitions: [
              {
                section_symbol: 'section_1',
                version: 1,
                section_questions: [],
                status: 'published',
                translations: { en: 'Personal Info' },
              },
            ],
            questionDefinitions: [],
            mode: 'fill',
            locale: 'en',
          }}
        >
          <SectionRenderer />
        </FormViewProvider>,
      );
      // Complete the section to see summary
      fireEvent.click(screen.getByText('Complete Section'));
      expect(screen.getByText('This section has no questions')).toBeInTheDocument();
    });
  });

  describe('given completing then editing a section', () => {
    it('when Edit is clicked, then shows questions again', () => {
      renderWithProvider(<SectionRenderer />);
      // Complete section
      const completeButton = screen.getByText('Complete Section');
      fireEvent.click(completeButton);
      // Find the Edit button for section 1
      const editButton = screen.getByLabelText('Edit What is your name?');
      expect(editButton).toBeInTheDocument();
      fireEvent.click(editButton);
      // After clicking edit, should see the section content again
      expect(screen.getByText('Complete Section')).toBeInTheDocument();
    });
  });
});
