import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckSquare, Clock, Edit2, Layers, MessageSquare, Square, Trash2 } from 'lucide-react';

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
import { useAuth } from '../../context/AuthContext';

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

export function TaskCard({
  task,
  onToggleStatus,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenComments,
  currentUserId,
  isChefOrAdmin,
  onDragStart,
  onDragEnd,
  isDragging
}) {
  const { user } = useAuth();
  const activeUserId = currentUserId ?? user?.id;
  const isCreator = Boolean(activeUserId && task.createdById === activeUserId);
  const isAssignedToMe = Boolean(activeUserId && (task.assignedToId === activeUserId || task.assignedTo?.id === activeUserId));
  const canEdit = Boolean(isChefOrAdmin || isCreator);
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
      draggable={canEdit}
      onDragStart={(event) => {
        if (!canEdit) return;
        onDragStart?.(event, task);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        'shadow-none transition-[transform,opacity,box-shadow] hover:ring-primary/30',
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
            disabled={!canEdit}
            className={cn('mt-[-2px] shrink-0 text-muted-foreground', isDone && 'text-emerald-500', !canEdit && 'opacity-60 cursor-not-allowed')}
            onClick={() => canEdit && onToggleStatus(task.id)}
            title={!canEdit ? 'Seul le créateur ou le chef de projet peut modifier cette tâche' : isDone ? 'Marquer comme non terminée' : 'Marquer comme terminée'}
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
            {task.feature && (
              <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary text-[10px] gap-1 max-w-[150px] truncate" title={`Fonctionnalité : ${task.feature.title}`}>
                <Layers className="size-2.5 shrink-0" />
                <span className="truncate">{task.feature.title}</span>
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

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenComments) {
                  onOpenComments(task);
                } else if (onEdit) {
                  onEdit(task);
                }
              }}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              title={`${task._count?.comments || task.comments?.length || 0} commentaire(s) - Voir l'espace commentaires`}
              aria-label="Voir les commentaires"
            >
              <MessageSquare className="size-3.5" />
              <span className="text-[11px] font-medium">{task._count?.comments || task.comments?.length || 0}</span>
            </button>
            {timeAgo && (
              <div className="flex shrink-0 items-center gap-1">
                <Clock className="size-3" />
                <span>{timeAgo}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
