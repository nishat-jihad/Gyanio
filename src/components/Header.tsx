import { Bell, Moon, Sun, Globe } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { useState } from 'react';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { lang, changeLang, t } = useI18n();
  const { profile } = useAuth();
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'ar', name: 'عربي', flag: '🇸🇦' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ur', name: 'اردو', flag: '🇵🇰' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const notifications = [
    { id: 1, title: 'Welcome to Gyanio!', message: 'Start by setting up your exam profile.', time: 'Just now' },
    { id: 2, title: 'Daily Goal', message: 'You are 50% through your daily goal.', time: '2h ago' },
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
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full bg-elevated border border-border text-text-secondary hover:text-text-primary transition-all relative"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-surface"></span>
          </button>

          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-elevated border border-border rounded-2xl shadow-2xl z-20 overflow-hidden">
                <div className="p-4 border-b border-border bg-surface/50">
                  <h3 className="font-bold text-sm">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {notifications.map(n => (
                    <div key={n.id} className="p-4 border-b border-border last:border-0 hover:bg-primary/5 transition-colors cursor-pointer">
                      <p className="text-sm font-bold text-text-primary">{n.title}</p>
                      <p className="text-xs text-text-secondary mt-1">{n.message}</p>
                      <p className="text-[10px] text-text-secondary mt-2 font-bold uppercase tracking-widest">{n.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Mini */}
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 overflow-hidden">
          <img 
            src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.displayName || 'Gyanio'}`} 
            alt="User" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}
