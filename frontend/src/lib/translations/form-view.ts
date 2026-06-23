/**
 * Form view UI string translations.
 * Each locale key maps to the full set of UI strings used by form-view components.
 */

const translations: Record<string, Record<string, Record<string, string>>> = {
  en: {
    saveIndicator: {
      saving: 'Saving...',
      saved: 'Saved',
      error: 'Error saving',
      retry: 'Retry',
      retryInstruction: 'Your response has been saved locally. The system will retry automatically.',
    },
    navigation: {
      next: 'Next',
      previous: 'Previous',
      nextSectionLabel: 'Next section',
      previousSectionLabel: 'Previous section',
      currentSectionLabel: 'Current section',
      completedSectionLabel: 'Completed section',
      incompleteSectionLabel: 'Incomplete section',
      upcomingSectionLabel: 'Upcoming section',
      navLabel: 'Form sections',
    },
    section: {
      complete: 'Complete Section',
      close: 'Close Section',
      edit: 'Edit',
      incomplete: 'Incomplete',
      completed: 'Completed',
      continue: 'Continue',
      reopen: 'Reopen',
      sectionNotFound: 'Section not found.',
      noAnswer: 'No answer',
      booleanYes: 'Yes',
      booleanNo: 'No',
      completedAriaLabel: 'Completed',
      warningAriaLabel: 'Warning',
      incompleteAriaLabel: 'Incomplete',
    },
    summary: {
      noQuestions: 'This section has no questions',
      allComplete: 'All sections complete',
      incompleteWarning: 'Some sections are incomplete',
      noAnswer: 'No answer',
      reviewMode: 'Read-only view — answers cannot be modified.',
    },
    submission: {
      title: 'Are you sure you want to submit?',
      reviewed: 'I have reviewed my answers',
      warning: 'Answers cannot be modified after submission',
      submit: 'Submit',
      cancel: 'Cancel',
      submitting: 'Submitting...',
      error: 'Failed to submit. Please try again.',
    },
    patientSelector: {
      title: 'Select Patient',
      description: 'You are filling this form on behalf of a patient. Please search for the patient.',
      searchLabel: 'Search patients',
      searchPlaceholder: 'Search by name or ID...',
      searchHelp: 'Enter at least 2 characters to search',
      searching: 'Searching...',
      noResults: 'No patients found. Try a different search term.',
      fillingOnBehalfOf: 'Filling on behalf of:',
      changePatient: 'Change Patient',
    },
    progress: {
      section: 'Section',
      question: 'Question',
      of: 'of',
      completed: 'completed',
      progressLabel: 'Form progress: {percent} percent complete',
      percent: '{percent}%',
    },
  },
  fi: {
    saveIndicator: {
      saving: 'Tallennetaan...',
      saved: 'Tallennettu',
      error: 'Tallennus epäonnistui',
      retry: 'Yritä uudelleen',
      retryInstruction: 'Vastauksesi on tallennettu paikallisesti. Järjestelmä yrittää automaattisesti uudelleen.',
    },
    navigation: {
      next: 'Seuraava',
      previous: 'Edellinen',
      nextSectionLabel: 'Seuraava osio',
      previousSectionLabel: 'Edellinen osio',
      currentSectionLabel: 'Nykyinen osio',
      completedSectionLabel: 'Valmis osio',
      incompleteSectionLabel: 'Keskeneräinen osio',
      upcomingSectionLabel: 'Tuleva osio',
      navLabel: 'Lomakkeen osiot',
    },
    section: {
      complete: 'Sulje osio',
      close: 'Sulje osio',
      edit: 'Muokkaa',
      incomplete: 'Kesken',
      completed: 'Valmis',
      continue: 'Jatka',
      reopen: 'Avaa uudelleen',
      sectionNotFound: 'Osiota ei löytynyt.',
      noAnswer: 'Ei vastausta',
      booleanYes: 'Kyllä',
      booleanNo: 'Ei',
      completedAriaLabel: 'Valmis',
      warningAriaLabel: 'Varoitus',
      incompleteAriaLabel: 'Kesken',
    },
    summary: {
      noQuestions: 'Tässä osiossa ei ole kysymyksiä',
      allComplete: 'Kaikki osiot valmiita',
      incompleteWarning: 'Jotkin osiot ovat keskeneräisiä',
      noAnswer: 'Ei vastausta',
      reviewMode: 'Vain lukumoodi — vastauksia ei voi muokata.',
    },
    submission: {
      title: 'Haluatko varmasti lähettää?',
      reviewed: 'Olen tarkistanut vastaukseni',
      warning: 'Vastauksia ei voi muokata lähetyksen jälkeen',
      submit: 'Lähetä',
      cancel: 'Peruuta',
      submitting: 'Lähetetään...',
      error: 'Lähetys epäonnistui. Yritä uudelleen.',
    },
    patientSelector: {
      title: 'Valitse potilas',
      description: 'Täytät tätä lomaketta potilaan puolesta. Etsi potilas.',
      searchLabel: 'Etsi potilaita',
      searchPlaceholder: 'Hae nimellä tai tunnisteella...',
      searchHelp: 'Syötä vähintään 2 merkkiä',
      searching: 'Haetaan...',
      noResults: 'Potilaita ei löytynyt. Kokeile toista hakusanaa.',
      fillingOnBehalfOf: 'Täytetään potilaan puolesta:',
      changePatient: 'Vaihda potilasta',
    },
    progress: {
      section: 'Osio',
      question: 'Kysymys',
      of: '/',
      completed: 'valmis',
      progressLabel: 'Lomakkeen edistyminen: {percent} prosenttia',
      percent: '{percent}%',
    },
  },
};

/**
 * Returns the full strings object for the given locale.
 * Falls back to English if the locale is not available.
 */
export function getFormViewStrings(locale: string = 'en'): Record<string, Record<string, string>> {
  return translations[locale] || translations.en;
}
