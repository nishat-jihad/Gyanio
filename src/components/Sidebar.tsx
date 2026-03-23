import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Settings, Calendar, CheckSquare, Timer, 
  BarChart2, Trophy, Sword, Layers, FileText, 
  User, ChevronLeft, ChevronRight, LogOut, Globe
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useI18n();
  const { signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: t('nav.home'), path: '/' },
    { icon: Settings, label: t('nav.setup'), path: '/setup' },
    { icon: Calendar, label: t('nav.routine'), path: '/routine' },
    { icon: CheckSquare, label: t('nav.tracker'), path: '/tracker' },
    { icon: Timer, label: t('nav.pomodoro'), path: '/pomodoro' },
    { icon: BarChart2, label: t('nav.weekly'), path: '/weekly' },
    { icon: Sword, label: t('nav.challenge'), path: '/challenge' },
    { icon: Trophy, label: t('nav.leaderboard'), path: '/leaderboard' },
    { icon: Layers, label: t('nav.flashcards'), path: '/flashcards' },
    { icon: FileText, label: t('nav.notes'), path: '/notes' },
    { icon: BarChart2, label: t('nav.analytics'), path: '/analytics' },
    { icon: User, label: t('nav.profile'), path: '/profile' },
  ];

  return (
    <aside className={cn(
      "h-screen bg-surface border-r border-border transition-all duration-300 flex flex-col sticky top-0",
      collapsed ? "w-[70px]" : "w-[240px]"
    )}>
      <div className="p-4 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shrink-0">
          G
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-semibold text-lg tracking-tight">
              <span className="text-primary">Gy</span><span>anio</span>
            </span>
            <span className="text-[10px] text-text-secondary tracking-[0.12em] font-medium uppercase">Learn Limitless</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              location.pathname === item.path 
                ? "bg-primary/10 text-primary" 
                : "text-text-secondary hover:bg-elevated hover:text-text-primary"
            )}
          >
            <item.icon size={20} className={cn(
              "shrink-0",
              location.pathname === item.path ? "text-primary" : "group-hover:text-text-primary"
            )} />
            {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-2 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-elevated hover:text-text-primary transition-all duration-200"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!collapsed && <span className="font-medium text-sm">Collapse</span>}
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={20} />
          {!collapsed && <span className="font-medium text-sm">{t('auth.sign_out')}</span>}
        </button>
      </div>
    </aside>
  );
}
