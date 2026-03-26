import { ReactNode, useState } from 'react';
import { Bell, Settings } from 'lucide-react';

interface AppHeaderProps {
  user: any;
  left?: ReactNode;
  actions?: ReactNode;
  onSettingsClick?: () => void;
}

export function AppHeader({ user, left, actions, onSettingsClick }: AppHeaderProps) {
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'U';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const [imgError, setImgError] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-highest/60 backdrop-blur-xl flex justify-between items-center px-6 h-14 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-8">
        <span className="text-2xl font-headline font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tighter uppercase">
          Zupiq
        </span>
        {left}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <div className="flex items-center gap-1 text-on-surface-variant">
          <button className="p-2 rounded-full hover:bg-surface-container-highest transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-full hover:bg-surface-container-highest transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full border border-outline-variant overflow-hidden ml-1 flex-shrink-0">
            {user?.avatar_url && !imgError ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-xs font-bold text-on-surface">
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
