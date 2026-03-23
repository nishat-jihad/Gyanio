import { Bell, Moon, Sun, Globe } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useI18n } from '../i18n';
import { useState } from 'react';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { lang, changeLang, t } = useI18n();
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'ar', name: 'عربي', flag: '🇸🇦' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ur', name: 'اردو', flag: '🇵🇰' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  return (
    <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Breadcrumbs or Page Title could go here */}
      </div>

      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <div className="relative">
          <button 
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-elevated border border-border text-xs font-medium hover:border-primary/50 transition-all"
          >
            <Globe size={14} />
            <span className="uppercase">{lang}</span>
          </button>
          
          {showLangDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowLangDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-elevated border border-border rounded-xl shadow-xl z-20 overflow-hidden py-1">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      changeLang(l.code);
                      setShowLangDropdown(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-primary/10 transition-colors ${lang === l.code ? 'text-primary' : 'text-text-primary'}`}
                  >
                    <span>{l.flag}</span>
                    <span className="font-medium">{l.name}</span>
                    {lang === l.code && <span className="ml-auto text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'black' : 'dark')}
          className="p-2 rounded-full bg-elevated border border-border text-text-secondary hover:text-text-primary transition-all"
        >
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-full bg-elevated border border-border text-text-secondary hover:text-text-primary transition-all relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-surface"></span>
        </button>

        {/* User Profile Mini */}
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 overflow-hidden">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Gyanio`} 
            alt="User" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}
