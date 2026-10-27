import React, { useState } from 'react';
import { CheckCircle2, Clock3, ListTodo, Plus, Search } from 'lucide-react';

import { ConfirmModal } from '../common/Modal';
import { taskService } from '../../services/taskService';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';

const columns = [
  { id: 'A_FAIRE', title: 'À faire', icon: ListTodo, iconClass: 'text-muted-foreground', iconBackground: 'bg-muted' },
  { id: 'EN_COURS', title: 'En cours', icon: Clock3, iconClass: 'text-orange-500', iconBackground: 'bg-orange-500/10' },
  { id: 'TERMINE', title: 'Terminé', icon: CheckCircle2, iconClass: 'text-emerald-500', iconBackground: 'bg-emerald-500/10' },
];

export function KanbanBoard({ tasks = [], projectId, members = [], currentUserId, isChefOrAdmin, onTasksChange }) {
  const [boardTasks, setBoardTasks] = useState(tasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [defaultStatusForNewTask, setDefaultStatusForNewTask] = useState('A_FAIRE');
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  React.useEffect(() => {
    setBoardTasks(tasks);
  }, [tasks]);

  const filteredTasks = boardTasks.filter((task) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query);
    const matchesAssignee = filterAssignee !== 'all' ? task.assignedToId === filterAssignee : true;
    return matchesSearch && matchesAssignee;
  });

  const handleToggleStatus = async (taskId) => {
    try {
      await taskService.toggleTaskStatus(taskId);
      onTasksChange();
    } catch (error) {
      console.error('Erreur toggle status:', error);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTask(taskId, { status: newStatus });
      onTasksChange();
    } catch (error) {
      console.error('Erreur status change:', error);
    }
  };

  const handleDragStart = (event, task) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(task.id));
    setDraggedTaskId(task.id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDrop = async (event, newStatus) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    const draggedTask = boardTasks.find((task) => String(task.id) === taskId);

    setDraggedTaskId(null);
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.status === newStatus) return;

    const previousTasks = boardTasks;
    setBoardTasks((currentTasks) => currentTasks.map((task) => String(task.id) === taskId ? { ...task, status: newStatus } : task));

    try {
      await taskService.updateTask(taskId, { status: newStatus });
      onTasksChange();
    } catch (error) {
      console.error('Erreur déplacement tâche:', error);
      setBoardTasks(previousTasks);
    }
  };

  const handleCreateInColumn = (status) => {
    setSelectedTask(null);
    setDefaultStatusForNewTask(status);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await taskService.deleteTask(taskToDelete);
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
      onTasksChange();
    } catch (error) {
      console.error('Erreur delete task:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Rechercher une tâche…" className="pl-9" />
          </div>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[210px] px-3">
              <SelectValue placeholder="Tous les assignés" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les assignés</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>{member.user?.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => handleCreateInColumn('A_FAIRE')}>
          <Plus />
          Nouvelle tâche
        </Button>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        {columns.map((column) => {
          const Icon = column.icon;
          const columnTasks = filteredTasks.filter((task) => task.status === column.id);

          return (
            <Card
              key={column.id}
              className={`h-fit bg-muted/20 shadow-none transition-[background-color,box-shadow] ${dragOverColumn === column.id ? 'bg-primary/5 ring-2 ring-primary/40' : ''}`}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragOverColumn(column.id); }}
              onDragLeave={(event) => { if (event.currentTarget === event.target) setDragOverColumn(null); }}
              onDrop={(event) => handleDrop(event, column.id)}
            >
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex size-8 items-center justify-center rounded-md ${column.iconBackground}`}>
                      <Icon className={`size-4 ${column.iconClass}`} />
                    </span>
                    <CardTitle className="text-sm">{column.title}</CardTitle>
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">{columnTasks.length}</span>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleCreateInColumn(column.id)} title={`Ajouter dans ${column.title}`} aria-label={`Ajouter dans ${column.title}`}>
                    <Plus />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {columnTasks.length === 0 ? (
                  <div className={`flex min-h-24 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm transition-colors ${dragOverColumn === column.id ? 'border-primary/60 bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}>
                    {dragOverColumn === column.id && draggedTaskId ? 'Déposer la tâche ici' : 'Aucune tâche dans cette colonne.'}
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleStatus={handleToggleStatus}
                      onStatusChange={handleStatusChange}
                      onEdit={handleEditTask}
                      onDelete={(taskId) => { setTaskToDelete(taskId); setIsDeleteModalOpen(true); }}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedTaskId === task.id}
                      currentUserId={currentUserId}
                      isChefOrAdmin={isChefOrAdmin}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projectId={projectId}
        task={selectedTask}
        members={members}
        defaultStatus={defaultStatusForNewTask}
        onTaskSaved={onTasksChange}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteTask}
        title="Supprimer la tâche"
        message="Êtes-vous certain de vouloir supprimer cette tâche ? Cette action est irréversible."
      />
    </div>
  );
}
