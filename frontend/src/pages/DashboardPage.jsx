import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckSquare, FolderKanban, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { TaskCard } from '../components/kanban/TaskCard';
import { TaskModal } from '../components/kanban/TaskModal';
import { RoleBadge } from '../components/common/Badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

function MetricCard({ title, value, description }) {
  return (
    <Card size="sm" className="shadow-none">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-normal text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-semibold leading-none tracking-tight">{value}</div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ProjectRow({ project }) {
  const progress = project.taskStats?.progressPercent || 0;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-medium text-foreground group-hover:text-primary">{project.name}</h4>
          {project.description && <p className="mt-1 truncate text-xs text-muted-foreground">{project.description}</p>}
        </div>
        {project.myRole && <RoleBadge role={project.myRole} />}
      </div>
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progression ({project.taskStats?.done || 0}/{project.taskStats?.total || 0} tâches)</span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label={`Progression de ${project.name}`}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const { user, isAdmin, canCreateProject } = useAuth();
  const [projects, setProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCommentsOnly, setIsCommentsOnly] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [projectsRes, tasksRes] = await Promise.all([
        projectService.getUserProjects(),
        taskService.getMyTasks(),
      ]);
      setProjects(projectsRes.data.projects);
      setMyTasks(tasksRes.data.tasks);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleToggleTask = async (taskId) => {
    try {
      await taskService.toggleTaskStatus(taskId);
      loadDashboardData();
    } catch (err) {
      console.error('Erreur toggle task:', err);
    }
  };

  const pendingTasks = myTasks.filter((task) => task.status !== 'TERMINE');
  const doneTasks = myTasks.filter((task) => task.status === 'TERMINE');
  const completionRate = myTasks.length > 0 ? `${Math.round((doneTasks.length / myTasks.length) * 100)}%` : '100%';

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 md:p-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Akwaba, <span className="text-primary">{user?.name}</span> <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Voici l’état d’avancement de vos projets et tâches en cours.
          </p>
        </div>
        {canCreateProject && (
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/projects">
                <Plus />
                Nouveau projet
              </Link>
            </Button>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Résumé de l’activité">
        <MetricCard title="Mes projets actifs" value={projects.length} description="Projets assignés ou créés" />
        <MetricCard title="Tâches assignées" value={pendingTasks.length} description="En attente ou en cours" />
        <MetricCard title="Tâches complétées" value={doneTasks.length} description="Finalisées avec succès" />
        <MetricCard title="Taux de réalisation" value={completionRate} description="Sur mes tâches personnelles" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Mes projets récents</CardTitle>
              <CardDescription>Les projets auxquels vous participez actuellement.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link to="/projects">
                Voir tout
                <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chargement des projets…</p>
            ) : projects.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <FolderKanban className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">Vous n’avez aucun projet pour le moment.</p>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/projects">Créer un projet</Link>
                </Button>
              </div>
            ) : (
              <div className="-mx-3 divide-y divide-border">
                {projects.slice(0, 4).map((project) => <ProjectRow key={project.id} project={project} />)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Mes tâches à traiter</CardTitle>
              <CardDescription>Les prochaines actions à faire avancer.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link to="/tasks">
                Voir tout
                <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chargement des tâches…</p>
            ) : pendingTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <CheckSquare className="mx-auto size-8 text-emerald-500" />
                <h4 className="mt-3 text-sm font-medium">Toutes vos tâches sont à jour.</h4>
                {!isAdmin && <p className="mt-1 text-sm text-muted-foreground">Utilisez l’icône main dans la barre supérieure pour signaler votre disponibilité.</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.slice(0, 4).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleStatus={handleToggleTask}
                    onEdit={(t) => {
                      setSelectedTask(t);
                      setIsCommentsOnly(false);
                    }}
                    onOpenComments={(t) => {
                      setSelectedTask(t);
                      setIsCommentsOnly(true);
                    }}
                    currentUserId={user?.id}
                    isChefOrAdmin={false}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {selectedTask && (
        <TaskModal
          isOpen={Boolean(selectedTask)}
          onClose={() => {
            setSelectedTask(null);
            setIsCommentsOnly(false);
          }}
          projectId={selectedTask.projectId}
          task={selectedTask}
          commentsOnly={isCommentsOnly}
          onTaskSaved={loadDashboardData}
        />
      )}
    </div>
  );
}
