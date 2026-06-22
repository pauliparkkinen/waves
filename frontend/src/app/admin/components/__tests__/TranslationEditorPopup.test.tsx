import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TranslationEditorPopup from '../TranslationEditorPopup';
import type { Translation } from '@/lib/api';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const mockTranslations: Translation[] = [
  {
    translation_id: 't-1',
    collection_id: 'col-1',
    symbol: 'form_title',
    locale_code: 'en',
    value: 'Form Title',
    version: 1,
    status: 'published',
  },
  {
    translation_id: 't-2',
    collection_id: 'col-1',
    symbol: 'form_title',
    locale_code: 'fi',
    value: 'Lomakkeen otsikko',
    version: 1,
    status: 'draft',
  },
];

const defaultProps = {
  collectionId: 'col-1',
  accessToken: 'test-token',
  existingTranslations: mockTranslations,
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

function renderPopup(props = {}) {
  return render(<TranslationEditorPopup {...defaultProps} {...props} />);
}

describe('TranslationEditorPopup', () => {
  describe('given the popup is rendered', () => {
    it('when it opens, then it shows the title "Translation Editor"', () => {
      renderPopup();
      expect(screen.getByText('Translation Editor')).toBeInTheDocument();
    });

    it('when it opens, then it shows the existing translations count', () => {
      renderPopup();
      expect(screen.getByText('Translations (2)')).toBeInTheDocument();
    });

    it('when it opens, then it shows each translation\'s locale and value', () => {
      renderPopup();
      expect(screen.getAllByText('form_title')).toHaveLength(2);
      expect(screen.getByText('Form Title')).toBeInTheDocument();
      expect(screen.getByText('Lomakkeen otsikko')).toBeInTheDocument();
    });
  });

  describe('given existing translations are displayed', () => {
    it('when Edit is clicked on a translation, then it shows the inline edit form with the current values', () => {
      renderPopup();
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      fireEvent.click(editButtons[0]);

      expect(screen.getByDisplayValue('form_title')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Form Title')).toBeInTheDocument();
    });

    it('when Delete is clicked, then it removes the translation and calls the DELETE API', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      renderPopup();
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/translations/t-1',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });

      expect(screen.queryByText('Form Title')).not.toBeInTheDocument();
    });

    it('when Delete fails, then it shows an error message', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      });

      renderPopup();
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });
  });

  describe('given the Add Translation form is opened', () => {
    it('when "+ Add Translation" is clicked, then it shows the add form with locale selector, symbol input, and value textarea', () => {
      renderPopup();
      fireEvent.click(screen.getByRole('button', { name: '+ Add Translation' }));

      expect(screen.getByLabelText('Locale')).toBeInTheDocument();
      expect(screen.getByLabelText('Symbol / Key')).toBeInTheDocument();
      expect(screen.getByLabelText('Translation Value')).toBeInTheDocument();
    });

    it('when the user fills in the form and clicks "Add Translation", then it calls POST and adds the new translation', async () => {
      const newTranslation: Translation = {
        translation_id: 't-3',
        collection_id: 'col-1',
        symbol: 'form_description',
        locale_code: 'en',
        value: 'Form Description',
        version: 1,
        status: 'draft',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newTranslation),
        text: () => Promise.resolve(''),
      });

      renderPopup();
      fireEvent.click(screen.getByRole('button', { name: '+ Add Translation' }));

      fireEvent.change(screen.getByLabelText('Symbol / Key'), {
        target: { value: 'form_description' },
      });
      fireEvent.change(screen.getByLabelText('Translation Value'), {
        target: { value: 'Form Description' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add Translation' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/translations',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
            body: expect.stringContaining('form_description'),
          }),
        );
      });

      expect(screen.getByText('Form Description')).toBeInTheDocument();
    });
  });

  describe('given the user is editing a translation inline', () => {
    it('when the user changes the value and clicks Save, then it calls PUT and updates the translation', async () => {
      const updatedTranslation: Translation = {
        ...mockTranslations[0],
        value: 'Updated Form Title',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedTranslation),
        text: () => Promise.resolve(''),
      });

      renderPopup();
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      fireEvent.click(editButtons[0]);

      const valueInput = screen.getByDisplayValue('Form Title');
      fireEvent.change(valueInput, { target: { value: 'Updated Form Title' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/translations/t-1',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('Updated Form Title'),
          }),
        );
      });
    });
  });

  describe('given the user clicks Save All', () => {
    it('when translations exist, then it calls onSave with the current translations list', () => {
      const onSave = vi.fn();
      renderPopup({ onSave });

      fireEvent.click(screen.getByRole('button', { name: 'Save All' }));

      expect(onSave).toHaveBeenCalledWith(mockTranslations);
    });
  });

  describe('given the user clicks Cancel', () => {
    it('when Cancel is clicked, then it calls onCancel', () => {
      const onCancel = vi.fn();
      renderPopup({ onCancel });

      const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
      const modalCancelButton = cancelButtons[cancelButtons.length - 1];
      fireEvent.click(modalCancelButton);

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('given validation fails', () => {
    it('when symbol is empty and Add is clicked, then it shows a validation error', () => {
      renderPopup();
      fireEvent.click(screen.getByRole('button', { name: '+ Add Translation' }));

      fireEvent.change(screen.getByLabelText('Translation Value'), {
        target: { value: 'Some value' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add Translation' }));

      expect(screen.getByText('Symbol is required')).toBeInTheDocument();
    });

    it('when value is empty and Add is clicked, then it shows a validation error', () => {
      renderPopup();
      fireEvent.click(screen.getByRole('button', { name: '+ Add Translation' }));

      fireEvent.change(screen.getByLabelText('Symbol / Key'), {
        target: { value: 'my_symbol' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add Translation' }));

      expect(screen.getByText('Value is required')).toBeInTheDocument();
    });
  });

  describe('given no existing translations and empty collection', () => {
    it('when opened, then it shows empty state message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      renderPopup({ existingTranslations: undefined });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/translations?collection_id=col-1',
          expect.any(Object),
        );
      });

      expect(screen.queryByText(/Translations \(\d+\)/)).not.toBeInTheDocument();
    });
  });
});
