/**
 * LanguageSwitcher Component
 * 
 * A dropdown menu for switching between supported languages.
 * Supports both compact (header) and full-width (mobile) variants.
 * 
 * Languages: English, Spanish (Español), German (Deutsch)
 */

import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface LanguageSwitcherProps {
  /** Visual variant: 'header' for compact, 'mobile' for full-width */
  variant?: 'header' | 'mobile';
}

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
];

export default function LanguageSwitcher({ variant = 'header' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const currentLanguage = getCurrentLanguage();

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode);
  };

  // Get current language display name
  const currentLang = languages.find(lang => lang.code === currentLanguage);
  const currentDisplayName = currentLang?.nativeName || 'English';

  if (variant === 'mobile') {
    // Mobile variant: Full-width button with dropdown
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Globe size={20} />
              <span className="font-medium">{currentDisplayName}</span>
            </div>
            <Check size={16} className="text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{language.nativeName}</span>
              {currentLanguage === language.code && (
                <Check size={16} className="text-green-600" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Header variant: Compact button with icon
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          title="Change language"
        >
          <Globe size={20} />
          <span className="text-sm font-medium hidden xl:block">
            {currentDisplayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{language.nativeName}</span>
            {currentLanguage === language.code && (
              <Check size={16} className="text-green-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

