export type LocaleInfo = {
  code: string;
  name: string;
  flag: string;
};

export const AVAILABLE_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'et', name: 'Eesti', flag: '🇪🇪' },
];

export function getLocaleInfo(code: string): LocaleInfo | undefined {
  return AVAILABLE_LOCALES.find((l) => l.code === code);
}
