import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowUpRight, Bell, Check, CheckSquare, GitCommit, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useNotifications } from '../../context/NotificationContext';
import { cn } from '../../lib/utils';

const notificationStyles = {
  GITHUB_PUSH: {
    icon: GitCommit,
    className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
  TASK_ASSIGNED: {
    icon: CheckSquare,
    className: 'bg-primary/10 text-primary',
  },
  NO_TASK_SIGNAL: {
    icon: AlertCircle,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  default: {
    icon: Info,
    className: 'bg-muted text-muted-foreground',
  },
};

function NotificationTypeIcon({ type }) {
  const style = notificationStyles[type] || notificationStyles.default;
  const Icon = style.icon;

  return (
    <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', style.className)}>
      <Icon className="size-4" />
    </span>
  );
}

function getTimeAgo(createdAt) {
  try {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: fr });
  } catch {
    return 'récemment';
  }
}

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.projectId) {
      navigate(`/projects/${notification.projectId}`);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full border-2 border-background bg-rose-500 px-1 text-[10px] font-semibold leading-3 text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-sm font-semibold">Notifications</h2>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                  {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="xs" onClick={markAllAsRead}>
                <Check />
                Tout marquer lu
              </Button>
            )}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bell className="size-5" />
                </span>
                <p className="mt-3 text-sm font-medium">Aucune notification</p>
                <p className="mt-1 text-xs text-muted-foreground">Les nouvelles activités apparaîtront ici.</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-3 border-b px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    !notification.read && 'bg-primary/[0.06]'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <NotificationTypeIcon type={notification.type} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-3">
                      <span className={cn('min-w-0 flex-1 truncate text-sm', notification.read ? 'font-medium' : 'font-semibold')}>
                        {notification.title}
                      </span>
                      {!notification.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {getTimeAgo(notification.createdAt)}
                      </span>
                    </span>
                    <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {notification.message}
                    </span>
                    {notification.projectId && (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                        Ouvrir le projet
                        <ArrowUpRight className="size-3" />
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full justify-center text-primary" onClick={() => { navigate('/notifications'); setIsOpen(false); }}>
              Voir toutes les notifications
              <ArrowUpRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
