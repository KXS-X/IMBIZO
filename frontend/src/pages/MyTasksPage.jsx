import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, ListTodo, Search } from 'lucide-react';

import { TaskCard } from '../components/kanban/TaskCard';
import { TaskModal } from '../components/kanban/TaskModal';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../context/AuthContext';
import { taskService } from '../services/taskService';

const filters = [
  { id: 'ALL', label: 'Toutes', icon: ListTodo },
  { id: 'A_FAIRE', label: 'À faire', icon: ListTodo },
  { id: 'EN_COURS', label: 'En cours', icon: Clock3 },
  { id: 'TERMINE', label: 'Terminées', icon: CheckCircle2 },
];

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

export function MyTasksPage() {
  const { user, isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCommentsOnly, setIsCommentsOnly] = useState(false);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.getMyTasks();
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Erreur chargement de mes tâches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleToggleTask = async (taskId) => {
    try {
      await taskService.toggleTaskStatus(taskId);
      loadTasks();
    } catch (error) {
      console.error('Erreur toggle task:', error);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTask(taskId, { status: newStatus });
      loadTasks();
    } catch (error) {
      console.error('Erreur status change:', error);
    }
  };

  const counts = useMemo(() => ({
    ALL: tasks.length,
    A_FAIRE: tasks.filter((task) => task.status === 'A_FAIRE').length,
    EN_COURS: tasks.filter((task) => task.status === 'EN_COURS').length,
    TERMINE: tasks.filter((task) => task.status === 'TERMINE').length,
  }), [tasks]);

  const filteredTasks = tasks.filter((task) => {
    const query = searchQuery.toLowerCase();
    const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
    const matchesSearch = task.title.toLowerCase().includes(query)
      || task.description?.toLowerCase().includes(query)
      || task.project?.name?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Espace de travail</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Mes tâches</h1>
          <p className="mt-1 text-sm text-muted-foreground">Retrouvez ici le travail qui vous est confié sur vos projets.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="À faire" value={counts.A_FAIRE} description="Tâches qui attendent votre action" />
        <MetricCard title="En cours" value={counts.EN_COURS} description="Tâches actuellement en réalisation" />
        <MetricCard title="Terminées" value={counts.TERMINE} description="Tâches finalisées avec succès" />
      </div>

      <Card className="shadow-none">
        <CardHeader className="gap-4 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Toutes mes tâches</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Rechercher une tâche…" className="pl-9" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const Icon = filter.icon;
              const isActive = statusFilter === filter.id;
              return (
                <Button key={filter.id} type="button" size="sm" variant={isActive ? 'secondary' : 'ghost'} className={isActive ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary' : ''} onClick={() => setStatusFilter(filter.id)}>
                  <Icon />
                  {filter.label}
                  <Badge variant={isActive ? 'default' : 'secondary'} className="ml-0.5 h-5 min-w-5 justify-center px-1.5 text-[11px]">{counts[filter.id]}</Badge>
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 xl:grid-cols-3">
              {[1, 2, 3].map((item) => <Skeleton key={item} className="h-56 rounded-xl" />)}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed px-6 py-12 text-center">
              <CheckCircle2 className="mx-auto size-9 text-emerald-500" />
              <h2 className="mt-3 font-medium">Aucune tâche correspondante</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {searchQuery
                  ? 'Aucune tâche ne correspond à votre recherche.'
                  : isAdmin
                    ? 'Aucune tâche en attente.'
                    : 'Vous êtes à jour. Utilisez l’icône main dans la barre supérieure si vous souhaitez recevoir du travail.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-3">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleStatus={handleToggleTask}
                  onStatusChange={handleStatusChange}
                  onEdit={(t) => {
                    setSelectedTask(t);
                    setIsCommentsOnly(false);
                  }}
                  onOpenComments={(t) => {
                    setSelectedTask(t);
                    setIsCommentsOnly(true);
                  }}
                  currentUserId={user?.id}
                  isChefOrAdmin={isAdmin || user?.role === 'CHEF_DE_PROJET'}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTask && (
        <TaskModal
          isOpen={Boolean(selectedTask)}
          onClose={() => {
            setSelectedTask(null);
            setIsCommentsOnly(false);
          }}
          projectId={selectedTask.projectId}
          task={selectedTask}
          members={[]}
          commentsOnly={isCommentsOnly}
          onTaskSaved={loadTasks}
        />
      )}
    </div>
  );
}
