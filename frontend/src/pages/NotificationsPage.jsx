import React, { useMemo, useState } from 'react';
import { AlertCircle, Bell, Check, CheckSquare, ExternalLink, GitCommit, Info, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useNotifications } from '../context/NotificationContext';

const filters = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'GITHUB_PUSH', label: 'Pushes GitHub' },
  { id: 'TASK_ASSIGNED', label: 'Assignations' },
  { id: 'NO_TASK_SIGNAL', label: 'Disponibilités' },
];

const iconStyles = {
  GITHUB_PUSH: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  TASK_ASSIGNED: 'bg-primary/10 text-primary',
  NO_TASK_SIGNAL: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  default: 'bg-muted text-muted-foreground',
};

function NotificationIcon({ type }) {
  const Icon = type === 'GITHUB_PUSH' ? GitCommit : type === 'TASK_ASSIGNED' ? CheckSquare : type === 'NO_TASK_SIGNAL' ? AlertCircle : Info;
  return <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconStyles[type] || iconStyles.default}`}><Icon className="size-4" /></span>;
}

function parseNotificationData(data) {
  if (!data) return null;
  try {
    const parsedData = JSON.parse(data);
    const hasVisibleData = ['repo', 'branch', 'commitMessage'].some((key) => parsedData?.[key]);
    return hasVisibleData ? parsedData : null;
  } catch {
    return null;
  }
}

export function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filterType, setFilterType] = useState('ALL');

  const counts = useMemo(() => filters.reduce((result, filter) => {
    result[filter.id] = filter.id === 'ALL' ? notifications.length : notifications.filter((notification) => notification.type === filter.id).length;
    return result;
  }, {}), [notifications]);

  const filteredNotifications = notifications.filter((notification) => filterType === 'ALL' || notification.type === filterType);

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Espace de travail</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Retrouvez les activités importantes de vos projets et de votre équipe.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <Check />
            Tout marquer comme lu
            <Badge variant="secondary">{unreadCount}</Badge>
          </Button>
        )}
      </div>

      <Tabs value={filterType} onValueChange={setFilterType}>
        <div className="min-w-0 overflow-x-auto overflow-y-hidden pb-2">
          <TabsList variant="line" className="min-w-max gap-1 rounded-none bg-transparent p-0">
            {filters.map((filter) => (
              <TabsTrigger key={filter.id} value={filter.id} className="flex-none gap-2 px-3 py-3">
                {filter.label}
                <Badge variant={filterType === filter.id ? 'default' : 'secondary'} className="h-5 min-w-5 justify-center px-1.5 text-[11px]">{counts[filter.id]}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {filteredNotifications.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Bell className="size-10 text-muted-foreground/50" />
            <h2 className="mt-4 font-medium">Aucune notification</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Vous n’avez aucune notification dans cette catégorie pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const metaData = parseNotificationData(notification.data);
            let timeAgo = 'récemment';
            let dateFormatted = '';
            try {
              timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr });
              dateFormatted = format(new Date(notification.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr });
            } catch {
              // Une date invalide ne doit pas empêcher la lecture de la notification.
            }

            return (
              <Card key={notification.id} className={`p-0 shadow-none transition-colors ${notification.read ? '' : 'border-primary/30 bg-primary/[0.03]'}`}>
                <CardContent className="flex gap-4 p-5">
                  <NotificationIcon type={notification.type} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h2 className={`text-sm ${notification.read ? 'font-medium' : 'font-semibold'}`}>{notification.title}</h2>
                        {!notification.read && <Badge className="text-xs">Nouveau</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground" title={dateFormatted}>{timeAgo}</span>
                    </div>
                    <p className="text-sm leading-5 text-muted-foreground">{notification.message}</p>

                    {metaData && (
                      <div className="space-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        {metaData.repo && <p><span className="font-medium text-foreground">Dépôt :</span> <code className="font-mono">{metaData.repo}</code>{metaData.branch ? ` · ${metaData.branch}` : ''}</p>}
                        {metaData.commitMessage && <p><span className="font-medium text-foreground">Commit :</span> {metaData.commitMessage}</p>}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {notification.projectId && (
                        <Button variant="link" size="sm" className="h-7 px-0" asChild>
                          <Link to={`/projects/${notification.projectId}`}>Voir le projet <ExternalLink /></Link>
                        </Button>
                      )}
                      {!notification.read && <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => markAsRead(notification.id)}>Marquer comme lu</Button>}
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => deleteNotification(notification.id)}><Trash2 />Supprimer</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
