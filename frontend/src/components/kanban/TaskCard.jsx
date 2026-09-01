import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckSquare, Clock, Edit2, Square, Trash2 } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { UserAvatar } from '../common/UserAvatar';

const priorityStyles = {
  HAUTE: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  MOYENNE: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  BASSE: 'border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

const priorityLabels = {
  HAUTE: 'Haute',
  MOYENNE: 'Moyenne',
  BASSE: 'Basse',
};

const statusStyles = {
  A_FAIRE: 'secondary',
  EN_COURS: 'outline',
  TERMINE: 'default',
};

const statusLabels = {
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
};

export function TaskCard({ task, onToggleStatus, onEdit, onDelete, onStatusChange, currentUserId, isChefOrAdmin, onDragStart, onDragEnd, isDragging }) {
  const isAssignedToMe = task.assignedToId === currentUserId;
  const canEdit = isChefOrAdmin || isAssignedToMe || task.createdById === currentUserId;
  const isDone = task.status === 'TERMINE';

  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: fr });
  } catch {
    timeAgo = '';
  }

  return (
    <Card
      size="sm"
      draggable
      onDragStart={(event) => onDragStart?.(event, task)}
      onDragEnd={onDragEnd}
      className={cn(
        'cursor-grab shadow-none transition-[transform,opacity,box-shadow] hover:ring-primary/30 active:cursor-grabbing',
        isDragging && 'scale-[0.98] opacity-45 ring-2 ring-primary/40',
        isDone && 'bg-emerald-500/5 ring-emerald-500/30'
      )}
    >
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn('mt-[-2px] shrink-0 text-muted-foreground', isDone && 'text-emerald-500')}
            onClick={() => onToggleStatus(task.id)}
            title={isDone ? 'Marquer comme non terminée' : 'Marquer comme terminée'}
            aria-label={isDone ? 'Marquer comme non terminée' : 'Marquer comme terminée'}
          >
            {isDone ? <CheckSquare /> : <Square />}
          </Button>

          <div className="min-w-0 flex-1">
            <h4 className={cn('truncate text-sm font-medium', isDone && 'text-muted-foreground line-through')}>
              {task.title}
            </h4>
          </div>

          {canEdit && (onEdit || onDelete) && (
            <div className="flex shrink-0 gap-1">
              {onEdit && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onEdit(task)} title="Modifier la tâche" aria-label="Modifier la tâche">
                  <Edit2 />
                </Button>
              )}
              {onDelete && (
                <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(task.id)} title="Supprimer la tâche" aria-label="Supprimer la tâche">
                  <Trash2 />
                </Button>
              )}
            </div>
          )}
        </div>

        {task.description && (
          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {task.priority && (
              <Badge variant="outline" className={priorityStyles[task.priority]}>
                {priorityLabels[task.priority] || task.priority}
              </Badge>
            )}
            {task.project && <span className="truncate text-xs text-muted-foreground">{task.project.name}</span>}
          </div>

          {canEdit && onStatusChange ? (
            <Select value={task.status} onValueChange={(value) => onStatusChange(task.id, value)}>
              <SelectTrigger size="sm" className="w-[112px] px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A_FAIRE">À faire</SelectItem>
                <SelectItem value="EN_COURS">En cours</SelectItem>
                <SelectItem value="TERMINE">Terminé</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant={statusStyles[task.status] || 'outline'}>
              {statusLabels[task.status] || task.status}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex min-w-0 items-center gap-2">
            {task.assignedTo ? (
              <>
                <UserAvatar user={task.assignedTo} size="sm" />
                <span className={cn('truncate', isAssignedToMe && 'font-medium text-primary')}>
                  {isAssignedToMe ? 'Moi' : task.assignedTo.name}
                </span>
              </>
            ) : (
              <span className="italic">Non assignée</span>
            )}
          </div>

          {timeAgo && (
            <div className="flex shrink-0 items-center gap-1">
              <Clock className="size-3" />
              <span>{timeAgo}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
