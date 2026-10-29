import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Edit2,
  FolderKanban,
  Layers,
  ListTodo,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User as UserIcon
} from 'lucide-react';

import { featureService } from '../../services/featureService';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { ConfirmModal } from '../common/Modal';
import { UserAvatar } from '../common/UserAvatar';

const statusStyles = {
  A_FAIRE: 'secondary',
  EN_COURS: 'outline',
  TERMINE: 'default'
};

const statusLabels = {
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé'
};

export function ProjectFeaturesTab({
  projectId,
  features = [],
  isAdmin = false,
  onFeaturesChange,
  onOpenTaskComments
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal création / édition de fonctionnalité (Super Admin uniquement)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('A_FAIRE');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Modal suppression
  const [featureToDelete, setFeatureToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filteredFeatures = (features || []).filter((feat) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      feat.title.toLowerCase().includes(query) ||
      (feat.description && feat.description.toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'all' ? true : feat.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreateModal = () => {
    setEditingFeature(null);
    setTitle('');
    setDescription('');
    setStatus('A_FAIRE');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (feature) => {
    setEditingFeature(feature);
    setTitle(feature.title || '');
    setDescription(feature.description || '');
    setStatus(feature.status || 'A_FAIRE');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSaveFeature = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setModalError('Le titre de la fonctionnalité est requis.');
      return;
    }

    setSaving(true);
    setModalError('');
    try {
      if (editingFeature) {
        await featureService.updateFeature(editingFeature.id, {
          title: title.trim(),
          description: description.trim() || null,
          status
        });
      } else {
        await featureService.createFeature(projectId, {
          title: title.trim(),
          description: description.trim() || null,
          status
        });
      }
      setIsModalOpen(false);
      onFeaturesChange?.();
    } catch (err) {
      console.error('Erreur sauvegarde fonctionnalité:', err);
      setModalError(
        err.response?.data?.message || 'Une erreur est survenue lors de l’enregistrement.'
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteFeature = async () => {
    if (!featureToDelete) return;
    setDeleting(true);
    try {
      await featureService.deleteFeature(featureToDelete.id);
      setFeatureToDelete(null);
      onFeaturesChange?.();
    } catch (err) {
      console.error('Erreur suppression fonctionnalité:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">Fonctionnalités du projet</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              {isAdmin
                ? 'Gérez et découpez le projet en grandes fonctionnalités liées aux tâches.'
                : 'Consultez les grandes fonctionnalités du projet et leur niveau d’avancement.'}
            </CardDescription>
          </div>

          {isAdmin ? (
            <Button onClick={handleOpenCreateModal} className="gap-1.5" size="sm">
              <Plus className="size-4" />
              Ajouter une fonctionnalité
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <AlertCircle className="size-3.5 text-primary shrink-0" />
              <span>Mode consultation (Réservé au Super Admin pour l'ajout)</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barre de filtre et de recherche */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une fonctionnalité…"
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px] px-3">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="A_FAIRE">À faire</SelectItem>
                <SelectItem value="EN_COURS">En cours</SelectItem>
                <SelectItem value="TERMINE">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Liste des fonctionnalités */}
          {filteredFeatures.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              <Layers className="size-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium">Aucune fonctionnalité trouvée</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {searchQuery || statusFilter !== 'all'
                  ? 'Modifiez vos critères de recherche pour afficher des résultats.'
                  : isAdmin
                  ? 'Créez la première fonctionnalité pour organiser les tâches de votre équipe.'
                  : 'Aucune fonctionnalité n’a encore été ajoutée par le super administrateur pour ce projet.'}
              </p>
              {isAdmin && !searchQuery && statusFilter === 'all' && (
                <Button onClick={handleOpenCreateModal} variant="outline" size="sm" className="mt-4 gap-1.5">
                  <Plus className="size-3.5" />
                  Ajouter une fonctionnalité
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredFeatures.map((feat) => {
                const totalTasks = feat.tasks?.length || 0;
                const completedTasks = feat.tasks?.filter((t) => t.status === 'TERMINE').length || 0;
                const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                return (
                  <Card key={feat.id} className="flex flex-col justify-between shadow-none hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <CardTitle className="text-base font-semibold truncate" title={feat.title}>
                            {feat.title}
                          </CardTitle>
                          <Badge variant={statusStyles[feat.status] || 'outline'} className="text-[11px]">
                            {statusLabels[feat.status] || feat.status}
                          </Badge>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenEditModal(feat)}
                              title="Modifier la fonctionnalité"
                              aria-label="Modifier la fonctionnalité"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setFeatureToDelete(feat)}
                              className="text-destructive hover:text-destructive"
                              title="Supprimer la fonctionnalité"
                              aria-label="Supprimer la fonctionnalité"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {feat.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {feat.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      {/* Barre de progression des tâches liées */}
                      <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground flex items-center gap-1.5">
                            <ListTodo className="size-3.5 text-primary" />
                            Progression des tâches
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {completedTasks}/{totalTasks} ({progressPercent}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Liste miniature des tâches liées */}
                      <div className="space-y-1.5">
                        <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Tâches associées ({totalTasks})
                        </h5>
                        {totalTasks === 0 ? (
                          <p className="text-xs italic text-muted-foreground py-1">
                            Aucune tâche liée pour le moment.
                          </p>
                        ) : (
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {feat.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2.5 py-1.5 text-xs hover:bg-muted/60 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {task.status === 'TERMINE' ? (
                                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <Clock3 className="size-3.5 text-orange-500 shrink-0" />
                                  )}
                                  <span
                                    className={`truncate ${
                                      task.status === 'TERMINE'
                                        ? 'line-through text-muted-foreground'
                                        : 'font-medium text-foreground'
                                    }`}
                                  >
                                    {task.title}
                                  </span>
                                </div>

                                {task.assignedTo ? (
                                  <span className="shrink-0 text-[10px] text-muted-foreground font-medium">
                                    {task.assignedTo.name}
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-[10px] italic text-muted-foreground">
                                    Non assignée
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Création / Édition de fonctionnalité (Super Admin) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFeature ? 'Modifier la fonctionnalité' : 'Nouvelle fonctionnalité'}
            </DialogTitle>
            <DialogDescription>
              {editingFeature
                ? 'Mettez à jour les informations de cette fonctionnalité.'
                : 'Créez une fonctionnalité à laquelle vous pourrez lier des tâches.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFeature} className="space-y-4">
            {modalError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {modalError}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="feature-title">Nom de la fonctionnalité</Label>
              <Input
                id="feature-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Authentification OAuth & SSO"
                required
                autoFocus
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feature-description">Description détaillée</Label>
              <Textarea
                id="feature-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Objectifs, critères d'acceptation, spécifications fonctionnelles…"
                rows={3}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feature-status">Statut de la fonctionnalité</Label>
              <Select value={status} onValueChange={setStatus} disabled={saving}>
                <SelectTrigger id="feature-status" className="w-full px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A_FAIRE">À faire</SelectItem>
                  <SelectItem value="EN_COURS">En cours</SelectItem>
                  <SelectItem value="TERMINE">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? 'Enregistrement…'
                  : editingFeature
                  ? 'Mettre à jour'
                  : 'Créer la fonctionnalité'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Suppression */}
      <ConfirmModal
        isOpen={Boolean(featureToDelete)}
        onClose={() => setFeatureToDelete(null)}
        onConfirm={confirmDeleteFeature}
        loading={deleting}
        title="Supprimer la fonctionnalité"
        message={`Êtes-vous sûr de vouloir supprimer la fonctionnalité « ${featureToDelete?.title} » ? Les tâches associées seront conservées mais ne seront plus rattachées à cette fonctionnalité.`}
      />
    </div>
  );
}

