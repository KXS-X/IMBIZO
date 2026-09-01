import React, { useEffect, useState } from 'react';

import { taskService } from '../../services/taskService';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

export function TaskModal({ isOpen, onClose, projectId, task = null, members = [], defaultStatus = 'A_FAIRE', onTaskSaved }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState('MOYENNE');
  const [assignedToId, setAssignedToId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(task);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setTitle(task?.title || '');
    setDescription(task?.description || '');
    setStatus(task?.status || defaultStatus);
    setPriority(task?.priority || 'MOYENNE');
    setAssignedToId(task?.assignedToId || '');
  }, [defaultStatus, isOpen, task]);

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
      };
      const result = isEditing
        ? await taskService.updateTask(task.id, payload)
        : await taskService.createTask(projectId, payload);
      onTaskSaved(result.data.task);
      onClose();
    } catch (submitError) {
      console.error('Erreur sauvegarde tâche:', submitError);
      setError(submitError.response?.data?.message || 'Erreur lors de l’enregistrement de la tâche.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier la tâche' : 'Créer une nouvelle tâche'}</DialogTitle>
          <DialogDescription>
            Décrivez le travail à réaliser et indiquez sa priorité pour l’équipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="task-title">Titre de la tâche</Label>
            <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. intégrer le webhook GitHub" required autoFocus />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Détails, critères d’acceptation ou notes techniques…" rows={4} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-status">Statut</Label>
              <Select value={status} onValueChange={setStatus}>
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
              <Select value={priority} onValueChange={setPriority}>
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
            <Label htmlFor="task-assignee">Assigner à un membre</Label>
            <Select value={assignedToId || 'unassigned'} onValueChange={(value) => setAssignedToId(value === 'unassigned' ? '' : value)}>
              <SelectTrigger id="task-assignee" className="w-full px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Non assignée</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>{member.user?.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Enregistrement…' : isEditing ? 'Mettre à jour' : 'Créer la tâche'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
