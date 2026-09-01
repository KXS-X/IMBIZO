import React, { useCallback, useEffect, useState } from 'react';
import { Activity as ActivityIcon, ArrowLeft, ChevronRight, FolderKanban, GitBranch, LayoutGrid, MessageSquare, Settings, Users, Webhook } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { MemberList } from '../components/members/MemberList';
import { ProjectChat } from '../components/chat/ProjectChat';
import { ConfirmModal } from '../components/common/Modal';
import { WebhookTester } from '../components/webhook/WebhookTester';
import { ActivityTimeline } from '../components/activity/ActivityTimeline';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { activityService } from '../services/activityService';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  DEVELOPPEUR: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
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
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kanban');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGithubRepo, setEditGithubRepo] = useState('');
  const [editWebhookSecret, setEditWebhookSecret] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadProjectData = useCallback(async () => {
    try {
      const [projRes, tasksRes, activityRes] = await Promise.all([
        projectService.getProjectById(projectId),
        taskService.getProjectTasks(projectId),
        activityService.getProjectActivities(projectId),
      ]);

      const nextProject = projRes.data.project;
      setProject(nextProject);
      setTasks(tasksRes.data.tasks);
      setActivities(activityRes.data.activities);
      setEditName(nextProject.name || '');
      setEditDescription(nextProject.description || '');
      setEditGithubRepo(nextProject.githubRepo || '');
      setEditWebhookSecret('');
    } catch (error) {
      console.error('Erreur chargement projet:', error);
      if (error.response?.status === 403 || error.response?.status === 404) navigate('/projects');
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
    setSavingSettings(true);

    try {
      await projectService.updateProject(projectId, {
        name: editName,
        description: editDescription,
        githubRepo: editGithubRepo,
        webhookSecret: editWebhookSecret,
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

  if (loading) return <ProjectDetailSkeleton />;
  if (!project) return null;

  const isChefOrAdmin = project.myRole === 'CHEF_DE_PROJET' || isAdmin;
  const tabs = [
    { id: 'kanban', label: 'Tableau Kanban', icon: LayoutGrid, count: tasks.length },
    { id: 'chat', label: 'Chat d’équipe', icon: MessageSquare },
    { id: 'members', label: 'Équipe et rôles', icon: Users, count: project.members?.length },
    { id: 'webhook', label: 'Webhook GitHub', icon: Webhook },
    { id: 'activity', label: 'Activité', icon: ActivityIcon, count: activities.length },
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
                </div>
              </div>

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

        <TabsContent value="kanban" className="mt-0">
          <KanbanBoard
            projectId={project.id}
            tasks={tasks}
            members={project.members}
            currentUserId={user?.id}
            isChefOrAdmin={isChefOrAdmin}
            onTasksChange={loadProjectData}
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
    </div>
  );
}
