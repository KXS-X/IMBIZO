import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { useNotifications } from '../../context/NotificationContext';
import { AlertCircle, AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import confetti from 'canvas-confetti';

export function NoTaskSignalButton({ projectId, projectName, variant = 'primary', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={`gap-2 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <AlertTriangle className="size-4" />
        Je n’ai pas de tâche
      </Button>

      <NoTaskSignalModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultProjectId={projectId}
        defaultProjectName={projectName}
      />
    </>
  );
}

export function NoTaskSignalModal({ isOpen, onClose, defaultProjectId, defaultProjectName }) {
  const { addToast } = useNotifications();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError('');
      if (defaultProjectId) {
        setSelectedProjectId(defaultProjectId);
      } else {
        projectService.getUserProjects().then((res) => {
          const userProjects = res.data.projects;
          setProjects(userProjects);
          setSelectedProjectId(userProjects[0]?.id || '');
        });
      }
    }
  }, [isOpen, defaultProjectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    setLoading(true);
    try {
      await taskService.signalNoTask(selectedProjectId);
      setSuccess(true);

      // Animation festive confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      addToast({
        title: 'Signalement envoyé !',
        message: 'Vos chefs de projet ont été notifiés en direct de votre disponibilité.',
        type: 'NO_TASK_SIGNAL'
      });

      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (error) {
      console.error('Erreur signalNoTask:', error);
      setError(error.response?.data?.message || 'Erreur lors de l\'envoi du signalement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmer votre disponibilité</DialogTitle>
          <DialogDescription>
            Prévenez votre équipe que vous êtes disponible pour recevoir une nouvelle tâche.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
            <h4 className="mt-4 font-medium">Signalement transmis avec succès</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Les chefs de projet ont reçu une notification instantanée et reviendront vers vous rapidement.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="leading-5 text-muted-foreground">
                Vous avez finalisé votre travail ou vous êtes en attente de consignes ? Signalez votre disponibilité en un clic.
              </p>
            </div>

            {!defaultProjectId && (
              <div className="space-y-2">
                <Label htmlFor="availability-project">Projet concerné</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="availability-project" className="w-full">
                    <SelectValue placeholder="Sélectionnez un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {defaultProjectName && (
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Projet sélectionné : <span className="font-medium text-foreground">{defaultProjectName}</span>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading || !selectedProjectId}>
                <Send />
                {loading ? 'Envoi en cours…' : 'Envoyer le signalement'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
