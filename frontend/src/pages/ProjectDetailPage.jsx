import React, { useCallback, useEffect, useState } from 'react';
import { Activity as ActivityIcon, ArrowLeft, Calendar, CheckSquare, ChevronRight, Edit2, FolderKanban, GitBranch, LayoutGrid, MessageSquare, Plus, Search, Settings, Sparkles, Trash2, Users, Webhook } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { TaskModal } from '../components/kanban/TaskModal';
import { ProjectFeaturesTab } from '../components/features/ProjectFeaturesTab';
import { UserAvatar } from '../components/common/UserAvatar';
import { MemberList } from '../components/members/MemberList';
import { ProjectChat } from '../components/chat/ProjectChat';
import { ConfirmModal } from '../components/common/Modal';
import { WebhookTester } from '../components/webhook/WebhookTester';
import { ActivityTimeline } from '../components/activity/ActivityTimeline';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { featureService } from '../services/featureService';
import { activityService } from '../services/activityService';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';

const roleLabels = {
  ADMIN: 'Super admin',
  CHEF_DE_PROJET: 'Chef de projet',
  DEVELOPPEUR: 'Développeur',
  DESIGNER: 'Designer',
  MEMBRE: 'Membre',
};

const roleStyles = {
  ADMIN: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  CHEF_DE_PROJET: 'border-primary/30 bg-primary/10 text-primary',
  DEVELOPPEUR: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  DESIGNER: 'border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300',
  MEMBRE: 'border-muted-foreground/20 bg-muted text-muted-foreground',
};

function ProjectRoleBadge({ role }) {
  return (
    <Badge variant="outline" className={roleStyles[role] || ''}>
      {roleLabels[role] || role}
    </Badge>
  );
}

function getGithubHref(repository) {
  if (/^https?:\/\//i.test(repository)) return repository;
  return `https://github.com/${repository.replace(/^\/+/, '')}`;
}

function formatProjectDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

function ProjectDetailSkeleton() {
  return (
    <div className="page-container space-y-6">
      <Skeleton className="h-5 w-48" />
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((item) => <Skeleton key={item} className="h-80 rounded-xl" />)}
      </div>
    </div>
  );
}

export function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { socket, joinProject, leaveProject } = useSocket();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [features, setFeatures] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isAdmin ? 'tasks' : 'kanban');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState(null);
  const [isCommentsOnlyModal, setIsCommentsOnlyModal] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskFilterAssignee, setTaskFilterAssignee] = useState('all');
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGithubRepo, setEditGithubRepo] = useState('');
  const [editWebhookSecret, setEditWebhookSecret] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [loadError, setLoadError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isAdmin && activeTab === 'kanban') {
      setActiveTab('tasks');
    }
  }, [isAdmin, activeTab]);

  const loadProjectData = useCallback(async () => {
    try {
      setLoadError('');
      const [projRes, tasksRes, activityRes, featuresRes] = await Promise.all([
        projectService.getProjectById(projectId),
        taskService.getProjectTasks(projectId),
        activityService.getProjectActivities(projectId),
        featureService.getProjectFeatures(projectId).catch(() => ({ data: { features: [] } })),
      ]);

      const nextProject = projRes?.data?.project || null;
      if (!nextProject) {
        throw new Error('Projet non trouvé');
      }

      setProject(nextProject);
      setTasks(Array.isArray(tasksRes?.data?.tasks) ? tasksRes.data.tasks : []);
      setFeatures(Array.isArray(featuresRes?.data?.features) ? featuresRes.data.features : []);
      setActivities(Array.isArray(activityRes?.data?.activities) ? activityRes.data.activities : []);
      setEditName(nextProject.name || '');
      setEditDescription(nextProject.description || '');
      setEditGithubRepo(nextProject.githubRepo || '');
      setEditWebhookSecret('');

      const formatDateForInput = (d) => {
        if (!d) return '';
        try {
          const dt = new Date(d);
          return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
        } catch {
          return '';
        }
      };

      setEditStartDate(formatDateForInput(nextProject.startDate));
      setEditEndDate(formatDateForInput(nextProject.endDate));
    } catch (error) {
      console.error('Erreur chargement projet:', error);
      if (error.response?.status === 403 || error.response?.status === 404) {
        navigate('/projects');
      } else {
        setLoadError(error.response?.data?.message || error.message || 'Impossible de charger ce projet.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    loadProjectData();
    joinProject(projectId);

    return () => leaveProject(projectId);
  }, [projectId, loadProjectData, joinProject, leaveProject]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleTaskChanged = () => loadProjectData();
    socket.on('task_changed', handleTaskChanged);
    return () => socket.off('task_changed', handleTaskChanged);
  }, [socket, loadProjectData]);

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    if (editStartDate && editEndDate && new Date(editStartDate) > new Date(editEndDate)) {
      alert('La date de début ne peut pas être postérieure à la date de fin.');
      return;
    }
    setSavingSettings(true);

    try {
      await projectService.updateProject(projectId, {
        name: editName,
        description: editDescription,
        githubRepo: editGithubRepo,
        webhookSecret: editWebhookSecret,
        startDate: editStartDate || null,
        endDate: editEndDate || null,
      });
      await loadProjectData();
    } catch (error) {
      console.error('Erreur enregistrement paramètres:', error);
      alert(error.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      await projectService.deleteProject(projectId);
      navigate('/projects');
    } catch (error) {
      console.error('Erreur suppression projet:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression.');
      setDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await taskService.deleteTask(taskToDelete);
      setTaskToDelete(null);
      loadProjectData();
    } catch (err) {
      console.error('Erreur suppression tâche:', err);
    }
  };

  const filteredAdminTasks = (tasks || []).filter((t) => {
    const query = taskSearchQuery.toLowerCase();
    const matchesSearch = t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query));
    const matchesAssignee =
      taskFilterAssignee === 'all'
        ? true
        : taskFilterAssignee === 'unassigned'
        ? !t.assignedToId
        : t.assignedToId === taskFilterAssignee;
    const matchesStatus = taskFilterStatus === 'all' ? true : t.status === taskFilterStatus;
    return matchesSearch && matchesAssignee && matchesStatus;
  });

  if (loading) return <ProjectDetailSkeleton />;
  if (loadError || !project) {
    return (
      <div className="page-container py-16 text-center">
        <Card className="mx-auto max-w-md p-6">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg text-destructive">Projet inaccessible</CardTitle>
            <CardDescription className="mt-2 text-sm">
              {loadError || 'Ce projet est introuvable ou vous n’avez pas les droits d’accès.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="mt-6 flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
              <ArrowLeft className="size-4" />
              Retour aux projets
            </Button>
            <Button size="sm" onClick={loadProjectData}>
              Réessayer
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const isChefOrAdmin = project.myRole === 'CHEF_DE_PROJET' || isAdmin;
  const tabs = [
    ...(isAdmin
      ? [{ id: 'tasks', label: 'Attribution des tâches', icon: CheckSquare, count: (tasks || []).length }]
      : [{ id: 'kanban', label: 'Tableau Kanban', icon: LayoutGrid, count: (tasks || []).length }]),
    { id: 'features', label: 'Fonctionnalités', icon: Sparkles, count: (features || []).length },
    { id: 'chat', label: 'Chat d’équipe', icon: MessageSquare },
    { id: 'members', label: 'Équipe et rôles', icon: Users, count: (project.members || []).length },
    { id: 'webhook', label: 'Webhook GitHub', icon: Webhook },
    { id: 'activity', label: 'Activité', icon: ActivityIcon, count: (activities || []).length },
    ...(isChefOrAdmin ? [{ id: 'settings', label: 'Paramètres', icon: Settings }] : []),
  ];

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="inline-flex items-center gap-2 transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" />
          Projets et équipes
        </Link>
        <ChevronRight className="size-4" />
        <span className="max-w-[16rem] truncate text-foreground">{project.name}</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-6">
        <Card className="overflow-visible">
          <CardHeader className="gap-5 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderKanban className="size-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="truncate text-xl">{project.name}</CardTitle>
                    {project.myRole && <ProjectRoleBadge role={project.myRole} />}
                  </div>
                  {project.githubRepo && (
                    <a
                      href={getGithubHref(project.githubRepo)}
                      target="_blank"
                      rel="noreferrer"
                      title={project.githubRepo}
                      className="flex min-w-0 max-w-full items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      <GitBranch className="size-3.5 shrink-0" />
                      <span className="truncate">{project.githubRepo}</span>
                    </a>
                  )}
                  {(project.startDate || project.endDate) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                      <Calendar className="size-3.5 text-primary shrink-0" />
                      <span>
                        {project.startDate && project.endDate
                          ? `Du ${formatProjectDate(project.startDate)} au ${formatProjectDate(project.endDate)}`
                          : project.startDate
                          ? `Début : ${formatProjectDate(project.startDate)}`
                          : `Fin : ${formatProjectDate(project.endDate)}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedTaskForModal(null);
                    setIsCommentsOnlyModal(false);
                    setIsTaskModalOpen(true);
                  }}
                  className="gap-1.5 shrink-0"
                >
                  <Plus className="size-4" />
                  Attribuer une tâche
                </Button>
              )}
            </div>

            {project.description && (
              <CardDescription className="max-w-3xl text-sm leading-6">{project.description}</CardDescription>
            )}
          </CardHeader>

        </Card>

        <div className="min-w-0 overflow-x-auto overflow-y-hidden pb-2">
          <TabsList variant="line" className="min-w-max gap-1 rounded-none bg-transparent p-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex-none gap-2 px-3 py-3">
                  <Icon className="size-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-[11px]">
                      {tab.count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {!isAdmin && (
          <TabsContent value="kanban" className="mt-0">
            <KanbanBoard
              projectId={project.id}
              tasks={tasks}
              members={project.members}
              features={features}
              currentUserId={user?.id}
              isChefOrAdmin={isChefOrAdmin}
              onTasksChange={loadProjectData}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="tasks" className="mt-0 space-y-6">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-4">
                <div>
                  <CardTitle className="text-base font-semibold">Attribution et suivi des tâches</CardTitle>
                  <CardDescription className="text-xs">
                    Attribuez des tâches aux membres de l'équipe et suivez leur statut.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setSelectedTaskForModal(null);
                    setIsCommentsOnlyModal(false);
                    setIsTaskModalOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <Plus className="size-4" />
                  Attribuer une tâche
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[220px] max-w-sm flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={taskSearchQuery}
                      onChange={(e) => setTaskSearchQuery(e.target.value)}
                      placeholder="Rechercher une tâche…"
                      className="pl-9"
                    />
                  </div>

                  <Select value={taskFilterAssignee} onValueChange={setTaskFilterAssignee}>
                    <SelectTrigger className="w-[200px] px-3">
                      <SelectValue placeholder="Tous les assignés" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les assignés</SelectItem>
                      <SelectItem value="unassigned">Non assignées</SelectItem>
                      {(project.members || []).map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.user?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={taskFilterStatus} onValueChange={setTaskFilterStatus}>
                    <SelectTrigger className="w-[160px] px-3">
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

                {filteredAdminTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                    <CheckSquare className="size-10 text-muted-foreground/40 mb-3" />
                    <p className="font-medium">Aucune tâche trouvée</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {taskSearchQuery || taskFilterAssignee !== 'all' || taskFilterStatus !== 'all'
                        ? 'Modifiez vos filtres de recherche pour afficher des tâches.'
                        : 'Créez et attribuez la première tâche pour les membres de ce projet.'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTaskForModal(null);
                        setIsCommentsOnlyModal(false);
                        setIsTaskModalOpen(true);
                      }}
                      className="mt-4 gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      Attribuer une tâche
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border rounded-lg border">
                    {filteredAdminTasks.map((t) => {
                      const commentsCount = t._count?.comments ?? t.comments?.length ?? 0;
                      return (
                        <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm text-foreground">{t.title}</span>
                              <Badge
                                variant={t.status === 'TERMINE' ? 'default' : t.status === 'EN_COURS' ? 'outline' : 'secondary'}
                                className="text-[11px]"
                              >
                                {t.status === 'TERMINE' ? 'Terminé' : t.status === 'EN_COURS' ? 'En cours' : 'À faire'}
                              </Badge>
                              {t.priority && (
                                <Badge variant="outline" className={t.priority === 'HAUTE' ? 'border-rose-500/30 bg-rose-500/10 text-rose-600' : t.priority === 'MOYENNE' ? 'border-amber-500/30 bg-amber-500/10 text-amber-600' : 'border-slate-400/30 bg-slate-500/10 text-slate-600'}>
                                  {t.priority === 'HAUTE' ? 'Haute' : t.priority === 'MOYENNE' ? 'Moyenne' : 'Basse'}
                                </Badge>
                              )}
                            </div>
                            {t.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground/70">Assigné à :</span>
                                {t.assignedTo ? (
                                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                                    <UserAvatar user={t.assignedTo} size="xs" className="size-4" />
                                    <span>{t.assignedTo.name}</span>
                                  </div>
                                ) : (
                                  <span className="italic text-amber-600 dark:text-amber-400">Non assignée</span>
                                )}
                              </div>
                              {t.createdBy && (
                                <span className="text-muted-foreground/70">
                                  Créé par {t.createdBy.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTaskForModal(t);
                                setIsCommentsOnlyModal(true);
                                setIsTaskModalOpen(true);
                              }}
                              className="gap-1 text-xs text-muted-foreground hover:text-primary"
                              title="Voir les commentaires"
                            >
                              <MessageSquare className="size-3.5" />
                              <span>{commentsCount}</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTaskForModal(t);
                                setIsCommentsOnlyModal(false);
                                setIsTaskModalOpen(true);
                              }}
                              className="gap-1.5 text-xs"
                              title="Modifier l'attribution de la tâche"
                            >
                              <Edit2 className="size-3.5" />
                              Attribuer
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setTaskToDelete(t.id)}
                              className="text-destructive hover:text-destructive"
                              title="Supprimer la tâche"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="features" className="mt-0">
          <ProjectFeaturesTab
            projectId={project.id}
            features={features}
            isAdmin={isAdmin}
            onFeaturesChange={loadProjectData}
            onOpenTaskComments={(t) => {
              setSelectedTaskForModal(t);
              setIsCommentsOnlyModal(true);
              setIsTaskModalOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="chat" className="mt-0">
          <ProjectChat projectId={project.id} projectName={project.name} />
        </TabsContent>

        <TabsContent value="members" className="mt-0">
          <MemberList
            projectId={project.id}
            members={project.members}
            isChefOrAdmin={isChefOrAdmin}
            currentUserId={user?.id}
            onMembersChanged={loadProjectData}
          />
        </TabsContent>

        <TabsContent value="webhook" className="mt-0">
          <WebhookTester project={project} />
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <ActivityTimeline activities={activities} />
        </TabsContent>

        {isChefOrAdmin && (
          <TabsContent value="settings" className="mt-0">
            <div className="space-y-8">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Paramètres du projet</CardTitle>
                  <CardDescription>Modifiez les informations utilisées par votre équipe et l’intégration GitHub.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSaveSettings}>
                  <CardContent className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="project-detail-name">Nom du projet</Label>
                      <Input id="project-detail-name" value={editName} onChange={(event) => setEditName(event.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-detail-repository">Dépôt GitHub</Label>
                      <Input id="project-detail-repository" value={editGithubRepo} onChange={(event) => setEditGithubRepo(event.target.value)} placeholder="organisation/projet" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-detail-start-date">Date de début</Label>
                      <Input
                        id="project-detail-start-date"
                        type="date"
                        value={editStartDate}
                        onChange={(event) => setEditStartDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-detail-end-date">Date de fin</Label>
                      <Input
                        id="project-detail-end-date"
                        type="date"
                        value={editEndDate}
                        min={editStartDate || undefined}
                        onChange={(event) => setEditEndDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="project-detail-description">Description</Label>
                      <Textarea id="project-detail-description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={4} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="project-detail-secret">Clé secrète du webhook GitHub</Label>
                      <Input id="project-detail-secret" value={editWebhookSecret} onChange={(event) => setEditWebhookSecret(event.target.value)} placeholder={project.hasWebhookSecret ? 'Laisser vide pour conserver la clé actuelle' : 'Votre clé secrète'} />
                    </div>
                    <div className="flex justify-end pt-2 sm:col-span-2">
                      <Button type="submit" disabled={savingSettings}>
                        {savingSettings ? 'Enregistrement…' : 'Enregistrer les modifications'}
                      </Button>
                    </div>
                  </CardContent>
                </form>
              </Card>

              <Card className="w-full border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-destructive">Zone dangereuse</CardTitle>
                  <CardDescription>La suppression du projet est définitive et efface ses tâches, membres et discussions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button type="button" variant="destructive" onClick={() => setIsDeleteModalOpen(true)}>
                    Supprimer le projet
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteProject}
        loading={deleting}
        title="Supprimer définitivement le projet"
        message={`Êtes-vous certain de vouloir supprimer le projet « ${project.name} » ? Toutes les tâches, membres et discussions associés seront définitivement effacés.`}
      />

      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTaskForModal(null);
            setIsCommentsOnlyModal(false);
          }}
          projectId={project.id}
          task={selectedTaskForModal}
          members={project.members}
          features={features}
          commentsOnly={isCommentsOnlyModal}
          onTaskSaved={loadProjectData}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={confirmDeleteTask}
        title="Supprimer la tâche"
        message="Êtes-vous certain de vouloir supprimer cette tâche ? Cette action est irréversible."
      />
    </div>
  );
}
