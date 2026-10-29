import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Layers, MessageSquare, Send, Trash2 } from 'lucide-react';

import { taskService } from '../../services/taskService';
import { featureService } from '../../services/featureService';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../common/UserAvatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

function getRelativeTime(dateString) {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
  } catch {
    return '';
  }
}

export function TaskModal({ isOpen, onClose, projectId, task = null, members = [], features = [], defaultStatus = 'A_FAIRE', onTaskSaved, commentsOnly = false }) {
  const { user, isAdmin, isChefDeProjet } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState('MOYENNE');
  const [assignedToId, setAssignedToId] = useState('');
  const [featureId, setFeatureId] = useState('');
  const [projectFeatures, setProjectFeatures] = useState(features);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // États pour les commentaires
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  const isEditing = Boolean(task);

  const isAssignedToMe = Boolean(user?.id && task?.assignedToId === user.id);
  const isCreator = Boolean(user?.id && task?.createdById === user.id);
  const isProjectChef = members.some((m) => m.userId === user?.id && m.role === 'CHEF_DE_PROJET');
  const isChefOrAdmin = isProjectChef || isAdmin || isChefDeProjet;
  const canModify = !isEditing || isChefOrAdmin || isCreator;
  const canComment = isAssignedToMe || isAdmin || isChefDeProjet || isProjectChef || isCreator;

  const loadComments = async (taskId) => {
    try {
      setCommentsLoading(true);
      const res = await taskService.getComments(taskId);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error('Erreur chargement commentaires:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setCommentError('');
    setNewComment('');
    setTitle(task?.title || '');
    setDescription(task?.description || '');
    setStatus(task?.status || defaultStatus);
    setPriority(task?.priority || 'MOYENNE');
    setAssignedToId(task?.assignedToId || '');
    setFeatureId(task?.featureId || '');

    const targetProjectId = projectId || task?.projectId;
    if (features && features.length > 0) {
      setProjectFeatures(features);
    } else if (targetProjectId) {
      featureService.getProjectFeatures(targetProjectId)
        .then((res) => setProjectFeatures(res.data?.features || []))
        .catch(() => setProjectFeatures([]));
    } else {
      setProjectFeatures([]);
    }

    if (task?.id) {
      loadComments(task.id);
    } else {
      setComments([]);
    }
  }, [defaultStatus, isOpen, task, projectId, features]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Le titre de la tâche est obligatoire.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assignedToId: assignedToId || null,
        featureId: featureId || null,
      };
      const result = isEditing
        ? await taskService.updateTask(task.id, payload)
        : await taskService.createTask(projectId, payload);
      onTaskSaved?.(result.data.task);
      onClose();
    } catch (submitError) {
      console.error('Erreur sauvegarde tâche:', submitError);
      setError(submitError.response?.data?.message || 'Erreur lors de l’enregistrement de la tâche.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!newComment.trim() || !task?.id) return;

    setSubmittingComment(true);
    setCommentError('');
    try {
      const res = await taskService.addComment(task.id, newComment.trim());
      setComments((prev) => [...prev, res.data.comment]);
      setNewComment('');
      onTaskSaved?.();
    } catch (err) {
      console.error('Erreur ajout commentaire:', err);
      setCommentError(err.response?.data?.message || 'Erreur lors de l’envoi du commentaire.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!task?.id) return;
    try {
      await taskService.deleteComment(task.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onTaskSaved?.();
    } catch (err) {
      console.error('Erreur suppression commentaire:', err);
      setCommentError(err.response?.data?.message || 'Erreur lors de la suppression du commentaire.');
    }
  };

  const renderCommentsSection = () => (
    <div className={commentsOnly ? 'space-y-4' : 'mt-6 border-t pt-5 space-y-4'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          <h4 className="text-sm font-semibold">Commentaires ({comments.length})</h4>
        </div>
        {isAssignedToMe && (
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            Vous êtes assigné à cette tâche
          </span>
        )}
      </div>

      {commentError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {commentError}
        </p>
      )}

      {/* Liste des commentaires */}
      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
        {commentsLoading ? (
          <p className="text-xs text-muted-foreground py-2">Chargement des commentaires…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-3 text-center">
            Aucun commentaire pour le moment.
          </p>
        ) : (
          comments.map((comment) => {
            const isAuthor = comment.userId === user?.id;
            const canDelete = isAuthor || isAdmin || isProjectChef;
            return (
              <div key={comment.id} className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserAvatar user={comment.user} className="size-6" />
                    <span className="font-medium text-foreground">{comment.user?.name}</span>
                    {comment.user?.id === task?.assignedToId && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[10px] text-primary font-medium">
                        Assigné
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                    <span>{getRelativeTime(comment.createdAt)}</span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1 p-0.5"
                        title="Supprimer le commentaire"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-foreground leading-relaxed whitespace-pre-line pl-8">
                  {comment.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Formulaire d'ajout de commentaire */}
      {canComment ? (
        <form onSubmit={handleAddComment} className="space-y-2 pt-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Laisser un commentaire sur cette tâche…"
            className="text-xs min-h-[64px] resize-none"
            rows={2}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={submittingComment || !newComment.trim()}
              className="gap-1.5 text-xs h-8"
            >
              <Send className="size-3.5" />
              {submittingComment ? 'Envoi…' : 'Commenter'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground bg-muted/20">
          Seul l’utilisateur assigné à cette tâche, son créateur ou le chef de projet peut y poster des commentaires.
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {commentsOnly ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" />
                Espace commentaires
              </DialogTitle>
              <DialogDescription>
                Consultez les échanges ou ajoutez un commentaire pour l’équipe.
              </DialogDescription>
            </DialogHeader>

            {/* Récapitulatif informatif de la tâche (lecture seule, aucune modification possible) */}
            <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-foreground">{task?.title}</h3>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">
                    {task?.status === 'A_FAIRE' ? 'À faire' : task?.status === 'EN_COURS' ? 'En cours' : 'Terminé'}
                  </Badge>
                  {task?.priority && (
                    <Badge variant="secondary">
                      {task.priority === 'HAUTE' ? 'Haute' : task.priority === 'MOYENNE' ? 'Moyenne' : 'Basse'}
                    </Badge>
                  )}
                </div>
              </div>
              {task?.description && (
                <p className="text-muted-foreground line-clamp-3 whitespace-pre-line">{task.description}</p>
              )}
              <div className="flex items-center gap-2 pt-1.5 text-muted-foreground border-t border-border/40">
                <span>Assigné à :</span>
                {task?.assignedTo ? (
                  <span className="font-medium text-foreground">{task.assignedTo.name}</span>
                ) : (
                  <span className="italic">Non assignée</span>
                )}
              </div>
              {task?.feature && (
                <div className="flex items-center gap-2 pt-1 text-muted-foreground">
                  <span>Fonctionnalité :</span>
                  <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary text-[10px] gap-1">
                    <Layers className="size-2.5" />
                    <span>{task.feature.title}</span>
                  </Badge>
                </div>
              )}
            </div>

            {renderCommentsSection()}

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Fermer
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Modifier la tâche' : 'Créer une nouvelle tâche'}</DialogTitle>
              <DialogDescription>
                Décrivez le travail à réaliser et indiquez sa priorité pour l’équipe.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}

              {isEditing && !canModify && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">Mode lecture seule :</span> En tant que membre, vous pouvez uniquement modifier les tâches que vous avez vous-même créées.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="task-title">Titre de la tâche</Label>
                <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. intégrer le webhook GitHub" required disabled={!canModify || loading} autoFocus={canModify} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Détails, critères d’acceptation ou notes techniques…" rows={4} disabled={!canModify || loading} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="task-status">Statut</Label>
                  <Select value={status} onValueChange={setStatus} disabled={!canModify || loading}>
                    <SelectTrigger id="task-status" className="w-full px-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A_FAIRE">À faire</SelectItem>
                      <SelectItem value="EN_COURS">En cours</SelectItem>
                      <SelectItem value="TERMINE">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Priorité</Label>
                  <Select value={priority} onValueChange={setPriority} disabled={!canModify || loading}>
                    <SelectTrigger id="task-priority" className="w-full px-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HAUTE">Haute</SelectItem>
                      <SelectItem value="MOYENNE">Moyenne</SelectItem>
                      <SelectItem value="BASSE">Basse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-assignee">Assigner à un membre</Label>
                  {!isChefOrAdmin && (
                    <span className="text-[11px] text-muted-foreground">
                      (Seul le chef de projet peut assigner à autrui)
                    </span>
                  )}
                </div>
                <Select value={assignedToId || 'unassigned'} onValueChange={(value) => setAssignedToId(value === 'unassigned' ? '' : value)} disabled={!canModify || loading}>
                  <SelectTrigger id="task-assignee" className="w-full px-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Non assignée</SelectItem>
                    {isChefOrAdmin ? (
                      members.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>{member.user?.name}</SelectItem>
                      ))
                    ) : (
                      <>
                        {user?.id && (
                          <SelectItem value={user.id}>Moi-même ({user.name})</SelectItem>
                        )}
                        {assignedToId && assignedToId !== user?.id && (
                          <SelectItem value={assignedToId} disabled>
                            {members.find((m) => m.userId === assignedToId)?.user?.name || task?.assignedTo?.name || 'Autre membre'} (actuellement assigné)
                          </SelectItem>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {!isChefOrAdmin && (
                  <p className="text-[11px] text-muted-foreground">
                    En tant que membre, vous pouvez vous assigner la tâche ou la laisser non assignée.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-feature">Fonctionnalité associée (Optionnel)</Label>
                <Select
                  value={featureId || 'unassigned'}
                  onValueChange={(value) => setFeatureId(value === 'unassigned' ? '' : value)}
                  disabled={!canModify || loading}
                >
                  <SelectTrigger id="task-feature" className="w-full px-3">
                    <SelectValue placeholder="Aucune fonctionnalité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Aucune fonctionnalité</SelectItem>
                    {projectFeatures.map((feat) => (
                      <SelectItem key={feat.id} value={feat.id}>
                        {feat.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {projectFeatures.length === 0 && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Aucune fonctionnalité créée sur ce projet. (Seul le super administrateur peut en ajouter).
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  {canModify ? 'Annuler' : 'Fermer'}
                </Button>
                {canModify && (
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Enregistrement…' : isEditing ? 'Mettre à jour' : 'Créer la tâche'}
                  </Button>
                )}
              </DialogFooter>
            </form>

            {/* Section Commentaires (visible lors de l'édition d'une tâche) */}
            {isEditing && renderCommentsSection()}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
