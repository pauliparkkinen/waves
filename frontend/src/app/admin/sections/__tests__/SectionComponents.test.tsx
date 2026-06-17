import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import QuestionAttachmentEditor from '../QuestionAttachmentEditor';
import SectionForm from '../SectionForm';
import SectionList from '../SectionList';

import type {
  AdminSection,
  AdminCollection,
  AdminQuestion,
  SectionQuestion,
  QuestionType,
} from '@/lib/api';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const mockCollections: AdminCollection[] = [
  {
    collection_id: 'col-1',
    collection_symbol: 'financial',
    collection_permissions: [],
  },
  {
    collection_id: 'col-2',
    collection_symbol: 'clinical',
    collection_permissions: [],
  },
];

const mockQuestions: AdminQuestion[] = [
  {
    collection_id: 'col-1',
    question_id: 'q-1',
    question_symbol: 'annual_revenue',
    condition_formula_id: undefined,
    type: 'free-text',
    version: 1,
    parameters: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    translations: [],
  },
  {
    collection_id: 'col-1',
    question_id: 'q-2',
    question_symbol: 'quarterly_revenue',
    condition_formula_id: undefined,
    type: 'range',
    version: 1,
    parameters: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    translations: [],
  },
  {
    collection_id: 'col-2',
    question_id: 'q-3',
    question_symbol: 'diagnosis',
    condition_formula_id: undefined,
    type: 'select',
    version: 2,
    parameters: {},
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    translations: [],
  },
];

const mockSection: AdminSection = {
  section_id: 'sec-1',
  section_symbol: 'test_section',
  collection_id: 'col-1',
  condition_formula_id: undefined,
  version: 1,
  status: 'draft',
  section_questions: [
    {
      question_symbol: 'annual_revenue',
      version_number: 1,
      order_number: 0,
      required: true,
    },
    {
      question_symbol: 'diagnosis',
      version_number: 1,
      order_number: 1,
      required: false,
    },
  ],
  translations: [],
};

// ── QuestionAttachmentEditor tests ───────────────────────────────────────────

describe('QuestionAttachmentEditor', () => {
  describe('given no questions attached', () => {
    it('when rendered, then shows empty state', () => {
      render(
        <QuestionAttachmentEditor
          questions={mockQuestions}
          collections={mockCollections}
          sectionQuestions={[]}
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByText('No questions attached yet.')).toBeInTheDocument();
    });
  });

  describe('given questions attached', () => {
    it('when rendered, then shows rows with symbol and required', () => {
      const sqs: SectionQuestion[] = [
        { question_symbol: 'annual_revenue', version_number: 1, order_number: 0, required: true },
        { question_symbol: 'diagnosis', version_number: 1, order_number: 1, required: false },
      ];
      render(
        <QuestionAttachmentEditor
          questions={mockQuestions}
          collections={mockCollections}
          sectionQuestions={sqs}
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByText('annual_revenue')).toBeInTheDocument();
      expect(screen.getByText('diagnosis')).toBeInTheDocument();
      // Check header has count
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('given questions attached', () => {
    it('when Remove is clicked, then calls onChange without that question', () => {
      const sqs: SectionQuestion[] = [
        { question_symbol: 'annual_revenue', version_number: 1, order_number: 0, required: true },
        { question_symbol: 'diagnosis', version_number: 1, order_number: 1, required: false },
      ];
      const onChange = vi.fn();
      render(
        <QuestionAttachmentEditor
          questions={mockQuestions}
          collections={mockCollections}
          sectionQuestions={sqs}
          onChange={onChange}
        />,
      );
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeButtons[0]);
      expect(onChange).toHaveBeenCalledWith([
        { question_symbol: 'diagnosis', version_number: 1, order_number: 1, required: false },
      ]);
    });
  });

  describe('given questions attached', () => {
    it('when Required checkbox is toggled, then calls onChange with updated required flag', () => {
      const sqs: SectionQuestion[] = [
        { question_symbol: 'annual_revenue', version_number: 1, order_number: 0, required: true },
      ];
      const onChange = vi.fn();
      render(
        <QuestionAttachmentEditor
          questions={mockQuestions}
          collections={mockCollections}
          sectionQuestions={sqs}
          onChange={onChange}
        />,
      );
      const checkbox = screen.getByLabelText(/Required/i);
      fireEvent.click(checkbox);
      expect(onChange).toHaveBeenCalledWith([
        { question_symbol: 'annual_revenue', version_number: 1, order_number: 0, required: false },
      ]);
    });
  });

  describe('given questions attached with adjacent items', () => {
    it('when Up button is clicked, then swaps order of adjacent items', () => {
      const sqs: SectionQuestion[] = [
        { question_symbol: 'annual_revenue', version_number: 1, order_number: 0, required: false },
        { question_symbol: 'diagnosis', version_number: 1, order_number: 1, required: false },
      ];
      const onChange = vi.fn();
      render(
        <QuestionAttachmentEditor
          questions={mockQuestions}
          collections={mockCollections}
          sectionQuestions={sqs}
          onChange={onChange}
        />,
      );
      const upButtons = screen.getAllByRole('button', { name: /Move.*up/i });
      // Click up on the second item (diagnosis)
      fireEvent.click(upButtons[1]);
      expect(onChange).toHaveBeenCalledWith([
        { question_symbol: 'annual_revenue', version_number: 1, order_number: 1, required: false },
        { question_symbol: 'diagnosis', version_number: 1, order_number: 0, required: false },
      ]);
    });

    it('when Down button is clicked, then swaps order of adjacent items', () => {
      const sqs: SectionQuestion[] = [
        { question_symbol: 'annual_revenue', version_number: 1, order_number: 0, required: false },
        { question_symbol: 'diagnosis', version_number: 1, order_number: 1, required: false },
      ];
      const onChange = vi.fn();
      render(
        <QuestionAttachmentEditor
          questions={mockQuestions}
          collections={mockCollections}
          sectionQuestions={sqs}
          onChange={onChange}
        />,
      );
      const downButtons = screen.getAllByRole('button', { name: /Move.*down/i });
      // Click down on the first item (annual_revenue)
      fireEvent.click(downButtons[0]);
      expect(onChange).toHaveBeenCalledWith([
        { question_symbol: 'annual_revenue', version_number: 1, order_number: 1, required: false },
        { question_symbol: 'diagnosis', version_number: 1, order_number: 0, required: false },
      ]);
    });
  });

  describe('given filtered questions', () => {
    it('when add dropdown is opened, then excludes already-attached questions', () => {
      const sqs: SectionQuestion[] = [
        { question_symbol: 'annual_revenue', version_number: 1, order_number: 0, required: false },
      ];
      render(
        <QuestionAttachmentEditor
          questions={mockQuestions}
          collections={mockCollections}
          sectionQuestions={sqs}
          onChange={vi.fn()}
        />,
      );
      const select = screen.getByLabelText('Add question');
      const options = Array.from(select.querySelectorAll('option')).map(
        (o) => o.textContent,
      );
      // 'annual_revenue' should be excluded, but 'quarterly_revenue' and 'diagnosis' should be present
      expect(options).not.toContain('annual_revenue (v1)');
      expect(options).toContain('quarterly_revenue (v1)');
      expect(options).toContain('diagnosis (v2)');
    });
  });

  describe('given available questions', () => {
    it('when Add is clicked after selecting a question, then calls onChange with new question appended', () => {
      const sqs: SectionQuestion[] = [];
      const onChange = vi.fn();
      render(
        <QuestionAttachmentEditor
          questions={mockQuestions}
          collections={mockCollections}
          sectionQuestions={sqs}
          onChange={onChange}
        />,
      );
      const select = screen.getByLabelText('Add question');
      fireEvent.change(select, { target: { value: 'annual_revenue' } });
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(onChange).toHaveBeenCalledWith([
        {
          question_symbol: 'annual_revenue',
          version_number: 1,
          order_number: 0,
          required: false,
        },
      ]);
    });
  });
});

// ── SectionForm tests ────────────────────────────────────────────────────────

describe('SectionForm', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('given create mode', () => {
    it('when rendered, then shows "Create Section" heading', () => {
      render(
        <SectionForm
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('Create Section')).toBeInTheDocument();
    });
  });

  describe('given edit mode with a section', () => {
    it('when rendered, then shows "Edit Section" heading', () => {
      render(
        <SectionForm
          section={mockSection}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('Edit Section')).toBeInTheDocument();
    });
  });

  describe('given empty section_symbol', () => {
    it('when submitted, then shows validation error', async () => {
      render(
        <SectionForm
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(
        await screen.findByText('Section symbol is required'),
      ).toBeInTheDocument();
    });
  });

  describe('given valid input on create', () => {
    it('when submitted, then calls POST /api/admin/sections with status draft', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSection),
        text: () => Promise.resolve(''),
      });

      render(
        <SectionForm
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Section Symbol'), {
        target: { value: 'new_section' },
      });
      // Select a collection
      fireEvent.change(screen.getByDisplayValue('-- Unassigned --'), {
        target: { value: 'col-1' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/sections',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: expect.stringContaining('"status":"draft"'),
          }),
        );
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/sections',
          expect.objectContaining({
            body: expect.stringContaining('collection_id'),
          }),
        );
      });
    });
  });

  describe('given valid input on edit', () => {
    it('when submitted, then calls PUT on the correct section ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSection),
        text: () => Promise.resolve(''),
      });

      render(
        <SectionForm
          section={mockSection}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Section Symbol'), {
        target: { value: 'updated_section' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Update' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/sections/sec-1',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('updated_section'),
          }),
        );
      });
    });
  });

  describe('given a short symbol', () => {
    it('when submitted, then shows symbol length validation error', async () => {
      render(
        <SectionForm
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.change(screen.getByLabelText('Section Symbol'), {
        target: { value: 'a' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(
        await screen.findByText('Section symbol must be at least 2 characters'),
      ).toBeInTheDocument();
    });
  });

  describe('given an invalid symbol pattern', () => {
    it('when submitted, then shows symbol pattern validation error', async () => {
      render(
        <SectionForm
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.change(screen.getByLabelText('Section Symbol'), {
        target: { value: 'hello world' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(
        await screen.findByText(
          'Section symbol may only contain letters, numbers, and underscores',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('given missing collection', () => {
    it('when submitted, then shows collection validation error', async () => {
      render(
        <SectionForm
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.change(screen.getByLabelText('Section Symbol'), {
        target: { value: 'valid_symbol' },
      });
      // Don't select a collection - leave it unset
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(
        await screen.findByText('Collection is required'),
      ).toBeInTheDocument();
    });
  });

  describe('given valid form with API error (400)', () => {
    it('when submitted, then shows error banner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Validation failed'),
      });

      render(
        <SectionForm
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Section Symbol'), {
        target: { value: 'valid_symbol' },
      });
      fireEvent.change(screen.getByDisplayValue('-- Unassigned --'), {
        target: { value: 'col-1' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      expect(await screen.findByText('Validation failed')).toBeInTheDocument();
    });
  });

  describe('given valid form with network error', () => {
    it('when submitted, then shows generic error message', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      render(
        <SectionForm
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Section Symbol'), {
        target: { value: 'valid_symbol' },
      });
      fireEvent.change(screen.getByDisplayValue('-- Unassigned --'), {
        target: { value: 'col-1' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('given readOnly mode', () => {
    it('when rendered, then shows View Section heading and Close button', () => {
      render(
        <SectionForm
          section={mockSection}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
          readOnly={true}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('View Section: test_section')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Update|Cancel/ })).not.toBeInTheDocument();
    });
  });
});

// ── SectionList tests ────────────────────────────────────────────────────────

const mockSections: AdminSection[] = [
  {
    section_id: 'sec-1',
    section_symbol: 'financial_section',
    collection_id: 'col-1',
    condition_formula_id: undefined,
    version: 2,
    status: 'draft',
    section_questions: [
      { question_symbol: 'annual_revenue', version_number: 1, order_number: 0, required: true },
    ],
    translations: [],
  },
  {
    section_id: 'sec-2',
    section_symbol: 'financial_section',
    collection_id: 'col-1',
    condition_formula_id: undefined,
    version: 1,
    status: 'published',
    section_questions: [
      { question_symbol: 'annual_revenue', version_number: 1, order_number: 0, required: true },
    ],
    translations: [],
  },
  {
    section_id: 'sec-3',
    section_symbol: 'clinical_section',
    collection_id: 'col-2',
    condition_formula_id: undefined,
    version: 1,
    status: 'published',
    section_questions: [
      { question_symbol: 'diagnosis', version_number: 1, order_number: 0, required: false },
    ],
    translations: [],
  },
];

describe('SectionList', () => {
  describe('given sections', () => {
    it('when rendered, then shows table with grouped rows', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      expect(screen.getByText('Sections')).toBeInTheDocument();
      // Collection header rows (also appears in filter dropdown options)
      expect(screen.getAllByText('financial').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('clinical').length).toBeGreaterThanOrEqual(1);
      // Section rows
      expect(screen.getByText('financial_section')).toBeInTheDocument();
      expect(screen.getByText('clinical_section')).toBeInTheDocument();
    });
  });

  describe('given no sections', () => {
    it('when rendered, then shows empty state', () => {
      render(
        <SectionList
          initialSections={[]}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      expect(
        screen.getByText(/No sections yet/),
      ).toBeInTheDocument();
    });
  });

  describe('given initial render', () => {
    it('when rendered, then does not show loading message', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('given sections', () => {
    it('when Create Section clicked, then shows inline form', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /Create Section/i }));
      expect(screen.getByText('Create Section')).toBeInTheDocument();
      // The form heading
      expect(screen.getAllByText('Create Section').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('given sections', () => {
    it('when Edit clicked on draft latest, then shows inline form in table row', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      const editButton = screen.getByRole('button', {
        name: /Edit financial_section v2/i,
      });
      fireEvent.click(editButton);
      expect(screen.getByText('Edit Section')).toBeInTheDocument();
    });
  });

  describe('given sections', () => {
    it('when Delete clicked on draft, then shows confirmation modal', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      const deleteButton = screen.getByRole('button', {
        name: /Delete financial_section v2/i,
      });
      fireEvent.click(deleteButton);
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
    });
  });

  describe('given delete modal open', () => {
    it('when Confirm delete is clicked, then calls DELETE API', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );

      const deleteButton = screen.getByRole('button', {
        name: /Delete financial_section v2/i,
      });
      fireEvent.click(deleteButton);

      const confirmButton = screen
        .getByRole('dialog')
        .querySelector('.btn-danger');
      expect(confirmButton).not.toBeNull();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/sections/sec-1',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });
  });

  describe('given delete modal open', () => {
    it('when Cancel is clicked, then hides modal', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );

      const deleteButton = screen.getByRole('button', {
        name: /Delete financial_section v2/i,
      });
      fireEvent.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      expect(
        screen.queryByText('Confirm Delete'),
      ).not.toBeInTheDocument();
    });
  });

  describe('given a draft section', () => {
    it('when Publish button clicked, then shows publish confirmation modal', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      const publishButton = screen.getByRole('button', {
        name: /Publish financial_section v2/i,
      });
      fireEvent.click(publishButton);
      expect(screen.getByText('Confirm Publish')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to publish this section? It will be visible to users.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('given publish modal open', () => {
    it('when Confirm is clicked, then calls PUT with status published', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );

      const publishButton = screen.getByRole('button', {
        name: /Publish financial_section v2/i,
      });
      fireEvent.click(publishButton);

      const confirmButton = screen.getByRole('button', { name: 'Publish' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/sections/sec-1',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"published"'),
          }),
        );
      });
    });
  });

  describe('given publish modal open', () => {
    it('when Cancel is clicked, then hides modal', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );

      const publishButton = screen.getByRole('button', {
        name: /Publish financial_section v2/i,
      });
      fireEvent.click(publishButton);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      expect(
        screen.queryByText('Confirm Publish'),
      ).not.toBeInTheDocument();
    });
  });

  describe('given collection filter', () => {
    it('when rendered, then shows filter selector', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      expect(screen.getByLabelText('Filter by collection')).toBeInTheDocument();
    });

    it('when filter is set to a collection, then shows only matching sections', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      // Filter by col-2 should show only clinical_section
      const filterSelect = screen.getByLabelText('Filter by collection');
      fireEvent.change(filterSelect, { target: { value: 'col-2' } });
      expect(screen.getByText('clinical_section')).toBeInTheDocument();
      expect(screen.queryByText('financial_section')).not.toBeInTheDocument();
    });

    it('when filtered by collection, then shows only matching collection and sections', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      const filterSelect = screen.getByLabelText('Filter by collection');
      fireEvent.change(filterSelect, { target: { value: 'col-1' } });
      expect(screen.getAllByText('financial').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('financial_section')).toBeInTheDocument();
      // clinical sections should not appear in the table
      const table = screen.getByRole('table');
      expect(within(table).queryByText('clinical_section')).not.toBeInTheDocument();
    });

    it('when filter matches no sections, then shows empty state', () => {
      render(
        <SectionList
          initialSections={[
            {
              section_id: 'sec-1',
              section_symbol: 'financial_section',
              collection_id: 'col-1',
              condition_formula_id: undefined,
              version: 1,
              status: 'draft',
              section_questions: [
                { question_symbol: 'annual_revenue', version_number: 1, order_number: 0, required: true },
              ],
              translations: [],
            },
          ]}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      // Filter by col-2; financial_section has only col-1 questions, so no match
      const filterSelect = screen.getByLabelText('Filter by collection');
      fireEvent.change(filterSelect, { target: { value: 'col-2' } });
      expect(
        screen.getByText(/No sections yet/),
      ).toBeInTheDocument();
    });
  });

  describe('given a published section', () => {
    it('when View is clicked, then shows read-only form', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      const viewButton = screen.getByRole('button', { name: /View clinical_section v1/i });
      fireEvent.click(viewButton);
      expect(screen.getByText(/clinical_section/)).toBeInTheDocument();
    });
  });

  describe('given a published section', () => {
    it('when New Version is clicked on latest published, then shows confirmation modal', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      const newVersionButton = screen.getByRole('button', { name: /New version of clinical_section/i });
      fireEvent.click(newVersionButton);
      expect(screen.getByRole('heading', { name: 'Create New Version' })).toBeInTheDocument();
    });
  });

  describe('given sections with multiple versions', () => {
    it('when version button is clicked, then shows sub-rows for older versions', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      const toggleButton = screen.getByRole('button', { name: /Toggle versions for financial_section/i });
      fireEvent.click(toggleButton);
      expect(screen.getByText('v1')).toBeInTheDocument();
      expect(screen.getAllByText('published').length).toBeGreaterThanOrEqual(2);
    });

    it('when version is clicked again, then hides sub-rows', () => {
      render(
        <SectionList
          initialSections={mockSections}
          collections={mockCollections}
          questions={mockQuestions}
          accessToken="test-token"
        />,
      );
      const toggleButton = screen.getByRole('button', { name: /Toggle versions for financial_section/i });
      fireEvent.click(toggleButton);
      expect(screen.getByText('v1')).toBeInTheDocument();
      fireEvent.click(toggleButton);
      expect(screen.queryByText('v1')).not.toBeInTheDocument();
    });
  });
});

// ── QuestionAttachmentEditor + New Question modal tests ─────────────────────

describe('QuestionAttachmentEditor with create button', () => {
  describe('given available questions', () => {
    it('when + New Question button is clicked, then shows QuestionForm in a modal', () => {
      render(
        <QuestionAttachmentEditor
          questions={mockQuestions}
          collections={mockCollections}
          sectionQuestions={[]}
          onChange={vi.fn()}
          accessToken="test-token"
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: '+ New Question' }));
      expect(screen.getByText('Create Question')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('when Cancel is clicked in modal, then hides modal', () => {
      render(
        <QuestionAttachmentEditor
          questions={mockQuestions}
          collections={mockCollections}
          sectionQuestions={[]}
          onChange={vi.fn()}
          accessToken="test-token"
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: '+ New Question' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Create Question')).not.toBeInTheDocument();
    });

    it('when question is saved, then refetches questions and calls onQuestionCreated', async () => {
      const updatedQuestions: AdminQuestion[] = [
        ...mockQuestions,
        {
          collection_id: 'col-1',
          question_id: 'q-new',
          question_symbol: 'new_question',
          type: 'free-text',
          version: 1,
          parameters: {},
          condition_formula_id: undefined,
          created_at: '2026-06-01T00:00:00Z',
          updated_at: '2026-06-01T00:00:00Z',
          translations: [],
        },
      ];

      // First call: QuestionForm's POST on save
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updatedQuestions[3]), text: () => Promise.resolve('') });
      // Second call: refetchQuestions after save
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updatedQuestions), text: () => Promise.resolve('') });

      const onQuestionCreated = vi.fn();
      render(
        <QuestionAttachmentEditor
          questions={mockQuestions}
          collections={mockCollections}
          sectionQuestions={[]}
          onChange={vi.fn()}
          accessToken="test-token"
          onQuestionCreated={onQuestionCreated}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: '+ New Question' }));
      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText('Question Symbol'), {
        target: { value: 'new_question' },
      });
      const collectionSelect = within(dialog).getAllByRole('combobox')[0];
      fireEvent.change(collectionSelect, { target: { value: 'col-1' } });
      const typeRadio = within(dialog).getByLabelText('Free-text');
      fireEvent.click(typeRadio);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

      await waitFor(() => {
        expect(onQuestionCreated).toHaveBeenCalledWith(updatedQuestions);
      });
    });
  });
});
