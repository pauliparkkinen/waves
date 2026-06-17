import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import SectionAttachmentEditor from '../SectionAttachmentEditor';
import FormForm from '../FormForm';
import FormList from '../FormList';
import type {
  AdminForm,
  AdminSection,
  AdminCollection,
  FormSection,
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

const mockSections: AdminSection[] = [
  {
    collection_id: 'col-1',
    section_id: 'sec-1',
    section_symbol: 'income_statement',
    condition_formula_id: undefined,
    version: 1,
    status: 'draft',
    section_questions: [],
    translations: [],
  },
  {
    collection_id: 'col-1',
    section_id: 'sec-2',
    section_symbol: 'balance_sheet',
    condition_formula_id: undefined,
    version: 1,
    status: 'draft',
    section_questions: [],
    translations: [],
  },
  {
    collection_id: 'col-2',
    section_id: 'sec-3',
    section_symbol: 'diagnosis_history',
    condition_formula_id: undefined,
    version: 2,
    status: 'published',
    section_questions: [],
    translations: [],
  },
];

// ── SectionAttachmentEditor tests ─────────────────────────────────────────────

describe('SectionAttachmentEditor', () => {
  describe('given no sections attached', () => {
    it('when rendered, then shows empty state', () => {
      render(
        <SectionAttachmentEditor
          sections={mockSections}
          collections={mockCollections}
          formSections={[]}
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByText('No sections attached yet.')).toBeInTheDocument();
    });
  });

  describe('given sections attached', () => {
    it('when rendered, then shows rows with symbol and count', () => {
      const fss: FormSection[] = [
        { section_symbol: 'income_statement', version_number: 1, order_number: 0 },
        { section_symbol: 'diagnosis_history', version_number: 1, order_number: 1 },
      ];
      render(
        <SectionAttachmentEditor
          sections={mockSections}
          collections={mockCollections}
          formSections={fss}
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByText('income_statement')).toBeInTheDocument();
      expect(screen.getByText('diagnosis_history')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('given sections attached', () => {
    it('when Remove is clicked, then calls onChange without that section', () => {
      const fss: FormSection[] = [
        { section_symbol: 'income_statement', version_number: 1, order_number: 0 },
        { section_symbol: 'diagnosis_history', version_number: 1, order_number: 1 },
      ];
      const onChange = vi.fn();
      render(
        <SectionAttachmentEditor
          sections={mockSections}
          collections={mockCollections}
          formSections={fss}
          onChange={onChange}
        />,
      );
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeButtons[0]);
      expect(onChange).toHaveBeenCalledWith([
        { section_symbol: 'diagnosis_history', version_number: 1, order_number: 1 },
      ]);
    });
  });

  describe('given sections attached with adjacent items', () => {
    it('when Up button is clicked, then swaps order of adjacent items', () => {
      const fss: FormSection[] = [
        { section_symbol: 'income_statement', version_number: 1, order_number: 0 },
        { section_symbol: 'diagnosis_history', version_number: 1, order_number: 1 },
      ];
      const onChange = vi.fn();
      render(
        <SectionAttachmentEditor
          sections={mockSections}
          collections={mockCollections}
          formSections={fss}
          onChange={onChange}
        />,
      );
      const upButtons = screen.getAllByRole('button', { name: /Move.*up/i });
      fireEvent.click(upButtons[1]);
      expect(onChange).toHaveBeenCalledWith([
        { section_symbol: 'income_statement', version_number: 1, order_number: 1 },
        { section_symbol: 'diagnosis_history', version_number: 1, order_number: 0 },
      ]);
    });

    it('when Down button is clicked, then swaps order of adjacent items', () => {
      const fss: FormSection[] = [
        { section_symbol: 'income_statement', version_number: 1, order_number: 0 },
        { section_symbol: 'diagnosis_history', version_number: 1, order_number: 1 },
      ];
      const onChange = vi.fn();
      render(
        <SectionAttachmentEditor
          sections={mockSections}
          collections={mockCollections}
          formSections={fss}
          onChange={onChange}
        />,
      );
      const downButtons = screen.getAllByRole('button', { name: /Move.*down/i });
      fireEvent.click(downButtons[0]);
      expect(onChange).toHaveBeenCalledWith([
        { section_symbol: 'income_statement', version_number: 1, order_number: 1 },
        { section_symbol: 'diagnosis_history', version_number: 1, order_number: 0 },
      ]);
    });
  });

  describe('given filtered sections', () => {
    it('when add dropdown is opened, then excludes already-attached sections', () => {
      const fss: FormSection[] = [
        { section_symbol: 'income_statement', version_number: 1, order_number: 0 },
      ];
      render(
        <SectionAttachmentEditor
          sections={mockSections}
          collections={mockCollections}
          formSections={fss}
          onChange={vi.fn()}
        />,
      );
      const select = screen.getByLabelText('Add section');
      const options = Array.from(select.querySelectorAll('option')).map(
        (o) => o.textContent,
      );
      expect(options).not.toContain('income_statement (v1)');
      expect(options).toContain('balance_sheet (v1)');
      expect(options).toContain('diagnosis_history (v2)');
    });
  });

  describe('given available sections', () => {
    it('when Add is clicked after selecting a section, then calls onChange with new section appended', () => {
      const fss: FormSection[] = [];
      const onChange = vi.fn();
      render(
        <SectionAttachmentEditor
          sections={mockSections}
          collections={mockCollections}
          formSections={fss}
          onChange={onChange}
        />,
      );
      const select = screen.getByLabelText('Add section');
      fireEvent.change(select, { target: { value: 'income_statement' } });
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(onChange).toHaveBeenCalledWith([
        {
          section_symbol: 'income_statement',
          version_number: 1,
          order_number: 0,
        },
      ]);
    });
  });

  describe('given available sections with create button', () => {
    it('when + New Section button is clicked, then shows SectionForm in a modal', () => {
      render(
        <SectionAttachmentEditor
          sections={mockSections}
          collections={mockCollections}
          formSections={[]}
          onChange={vi.fn()}
          accessToken="test-token"
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: '+ New Section' }));
      expect(screen.getByText('Create Section')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('when Cancel is clicked in modal, then hides modal', () => {
      render(
        <SectionAttachmentEditor
          sections={mockSections}
          collections={mockCollections}
          formSections={[]}
          onChange={vi.fn()}
          accessToken="test-token"
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: '+ New Section' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Create Section')).not.toBeInTheDocument();
    });

    it('when section is saved, then refetches sections and calls onSectionCreated', async () => {
      const updatedSections: AdminSection[] = [
        ...mockSections,
        {
          collection_id: 'col-1',
          section_id: 'sec-new',
          section_symbol: 'new_section',
          version: 1,
          status: 'draft',
          section_questions: [],
          translations: [],
        },
      ];

      // First call: SectionForm's POST on save
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updatedSections[3]), text: () => Promise.resolve('') });
      // Second call: refetchSections after save
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updatedSections), text: () => Promise.resolve('') });

      const onSectionCreated = vi.fn();
      render(
        <SectionAttachmentEditor
          sections={mockSections}
          collections={mockCollections}
          formSections={[]}
          onChange={vi.fn()}
          accessToken="test-token"
          onSectionCreated={onSectionCreated}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: '+ New Section' }));
      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText('Section Symbol'), {
        target: { value: 'new_section' },
      });
      const collectionSelect = within(dialog).getAllByRole('combobox')[0];
      fireEvent.change(collectionSelect, { target: { value: 'col-1' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

      await waitFor(() => {
        expect(onSectionCreated).toHaveBeenCalledWith(updatedSections);
      });
    });
  });
});

// ── FormForm tests ────────────────────────────────────────────────────────────

describe('FormForm', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('given create mode', () => {
    it('when rendered, then shows "Create Form" heading', () => {
      render(
        <FormForm
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('Create Form')).toBeInTheDocument();
    });
  });

  describe('given edit mode with a form', () => {
    it('when rendered, then shows "Edit Form" heading', () => {
      const mockForm: AdminForm = {
        collection_id: 'col-1',
        form_id: 'form-1',
        form_symbol: 'annual_report',
        version: 1,
        form_sections: [],
        formulas: [],
        status: 'draft',
        form_organisations: [],
        translations: [],
      };
      render(
        <FormForm
          form={mockForm}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('Edit Form')).toBeInTheDocument();
    });
  });

  describe('given empty form_symbol', () => {
    it('when submitted, then shows validation error', async () => {
      render(
        <FormForm
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(
        await screen.findByText('Form symbol is required'),
      ).toBeInTheDocument();
    });
  });

  describe('given a short symbol', () => {
    it('when submitted, then shows symbol length validation error', async () => {
      render(
        <FormForm
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.change(screen.getByLabelText('Form Symbol'), {
        target: { value: 'a' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(
        await screen.findByText('Form symbol must be at least 2 characters'),
      ).toBeInTheDocument();
    });
  });

  describe('given an invalid symbol pattern', () => {
    it('when submitted, then shows symbol pattern validation error', async () => {
      render(
        <FormForm
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.change(screen.getByLabelText('Form Symbol'), {
        target: { value: 'hello world' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(
        await screen.findByText(
          'Form symbol may only contain letters, numbers, and underscores',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('given missing collection', () => {
    it('when submitted, then shows collection validation error', async () => {
      render(
        <FormForm
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.change(screen.getByLabelText('Form Symbol'), {
        target: { value: 'valid_symbol' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(
        await screen.findByText('Collection is required'),
      ).toBeInTheDocument();
    });
  });

  describe('given valid input on create', () => {
    it('when submitted, then calls POST /api/admin/forms with status draft', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      });

      render(
        <FormForm
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Form Symbol'), {
        target: { value: 'new_form' },
      });
      fireEvent.change(screen.getByDisplayValue('-- Unassigned --'), {
        target: { value: 'col-1' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/forms',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: expect.stringContaining('"status":"draft"'),
          }),
        );
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/forms',
          expect.objectContaining({
            body: expect.stringContaining('collection_id'),
          }),
        );
      });
    });
  });

  describe('given valid input on edit', () => {
    it('when submitted, then calls PUT on the correct form ID', async () => {
      const mockForm: AdminForm = {
        collection_id: 'col-1',
        form_id: 'form-1',
        form_symbol: 'annual_report',
        version: 1,
        form_sections: [],
        formulas: [],
        status: 'draft',
        form_organisations: [],
        translations: [],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockForm),
        text: () => Promise.resolve(''),
      });

      render(
        <FormForm
          form={mockForm}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Form Symbol'), {
        target: { value: 'updated_form' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Update' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/forms/form-1',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('updated_form'),
          }),
        );
      });
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
        <FormForm
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Form Symbol'), {
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
        <FormForm
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Form Symbol'), {
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

  describe('given create mode', () => {
    it('when rendered, then shows + New Collection button', () => {
      render(
        <FormForm
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('+ New Collection')).toBeInTheDocument();
    });
  });

  describe('given readOnly mode', () => {
    it('when rendered, then shows View Form heading and Close button', () => {
      const mockForm: AdminForm = {
        collection_id: 'col-1',
        form_id: 'form-1',
        form_symbol: 'annual_report',
        version: 1,
        form_sections: [],
        formulas: [],
        status: 'published',
        form_organisations: [],
        translations: [],
      };
      render(
        <FormForm
          form={mockForm}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
          readOnly={true}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('View Form: annual_report')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Update|Cancel/ })).not.toBeInTheDocument();
    });
  });
});

// ── FormList tests ────────────────────────────────────────────────────────────

const mockForms: AdminForm[] = [
  {
    collection_id: 'col-1',
    form_id: 'form-1',
    form_symbol: 'annual_report',
    version: 2,
    form_sections: [
      { section_symbol: 'income_statement', version_number: 1, order_number: 0 },
    ],
    formulas: [],
    status: 'draft',
    form_organisations: [],
    translations: [],
  },
  {
    collection_id: 'col-1',
    form_id: 'form-2',
    form_symbol: 'annual_report',
    version: 1,
    form_sections: [
      { section_symbol: 'income_statement', version_number: 1, order_number: 0 },
    ],
    formulas: [],
    status: 'published',
    form_organisations: [],
    translations: [],
  },
  {
    collection_id: 'col-2',
    form_id: 'form-3',
    form_symbol: 'clinical_form',
    version: 1,
    form_sections: [
      { section_symbol: 'diagnosis_history', version_number: 1, order_number: 0 },
    ],
    formulas: [],
    status: 'published',
    form_organisations: [],
    translations: [],
  },
];

describe('FormList', () => {
  describe('given forms', () => {
    it('when rendered, then shows table with grouped rows', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      expect(screen.getByText('Forms')).toBeInTheDocument();
      expect(screen.getAllByText('financial').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('clinical').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('annual_report')).toBeInTheDocument();
      expect(screen.getByText('clinical_form')).toBeInTheDocument();
    });
  });

  describe('given no forms', () => {
    it('when rendered, then shows empty state', () => {
      render(
        <FormList
          initialForms={[]}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      expect(
        screen.getByText(/No forms yet/),
      ).toBeInTheDocument();
    });
  });

  describe('given initial render', () => {
    it('when rendered, then does not show loading message', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('given forms', () => {
    it('when Create Form clicked, then shows inline form', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /Create Form/i }));
      expect(screen.getByText('Create Form')).toBeInTheDocument();
      expect(screen.getAllByText('Create Form').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('given forms', () => {
    it('when Edit clicked on draft latest, then shows inline form in table row', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      const editButton = screen.getByRole('button', {
        name: /Edit annual_report v2/i,
      });
      fireEvent.click(editButton);
      expect(screen.getByText('Edit Form')).toBeInTheDocument();
    });
  });

  describe('given forms', () => {
    it('when Delete clicked on draft, then shows confirmation modal', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      const deleteButton = screen.getByRole('button', {
        name: /Delete annual_report v2/i,
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
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );

      const deleteButton = screen.getByRole('button', {
        name: /Delete annual_report v2/i,
      });
      fireEvent.click(deleteButton);

      const confirmButton = screen
        .getByRole('dialog')
        .querySelector('.btn-danger');
      expect(confirmButton).not.toBeNull();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/forms/form-1',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });
  });

  describe('given delete modal open', () => {
    it('when Cancel is clicked, then hides modal', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );

      const deleteButton = screen.getByRole('button', {
        name: /Delete annual_report v2/i,
      });
      fireEvent.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      expect(
        screen.queryByText('Confirm Delete'),
      ).not.toBeInTheDocument();
    });
  });

  describe('given a draft form', () => {
    it('when Publish button clicked, then shows publish confirmation modal', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      const publishButton = screen.getByRole('button', {
        name: /Publish annual_report v2/i,
      });
      fireEvent.click(publishButton);
      expect(screen.getByText('Confirm Publish')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to publish this form? It will be visible to users.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('given publish modal open', () => {
    it('when Confirm is clicked, then calls PUT with status published', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );

      const publishButton = screen.getByRole('button', {
        name: /Publish annual_report v2/i,
      });
      fireEvent.click(publishButton);

      const confirmButton = screen.getByRole('button', { name: 'Publish' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/forms/form-1',
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
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );

      const publishButton = screen.getByRole('button', {
        name: /Publish annual_report v2/i,
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
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      expect(screen.getByLabelText('Filter by collection')).toBeInTheDocument();
    });

    it('when filter is set to a collection, then shows only matching forms', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      const filterSelect = screen.getByLabelText('Filter by collection');
      fireEvent.change(filterSelect, { target: { value: 'col-2' } });
      expect(screen.getByText('clinical_form')).toBeInTheDocument();
      expect(screen.queryByText('annual_report')).not.toBeInTheDocument();
    });

    it('when filtered by collection, then shows only matching collection and sections', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      const filterSelect = screen.getByLabelText('Filter by collection');
      fireEvent.change(filterSelect, { target: { value: 'col-1' } });
      expect(screen.getAllByText('financial').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('annual_report')).toBeInTheDocument();
      const table = screen.getByRole('table');
      expect(within(table).queryByText('clinical_form')).not.toBeInTheDocument();
    });

    it('when filter matches no forms, then shows empty state', () => {
      render(
        <FormList
          initialForms={[
            {
              collection_id: 'col-1',
              form_id: 'form-1',
              form_symbol: 'annual_report',
              version: 1,
              form_sections: [],
              formulas: [],
              status: 'draft',
              form_organisations: [],
              translations: [],
            },
          ]}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      const filterSelect = screen.getByLabelText('Filter by collection');
      fireEvent.change(filterSelect, { target: { value: 'col-2' } });
      expect(
        screen.getByText('No forms match the current filter.'),
      ).toBeInTheDocument();
    });
  });

  describe('given a published form', () => {
    it('when View is clicked, then shows read-only form', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      const viewButton = screen.getByRole('button', { name: /View clinical_form v1/i });
      fireEvent.click(viewButton);
      expect(screen.getByText(/clinical_form/)).toBeInTheDocument();
    });
  });

  describe('given a published form', () => {
    it('when New Version is clicked on latest published, then shows confirmation modal', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      const newVersionButton = screen.getByRole('button', { name: /New version of clinical_form/i });
      fireEvent.click(newVersionButton);
      expect(screen.getByRole('heading', { name: 'Create New Version' })).toBeInTheDocument();
    });
  });

  describe('given forms with multiple versions', () => {
    it('when version button is clicked, then shows sub-rows for older versions', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      const toggleButton = screen.getByRole('button', { name: /Toggle versions for annual_report/i });
      fireEvent.click(toggleButton);
      expect(screen.getByText('v1')).toBeInTheDocument();
      expect(screen.getAllByText('published').length).toBeGreaterThanOrEqual(2);
    });

    it('when version is clicked again, then hides sub-rows', () => {
      render(
        <FormList
          initialForms={mockForms}
          collections={mockCollections}
          sections={mockSections}
          accessToken="test-token"
        />,
      );
      const toggleButton = screen.getByRole('button', { name: /Toggle versions for annual_report/i });
      fireEvent.click(toggleButton);
      expect(screen.getByText('v1')).toBeInTheDocument();
      fireEvent.click(toggleButton);
      expect(screen.queryByText('v1')).not.toBeInTheDocument();
    });
  });
});
