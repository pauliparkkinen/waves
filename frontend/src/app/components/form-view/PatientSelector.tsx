'use client';

import React, { useCallback, useState } from 'react';
import { getFormViewStrings } from '@/lib/translations/form-view';

type PatientSummary = {
  patientId: string;
  name: string;
  dateOfBirth?: string;
  email?: string;
};

type PatientSelectorProps = {
  onSelectPatient: (patientId: string) => void;
  selectedPatientId?: string;
  locale?: string;
};

export function PatientSelector({
  onSelectPatient,
  selectedPatientId,
  locale = 'en',
}: PatientSelectorProps) {
  const strings = getFormViewStrings(locale);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(() => {
    if (selectedPatientId) {
      return { patientId: selectedPatientId, name: `Patient ${selectedPatientId}` };
    }
    return null;
  });

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // For now, return empty results - patient search API is not yet available
        // When a backend endpoint is added, call it here:
        // const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`);
        // const data = await res.json();
        // setSearchResults(data.patients ?? []);

        // Placeholder - search will be empty until backend endpoint is available
        setSearchResults([]);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  const handleSelectPatient = useCallback(
    (patient: PatientSummary) => {
      setSelectedPatient(patient);
      setSearchResults([]);
      setSearchQuery('');
      onSelectPatient(patient.patientId);
    },
    [onSelectPatient],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedPatient(null);
    onSelectPatient('');
  }, [onSelectPatient]);

  // If a patient is already selected, show the current selection with option to change
  if (selectedPatient) {
    return (
      <div className="patient-selector patient-selector--selected">
        <p className="patient-selector__info">
          <strong>{strings.patientSelector.fillingOnBehalfOf}</strong>{' '}
          {selectedPatient.name}
        </p>
        <button
          type="button"
          className="btn-small btn-secondary"
          onClick={handleClearSelection}
        >
          {strings.patientSelector.changePatient}
        </button>
      </div>
    );
  }

  return (
    <div className="patient-selector">
      <h2 className="patient-selector__title">
        {strings.patientSelector.title}
      </h2>
      <p className="patient-selector__description">
        {strings.patientSelector.description}
      </p>
      <div className="patient-selector__search">
        <label htmlFor="patient-search" className="sr-only">
          {strings.patientSelector.searchLabel}
        </label>
        <input
          id="patient-search"
          type="text"
          className="patient-selector__input"
          placeholder={strings.patientSelector.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          aria-describedby="patient-search-help"
        />
        <span id="patient-search-help" className="question__help">
          {strings.patientSelector.searchHelp}
        </span>
      </div>

      {isSearching && (
        <p className="patient-selector__status">{strings.patientSelector.searching}</p>
      )}

      {!isSearching && searchQuery && searchResults.length === 0 && (
        <p className="patient-selector__empty">{strings.patientSelector.noResults}</p>
      )}

      {searchResults.length > 0 && (
        <ul className="patient-selector__results" role="listbox" aria-label="Patient search results">
          {searchResults.map((patient) => (
            <li key={patient.patientId} role="option" aria-selected={patient.patientId === selectedPatientId}>
              <button
                type="button"
                className="patient-selector__result-btn"
                onClick={() => handleSelectPatient(patient)}
              >
                <strong>{patient.name}</strong>
                {patient.dateOfBirth && <span>DOB: {patient.dateOfBirth}</span>}
                {patient.email && <span>{patient.email}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
