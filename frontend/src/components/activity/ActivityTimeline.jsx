import React from 'react';
import { Activity, CheckCircle2, ClipboardPlus, Edit3, Trash2, UserRound } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const activityIcons = {
  TASK_CREATED: ClipboardPlus,
  TASK_UPDATED: Edit3,
  TASK_STATUS_CHANGED: Activity,
  TASK_ASSIGNED: UserRound,
  TASK_COMPLETED: CheckCircle2,
  TASK_DELETED: Trash2
};

export function ActivityTimeline({ activities = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique du projet</CardTitle>
        <CardDescription>Les changements de tâches sont enregistrés avec leur auteur et leur date.</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Aucune activité enregistrée pour le moment.
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((item) => {
              const Icon = activityIcons[item.type] || Activity;
              let timestamp = 'Date inconnue';
              try {
                timestamp = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr });
              } catch {
                // Conserver un libellé lisible si la date reçue est invalide.
              }

              return (
                <div key={item.id} className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-muted/50">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6">{item.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.user?.name || 'Utilisateur'} · {timestamp}
                      {item.task?.title ? ` · ${item.task.title}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
